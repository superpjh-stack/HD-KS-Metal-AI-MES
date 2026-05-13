from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.timescale import init_pool, close_pool
from routers import predict, model_status, train
from services import autoencoder_service, failure_prob_service
from training import scheduler as train_scheduler

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB 연결
    await init_pool()

    # 저장된 모델 로드 시도 (없으면 stub 모드로 운영)
    if not autoencoder_service.load_model():
        log.warning("AutoEncoder 모델 없음 — stub 모드")
    if not failure_prob_service.load_model():
        log.warning("FailureProb 모델 없음 — stub 모드 (항상 0.0 반환)")

    # 주간 재학습 스케줄러 시작
    train_scheduler.start()

    yield

    train_scheduler.stop()
    await close_pool()


app = FastAPI(
    title="광성정밀 ML Service",
    description="예측정비 AI — AutoEncoder / XGBoost / RUL",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3006"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(model_status.router)
app.include_router(train.router)


@app.get("/health")
async def health() -> dict:
    return {
        "status":       "ok",
        "service":      "ml-service",
        "modelLoaded":  autoencoder_service.is_model_loaded(),
        "threshold":    autoencoder_service.current_threshold(),
        "timestamp":    datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO)
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
