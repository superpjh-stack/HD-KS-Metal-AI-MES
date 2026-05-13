import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from config import settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.TIMESCALE_URL,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )


async def close_pool() -> None:
    if _pool:
        await _pool.close()


@asynccontextmanager
async def get_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    assert _pool is not None, "DB pool not initialized"
    async with _pool.acquire() as conn:
        yield conn


# ── 슬라이딩 윈도우 집계 쿼리 ────────────────────────────────────

_FEATURE_QUERY = """
SELECT
  AVG(avg_val) FILTER (WHERE bucket >= NOW() - INTERVAL '5 minutes')  AS mean_5m,
  STDDEV(avg_val) FILTER (WHERE bucket >= NOW() - INTERVAL '5 minutes')  AS std_5m,
  AVG(avg_val) FILTER (WHERE bucket >= NOW() - INTERVAL '60 minutes') AS mean_60m,
  STDDEV(avg_val) FILTER (WHERE bucket >= NOW() - INTERVAL '60 minutes') AS std_60m,
  MIN(min_val) FILTER (WHERE bucket >= NOW() - INTERVAL '60 minutes') AS min_60m,
  MAX(max_val) FILTER (WHERE bucket >= NOW() - INTERVAL '60 minutes') AS max_60m,
  REGR_SLOPE(avg_val, EXTRACT(EPOCH FROM bucket))
    FILTER (WHERE bucket >= NOW() - INTERVAL '30 minutes') AS trend_slope
FROM sensor_data_1min
WHERE machine_id = $1
  AND channel    = $2
  AND bucket    >= NOW() - INTERVAL '60 minutes'
"""

async def fetch_channel_features(machine_code: str, channel: str) -> dict | None:
    async with get_conn() as conn:
        row = await conn.fetchrow(_FEATURE_QUERY, machine_code, channel)
    if row is None or row["mean_60m"] is None:
        return None
    return dict(row)


# ── 학습용: 정상 구간 데이터 조회 (AlarmEvent 없는 구간) ──────────

_NORMAL_DATA_QUERY = """
SELECT
  bucket,
  machine_id,
  channel,
  avg_val,
  max_val - min_val AS range_val
FROM sensor_data_1min s
WHERE s.bucket >= NOW() - INTERVAL '{days} days'
  AND NOT EXISTS (
    SELECT 1
    FROM alarm_events ae
    WHERE ae.machine_id = s.machine_id
      AND ae.occurred_at
          BETWEEN s.bucket - INTERVAL '5 minutes'
              AND s.bucket + INTERVAL '5 minutes'
  )
ORDER BY machine_id, channel, bucket
"""

async def fetch_normal_training_data(days: int = 30) -> list[dict]:
    query = _NORMAL_DATA_QUERY.format(days=days)
    async with get_conn() as conn:
        rows = await conn.fetch(query)
    return [dict(r) for r in rows]


# ── 최근 N분 버킷 시계열 (AutoEncoder 시퀀스 입력) ───────────────

_SEQUENCE_QUERY = """
SELECT bucket, avg_val
FROM sensor_data_1min
WHERE machine_id = $1
  AND channel    = $2
  AND bucket    >= NOW() - INTERVAL '{minutes} minutes'
ORDER BY bucket ASC
"""

async def fetch_sequence(machine_code: str, channel: str, minutes: int = 60) -> list[float]:
    query = _SEQUENCE_QUERY.format(minutes=minutes)
    async with get_conn() as conn:
        rows = await conn.fetch(query, machine_code, channel)
    return [float(r["avg_val"]) for r in rows]
