"""
AutoEncoder 추론 서비스.
모델 파일 로드 → 시퀀스 정규화 → Reconstruction Error → 이상 판정.
"""
import json
import logging
from pathlib import Path

import numpy as np
import torch

from config import settings
from models.autoencoder import LSTMAutoEncoder

log = logging.getLogger(__name__)

_model:     LSTMAutoEncoder | None = None
_threshold: float                   = settings.AE_THRESHOLD
_device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _meta_path(version: str) -> Path:
    return Path(settings.MODEL_DIR) / f"autoencoder_v{version}.meta.json"


def _pt_path(version: str) -> Path:
    return Path(settings.MODEL_DIR) / f"autoencoder_v{version}.pt"


def load_model(version: str | None = None) -> bool:
    """
    최신 버전(또는 지정 버전) 모델을 로드한다.
    성공 시 True, 모델 파일 없으면 False.
    """
    global _model, _threshold

    if version is None:
        latest_path = Path(settings.MODEL_DIR) / "latest.json"
        if not latest_path.exists():
            log.warning("latest.json 없음 — 모델 미로드 상태로 유지")
            return False
        latest  = json.loads(latest_path.read_text())
        version = latest.get("autoencoder")
        if not version:
            return False

    pt   = _pt_path(version)
    meta = _meta_path(version)

    if not pt.exists():
        log.warning("모델 파일 없음: %s", pt)
        return False

    model = LSTMAutoEncoder(
        input_dim  =1,
        hidden_dim =settings.AE_HIDDEN_DIM,
        latent_dim =settings.AE_LATENT_DIM,
        num_layers =settings.AE_NUM_LAYERS,
    )
    state = torch.load(str(pt), map_location=_device, weights_only=True)
    model.load_state_dict(state)
    model.to(_device)
    model.eval()

    _model = model

    if meta.exists():
        m          = json.loads(meta.read_text())
        _threshold = float(m.get("threshold", settings.AE_THRESHOLD))

    log.info("AutoEncoder v%s 로드 완료 — threshold=%.5f", version, _threshold)
    return True


def predict(sequence: np.ndarray) -> tuple[float, bool]:
    """
    sequence: (seq_len, 1) float32 array
    반환: (reconstruction_error, is_anomaly)
    모델 미로드 상태면 (0.0, False) 반환.
    """
    if _model is None:
        return 0.0, False

    # 정규화
    mu  = float(sequence.mean())
    std = float(sequence.std()) or 1.0
    norm = (sequence - mu) / std

    x = torch.tensor(norm, dtype=torch.float32).unsqueeze(0).to(_device)  # (1, T, 1)

    with torch.no_grad():
        err = float(_model.reconstruction_error(x).item())

    return err, err > _threshold


def is_model_loaded() -> bool:
    return _model is not None


def current_threshold() -> float:
    return _threshold
