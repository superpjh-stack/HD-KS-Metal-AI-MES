"""
내부 학습 트리거 API — X-Api-Key 헤더 필요.
외부 노출 없음 (Docker 내부 네트워크 전용).
"""
import logging
from fastapi import APIRouter, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

from config import settings

log    = logging.getLogger(__name__)
router = APIRouter(prefix="/train", tags=["train"])

_api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=True)


def _verify_key(key: str = Security(_api_key_header)) -> None:
    if key != settings.ML_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")


@router.post("/autoencoder")
async def trigger_train_autoencoder(
    _: None = Security(_verify_key),  # type: ignore[assignment]
) -> dict:
    from training.train_autoencoder import run_training
    from services import autoencoder_service

    log.info("POST /train/autoencoder 수신")
    try:
        version = await run_training()
        autoencoder_service.load_model(version)
        return {"ok": True, "version": version, "modelType": "AUTOENCODER"}
    except Exception as exc:
        log.exception("학습 실패")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# Phase 3-C에서 추가될 엔드포인트 (stub)

@router.post("/failure-prob")
async def trigger_train_failure_prob(
    _: None = Security(_verify_key),  # type: ignore[assignment]
) -> dict:
    from training.train_failure_prob import run_training
    from services import failure_prob_service
    try:
        version = await run_training()
        failure_prob_service.load_model(version)
        return {"ok": True, "version": version, "modelType": "FAILURE_PROB"}
    except Exception as exc:
        log.exception("FailureProb 학습 실패")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/rul")
async def trigger_train_rul(
    _: None = Security(_verify_key),  # type: ignore[assignment]
) -> dict:
    raise HTTPException(status_code=501, detail="Phase 3-C에서 구현 예정")
