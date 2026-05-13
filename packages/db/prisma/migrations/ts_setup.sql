-- TimescaleDB 확장 활성화
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ─────────────────────────────────────────
-- sensor_data hypertable
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_data (
  time        TIMESTAMPTZ      NOT NULL,
  machine_id  UUID             NOT NULL,
  channel     VARCHAR(30)      NOT NULL,
  value       DOUBLE PRECISION NOT NULL,
  quality     SMALLINT         NOT NULL DEFAULT 192
);

SELECT create_hypertable(
  'sensor_data', 'time',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS idx_sensor_data_machine_time
  ON sensor_data(machine_id, time DESC);

-- 7일 후 자동 압축
ALTER TABLE sensor_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'machine_id,channel',
  timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('sensor_data', INTERVAL '7 days', if_not_exists => TRUE);

-- 90일 후 원시 데이터 삭제 (집계 테이블에 보존)
SELECT add_retention_policy('sensor_data', INTERVAL '90 days', if_not_exists => TRUE);

-- ─────────────────────────────────────────
-- 1분 집계 (대시보드 실시간 차트)
-- ─────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_data_1min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time) AS bucket,
  machine_id,
  channel,
  AVG(value)  AS avg_val,
  MAX(value)  AS max_val,
  MIN(value)  AS min_val,
  COUNT(*)    AS sample_count
FROM sensor_data
GROUP BY bucket, machine_id, channel
WITH NO DATA;

SELECT add_continuous_aggregate_policy('sensor_data_1min',
  start_offset  => INTERVAL '10 minutes',
  end_offset    => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists => TRUE
);

-- ─────────────────────────────────────────
-- 1시간 집계 (트렌드 분석)
-- ─────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_data_1hour
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  machine_id,
  channel,
  AVG(value)    AS avg_val,
  STDDEV(value) AS std_val,
  MAX(value)    AS max_val,
  MIN(value)    AS min_val
FROM sensor_data
GROUP BY bucket, machine_id, channel
WITH NO DATA;

SELECT add_continuous_aggregate_policy('sensor_data_1hour',
  start_offset  => INTERVAL '2 hours',
  end_offset    => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- ─────────────────────────────────────────
-- INSERT-ONLY 보안 정책 (감사 로그 / LOT 이벤트)
-- ─────────────────────────────────────────
-- Prisma migrate 완료 후 실행 (mes_app_user 생성 후)
-- mes_app_user가 없으면 아래 구문은 무시됨 (DO 블록으로 안전하게 처리)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mes_app_user') THEN
    REVOKE UPDATE, DELETE ON audit_logs FROM mes_app_user;
    REVOKE UPDATE, DELETE ON lot_events FROM mes_app_user;
    GRANT INSERT, SELECT ON audit_logs TO mes_app_user;
    GRANT INSERT, SELECT ON lot_events TO mes_app_user;
  END IF;
END
$$;
