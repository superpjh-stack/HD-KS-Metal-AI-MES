"""
추론 엔드포인트 — Phase 3-B/C 실제 모델 연결 완료.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from models.schemas import (
    AnomalyRequest,     AnomalyResponse,
    FailureProbRequest, FailureProbResponse, ChannelFailureProb,
    RulRequest,         RulResponse,
)
from services import autoencoder_service, failure_prob_service
from services.rul_service import predict_rul
from services.feature_service import (
    build_sequence_tensor,
    get_channel_features,
    DEFAULT_CHANNELS,
)

router = APIRouter(prefix="/predict", tags=["predict"])


# ── PDM-03: AutoEncoder 이상감지 ──────────────────────────────────

@router.post("/anomaly", response_model=AnomalyResponse)
async def predict_anomaly(req: AnomalyRequest) -> AnomalyResponse:
    seq = await build_sequence_tensor(req.machineId, req.channel)
    if seq is None:
        raise HTTPException(
            status_code=422,
            detail=f"센서 데이터 부족 — machineId={req.machineId} channel={req.channel}",
        )

    score, is_anomaly = autoencoder_service.predict(seq)
    return AnomalyResponse(
        machineId   =req.machineId,
        channel     =req.channel,
        score       =score,
        isAnomaly   =is_anomaly,
        threshold   =autoencoder_service.current_threshold(),
        predictedAt =datetime.now(timezone.utc),
    )


# ── PDM-04: XGBoost 고장 확률 ────────────────────────────────────

@router.post("/failure", response_model=FailureProbResponse)
async def predict_failure(req: FailureProbRequest) -> FailureProbResponse:
    channels_result: list[ChannelFailureProb] = []

    for ch in DEFAULT_CHANNELS:
        feat = await get_channel_features(req.machineId, ch)
        if feat is None:
            channels_result.append(ChannelFailureProb(channel=ch, failureProbability=0.0))
            continue

        import numpy as np
        vec = np.array([
            feat.mean_5m    or 0.0,
            feat.std_5m     or 0.0,
            feat.min_60m    or 0.0,
            feat.max_60m    or 0.0,
            (feat.max_60m or 0.0) - (feat.min_60m or 0.0),
            0.0,  # recent_critical_count — Phase 3-D에서 DB 조회로 교체
        ], dtype=np.float32)

        prob = failure_prob_service.predict(vec)
        channels_result.append(ChannelFailureProb(channel=ch, failureProbability=prob))

    if not channels_result:
        raise HTTPException(status_code=422, detail=f"센서 데이터 없음 — machineId={req.machineId}")

    return FailureProbResponse(
        machineId   =req.machineId,
        channels    =channels_result,
        predictedAt =datetime.now(timezone.utc),
    )


# ── PDM-05: RUL 예측 ─────────────────────────────────────────────

@router.post("/rul", response_model=RulResponse)
async def predict_rul_endpoint(req: RulRequest) -> RulResponse:
    feat = await get_channel_features(req.machineId, req.channel)
    if feat is None:
        raise HTTPException(
            status_code=422,
            detail=f"센서 데이터 없음 — machineId={req.machineId} channel={req.channel}",
        )

    rul_hours, confidence, trend = predict_rul(
        mean_val    =feat.mean_60m or 0.0,
        trend_slope =feat.trend_slope,
        channel     =req.channel,
        usl         =None,  # Phase 3-D에서 SpcParameter.usl 연동
    )

    return RulResponse(
        machineId   =req.machineId,
        channel     =req.channel,
        rulHours    =rul_hours,
        confidence  =confidence,
        trend       =trend,
        predictedAt =datetime.now(timezone.utc),
    )
