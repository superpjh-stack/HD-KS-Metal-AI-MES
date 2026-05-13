"""
특징 엔지니어링 서비스.
TimescaleDB sensor_data_1min에서 슬라이딩 윈도우 집계를 실행하고
float32 특징 벡터를 반환한다.
"""
import numpy as np
from db.timescale import fetch_channel_features, fetch_sequence
from models.schemas import ChannelFeatures

FEATURE_DIM = 7  # mean_5m, std_5m, mean_60m, std_60m, min_60m, max_60m, trend_slope

# 지원 채널 목록 (ml-service 관점)
DEFAULT_CHANNELS = [
    "vibration_x",
    "vibration_y",
    "temperature",
    "power_kw",
    "current",
]


async def get_channel_features(machine_code: str, channel: str) -> ChannelFeatures | None:
    row = await fetch_channel_features(machine_code, channel)
    if row is None:
        return None
    return ChannelFeatures(
        channel     =channel,
        mean_5m     =row.get("mean_5m"),
        std_5m      =row.get("std_5m"),
        mean_60m    =row.get("mean_60m"),
        std_60m     =row.get("std_60m"),
        min_60m     =row.get("min_60m"),
        max_60m     =row.get("max_60m"),
        trend_slope =row.get("trend_slope"),
    )


async def build_feature_vector(
    machine_code: str,
    channels: list[str] | None = None,
) -> np.ndarray | None:
    """
    여러 채널의 특징을 결합한 1D 벡터 반환.
    shape: (len(channels) * FEATURE_DIM,)
    데이터 없는 채널은 0으로 채움.
    """
    channels = channels or DEFAULT_CHANNELS
    parts: list[list[float]] = []
    has_any = False

    for ch in channels:
        feat = await get_channel_features(machine_code, ch)
        if feat is not None:
            parts.append(feat.to_vector())
            has_any = True
        else:
            parts.append([0.0] * FEATURE_DIM)

    if not has_any:
        return None

    return np.array(parts, dtype=np.float32).flatten()  # shape: (n_ch * 7,)


async def build_sequence_tensor(
    machine_code: str,
    channel: str,
    seq_len: int = 60,
) -> np.ndarray | None:
    """
    LSTM-AutoEncoder 입력용 시계열 시퀀스.
    shape: (seq_len, 1)  — 단일 채널 avg_val
    시퀀스가 seq_len보다 짧으면 앞을 0으로 패딩.
    데이터가 전혀 없으면 None 반환.
    """
    values = await fetch_sequence(machine_code, channel, minutes=seq_len)
    if not values:
        return None

    arr = np.array(values, dtype=np.float32)
    if len(arr) < seq_len:
        pad = np.zeros(seq_len - len(arr), dtype=np.float32)
        arr = np.concatenate([pad, arr])
    else:
        arr = arr[-seq_len:]

    return arr.reshape(seq_len, 1)  # (seq_len, 1)


def generate_mock_normal_data(
    n_samples: int = 200,
    seq_len: int = 60,
    n_features: int = 1,
    seed: int = 42,
) -> np.ndarray:
    """단위 테스트 / 초기 학습용 정상 데이터 시뮬레이션."""
    rng = np.random.default_rng(seed)
    # 정상: 평균 0, 표준편차 1의 Gaussian
    return rng.normal(loc=0.0, scale=1.0, size=(n_samples, seq_len, n_features)).astype(np.float32)
