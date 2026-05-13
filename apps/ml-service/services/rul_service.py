"""
잔여수명(RUL) 예측 서비스 (PDM-05).
Phase 3 초기: 선형 열화 추세 기반.
  - trend_slope (per second, from REGR_SLOPE) → per_hour
  - 안전 임계값: SpcParameter.usl 또는 설정값
  - RUL = (safe_threshold - current_mean) / |slope_per_hour|
"""
import logging

import numpy as np

from config import settings

log = logging.getLogger(__name__)

# 채널별 기본 안전 임계값 (SpcParameter.usl 미설정 시 사용)
DEFAULT_SAFE_THRESHOLD: dict[str, float] = {
    "vibration_x": 15.0,   # m/s²
    "vibration_y": 15.0,
    "temperature":  90.0,  # °C
    "power_kw":    120.0,  # kW
    "current":     200.0,  # A
    "pressure":     10.0,  # bar
}

SECONDS_PER_HOUR = 3600.0


def predict_rul(
    mean_val:    float,
    trend_slope: float | None,  # REGR_SLOPE(avg_val, EPOCH) — per second
    channel:     str,
    usl:         float | None = None,
) -> tuple[float | None, float, str]:
    """
    반환: (rul_hours | None, confidence 0~1, trend str)
    """
    safe = usl or DEFAULT_SAFE_THRESHOLD.get(channel)

    if safe is None:
        log.debug("채널 '%s' 안전 임계값 없음 — RUL 계산 불가", channel)
        return None, 0.0, "stable"

    if trend_slope is None or trend_slope == 0.0:
        return None, 0.2, "stable"

    slope_per_hour = trend_slope * SECONDS_PER_HOUR

    # 열화 방향: 값이 증가하며 임계값에 접근하는 경우만 의미 있음
    if slope_per_hour <= 0:
        # 개선 중
        return None, 0.5, "improving"

    margin = safe - mean_val
    if margin <= 0:
        # 이미 임계값 초과
        return 0.0, 0.9, "degrading"

    rul_hours = margin / slope_per_hour
    # 신뢰도: RUL이 짧을수록 trend가 강할수록 신뢰도 높음
    confidence = min(0.9, abs(slope_per_hour) / (safe * 0.01 + 1e-6))
    confidence = round(min(confidence, 0.9), 3)

    trend = "degrading" if rul_hours < settings.RUL_WARNING_HOURS else "stable"

    return round(rul_hours, 1), confidence, trend
