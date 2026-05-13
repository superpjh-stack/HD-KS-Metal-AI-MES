"""
APScheduler — 주 1회 자동 재학습.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

log = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _retrain_autoencoder() -> None:
    from training.train_autoencoder import run_training
    from services import autoencoder_service
    try:
        log.info("AutoEncoder 주간 재학습 시작")
        version = await run_training()
        autoencoder_service.load_model(version)
        log.info("AutoEncoder 재학습 완료 — v%s", version)
    except Exception:
        log.exception("AutoEncoder 재학습 실패")


async def _retrain_failure_prob() -> None:
    from training.train_failure_prob import run_training
    from services import failure_prob_service
    try:
        log.info("FailureProb 주간 재학습 시작")
        version = await run_training()
        failure_prob_service.load_model(version)
        log.info("FailureProb 재학습 완료 — v%s", version)
    except Exception:
        log.exception("FailureProb 재학습 실패")


def start() -> None:
    global _scheduler
    _scheduler = AsyncIOScheduler(timezone="Asia/Seoul")

    _scheduler.add_job(
        _retrain_autoencoder,
        CronTrigger(day_of_week="sun", hour=2, minute=0),
        id="retrain_autoencoder",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    _scheduler.add_job(
        _retrain_failure_prob,
        CronTrigger(day_of_week="sun", hour=3, minute=0),
        id="retrain_failure_prob",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    # RUL은 선형 회귀 기반이므로 별도 재학습 불필요

    _scheduler.start()
    log.info("학습 스케줄러 시작 완료")


def stop() -> None:
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        log.info("학습 스케줄러 종료")
