"""
LSTM-AutoEncoder 학습 스크립트.
정상 구간 sensor_data_1min을 조회해 모델을 학습하고 /models/ 에 저장한다.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from config import settings
from db.timescale import fetch_normal_training_data, init_pool, close_pool
from models.autoencoder import LSTMAutoEncoder
from services.feature_service import generate_mock_normal_data

log = logging.getLogger(__name__)

SEQ_LEN      = settings.AE_SEQ_LEN
HIDDEN_DIM   = settings.AE_HIDDEN_DIM
LATENT_DIM   = settings.AE_LATENT_DIM
NUM_LAYERS   = settings.AE_NUM_LAYERS
BATCH_SIZE   = 64
EPOCHS       = 30
LR           = 1e-3
MIN_SAMPLES  = 200   # 최소 샘플 수 미달 시 mock 데이터 사용


def _build_sequences(values: list[float], seq_len: int) -> np.ndarray:
    """슬라이딩 윈도우로 (N, seq_len, 1) 텐서 생성."""
    arr = np.array(values, dtype=np.float32)
    if len(arr) < seq_len:
        return np.empty((0, seq_len, 1), dtype=np.float32)

    seqs = []
    for i in range(len(arr) - seq_len + 1):
        seqs.append(arr[i : i + seq_len])
    return np.stack(seqs, axis=0).reshape(-1, seq_len, 1)


def _normalize(X: np.ndarray) -> tuple[np.ndarray, float, float]:
    mu  = float(X.mean())
    std = float(X.std()) or 1.0
    return (X - mu) / std, mu, std


async def _load_training_data(days: int = 30) -> np.ndarray:
    rows = await fetch_normal_training_data(days)
    log.info("정상 학습 데이터 %d 행 조회", len(rows))

    if not rows:
        log.warning("학습 데이터 없음 — mock 데이터 사용")
        return generate_mock_normal_data(n_samples=400, seq_len=SEQ_LEN)

    # 채널별 시계열 → 슬라이딩 윈도우 시퀀스
    from collections import defaultdict
    grouped: dict[tuple, list] = defaultdict(list)
    for r in rows:
        grouped[(r["machine_id"], r["channel"])].append(float(r["avg_val"]))

    all_seqs: list[np.ndarray] = []
    for (machine_id, channel), vals in grouped.items():
        seqs = _build_sequences(vals, SEQ_LEN)
        if len(seqs) > 0:
            all_seqs.append(seqs)

    if not all_seqs:
        log.warning("슬라이딩 윈도우 후 시퀀스 없음 — mock 데이터 사용")
        return generate_mock_normal_data(n_samples=400, seq_len=SEQ_LEN)

    X = np.concatenate(all_seqs, axis=0)
    log.info("학습 시퀀스 %d 개 준비 완료", len(X))
    return X


def train(X: np.ndarray) -> tuple[LSTMAutoEncoder, float]:
    """모델 학습 → (모델, threshold) 반환."""
    X_norm, mu, std = _normalize(X)
    tensor = torch.tensor(X_norm, dtype=torch.float32)
    dataset = TensorDataset(tensor)
    loader  = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model  = LSTMAutoEncoder(
        input_dim  =1,
        hidden_dim =HIDDEN_DIM,
        latent_dim =LATENT_DIM,
        num_layers =NUM_LAYERS,
    ).to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.MSELoss()

    model.train()
    for epoch in range(EPOCHS):
        total_loss = 0.0
        for (batch,) in loader:
            batch = batch.to(device)
            optimizer.zero_grad()
            recon = model(batch)
            loss  = criterion(recon, batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(batch)
        avg = total_loss / len(X)
        if (epoch + 1) % 10 == 0:
            log.info("Epoch %d/%d — loss: %.6f", epoch + 1, EPOCHS, avg)

    # threshold = mean + 3σ of training reconstruction errors
    model.eval()
    errors: list[float] = []
    with torch.no_grad():
        for (batch,) in DataLoader(dataset, batch_size=256):
            batch = batch.to(device)
            err   = model.reconstruction_error(batch)
            errors.extend(err.cpu().tolist())

    err_arr   = np.array(errors)
    threshold = float(err_arr.mean() + 3 * err_arr.std())
    log.info("Reconstruction Error — mean=%.5f std=%.5f → threshold=%.5f",
             err_arr.mean(), err_arr.std(), threshold)

    return model, threshold


async def run_training(version: int | None = None) -> str:
    """학습 실행 + 모델/메타 저장 → 저장된 버전 문자열 반환."""
    await init_pool()
    try:
        X = await _load_training_data(days=30)
    finally:
        await close_pool()

    model, threshold = train(X)

    # 버전 결정
    model_dir = Path(settings.MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)

    if version is None:
        existing = list(model_dir.glob("autoencoder_v*.pt"))
        version  = len(existing) + 1

    ver_str   = str(version)
    pt_path   = model_dir / f"autoencoder_v{ver_str}.pt"
    meta_path = model_dir / f"autoencoder_v{ver_str}.meta.json"

    torch.save(model.state_dict(), pt_path)

    meta = {
        "threshold":    threshold,
        "trainSamples": len(X),
        "trainedAt":    datetime.now(timezone.utc).isoformat(),
        "filePath":     str(pt_path),
        "hiddenDim":    HIDDEN_DIM,
        "latentDim":    LATENT_DIM,
        "seqLen":       SEQ_LEN,
    }
    meta_path.write_text(json.dumps(meta, indent=2))

    # latest.json 갱신
    latest_path = model_dir / "latest.json"
    latest = json.loads(latest_path.read_text()) if latest_path.exists() else {}
    latest["autoencoder"] = ver_str
    latest_path.write_text(json.dumps(latest, indent=2))

    log.info("AutoEncoder v%s 저장 완료 — threshold=%.5f", ver_str, threshold)
    return ver_str


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_training())
