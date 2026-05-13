"""
XGBoost 고장 확률 모델 학습 (PDM-04).
레이블: 향후 24시간 내 CRITICAL AlarmEvent 발생 여부 (binary).
특징: 채널별 통계 (7개 × n_channels) + 최근 24h CRITICAL 알람 수.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import xgboost as xgb
import pickle
import asyncpg

from config import settings

log = logging.getLogger(__name__)

HORIZON_HOURS = 24
MIN_SAMPLES   = 50


# ── 데이터 조회 ────────────────────────────────────────────────────

_FEATURE_QUERY = """
WITH window_stats AS (
  SELECT
    machine_id,
    channel,
    DATE_TRUNC('hour', bucket) AS hour_bucket,
    AVG(avg_val)              AS mean_val,
    STDDEV(avg_val)           AS std_val,
    MIN(min_val)              AS min_val,
    MAX(max_val)              AS max_val,
    MAX(max_val) - MIN(min_val) AS range_val
  FROM sensor_data_1min
  WHERE bucket >= NOW() - INTERVAL '60 days'
  GROUP BY machine_id, channel, DATE_TRUNC('hour', bucket)
)
SELECT
  ws.machine_id,
  ws.hour_bucket,
  ws.channel,
  ws.mean_val,
  ws.std_val,
  ws.min_val,
  ws.max_val,
  ws.range_val,
  COALESCE((
    SELECT COUNT(*)
    FROM alarm_events ae
    WHERE ae.machine_id = ws.machine_id
      AND ae.severity   = 'CRITICAL'
      AND ae.occurred_at BETWEEN ws.hour_bucket - INTERVAL '24 hours'
                              AND ws.hour_bucket
  ), 0) AS recent_critical_count
FROM window_stats ws
ORDER BY ws.machine_id, ws.hour_bucket
"""

_LABEL_QUERY = """
SELECT DISTINCT machine_id, DATE_TRUNC('hour', occurred_at) AS alarm_hour
FROM alarm_events
WHERE severity   = 'CRITICAL'
  AND occurred_at >= NOW() - INTERVAL '60 days'
"""


async def _fetch_data() -> tuple[np.ndarray, np.ndarray]:
    pool = await asyncpg.create_pool(dsn=settings.TIMESCALE_URL, min_size=1, max_size=3)
    try:
        rows   = await pool.fetch(_FEATURE_QUERY)
        labels = await pool.fetch(_LABEL_QUERY)
    finally:
        await pool.close()

    # 레이블 집합: (machine_id, hour_bucket)
    alarm_set: set[tuple] = {
        (r["machine_id"], r["alarm_hour"] + __import__("datetime").timedelta(hours=HORIZON_HOURS))
        for r in labels
    }

    X_list, y_list = [], []
    for r in rows:
        feat = [
            float(r["mean_val"]          or 0.0),
            float(r["std_val"]           or 0.0),
            float(r["min_val"]           or 0.0),
            float(r["max_val"]           or 0.0),
            float(r["range_val"]         or 0.0),
            float(r["recent_critical_count"] or 0),
        ]
        label = 1 if (r["machine_id"], r["hour_bucket"]) in alarm_set else 0
        X_list.append(feat)
        y_list.append(label)

    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.int32)


def _mock_data(n: int = 300) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(42)
    X = rng.standard_normal((n, 6)).astype(np.float32)
    y = (rng.random(n) < 0.15).astype(np.int32)  # 15% 고장 발생
    return X, y


async def run_training(version: int | None = None) -> str:
    try:
        X, y = await _fetch_data()
        if len(X) < MIN_SAMPLES:
            log.warning("학습 데이터 부족(%d) — mock 데이터 사용", len(X))
            X, y = _mock_data()
    except Exception:
        log.exception("DB 조회 실패 — mock 데이터 사용")
        X, y = _mock_data()

    pos = int(y.sum())
    neg = len(y) - pos
    scale_pos = neg / pos if pos > 0 else 1.0
    log.info("학습 샘플: %d (양성 %d, 음성 %d) scale_pos_weight=%.2f", len(X), pos, neg, scale_pos)

    model = xgb.XGBClassifier(
        n_estimators      =100,
        max_depth         =4,
        learning_rate     =0.1,
        scale_pos_weight  =scale_pos,
        eval_metric       ="logloss",
        use_label_encoder =False,
        random_state      =42,
    )
    model.fit(X, y)

    model_dir = Path(settings.MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)

    if version is None:
        existing = list(model_dir.glob("failure-prob_v*.pkl"))
        version  = len(existing) + 1

    ver_str   = str(version)
    pkl_path  = model_dir / f"failure-prob_v{ver_str}.pkl"
    meta_path = model_dir / f"failure-prob_v{ver_str}.meta.json"

    with open(pkl_path, "wb") as f:
        pickle.dump(model, f)

    meta = {
        "trainSamples": len(X),
        "positiveRate": float(pos / len(y)) if len(y) > 0 else 0.0,
        "trainedAt":    datetime.now(timezone.utc).isoformat(),
        "filePath":     str(pkl_path),
    }
    meta_path.write_text(json.dumps(meta, indent=2))

    latest_path = model_dir / "latest.json"
    latest = json.loads(latest_path.read_text()) if latest_path.exists() else {}
    latest["failure_prob"] = ver_str
    latest_path.write_text(json.dumps(latest, indent=2))

    log.info("FailureProb v%s 저장 완료", ver_str)
    return ver_str


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_training())
