# ai-mes-foundation Design Document

> **Summary**: 광성정밀 AI-MES의 기반 인프라, 공통 도메인 모델, IoT 파이프라인, 인증체계 상세 설계
>
> **Project**: 광성정밀 AI-MES
> **Version**: 0.1
> **Author**: SysArch + PM-Core
> **Date**: 2026-05-11
> **Status**: Draft
> **Planning Doc**: [ai-mes-foundation.plan.md](../01-plan/features/ai-mes-foundation.plan.md)

---

## 1. 개요 (Overview)

### 1.1 설계 목표

| # | 목표 | 측정 기준 |
|---|------|-----------|
| 1 | LOT 추적 전 이력 조회 < 3초 | API 응답시간 |
| 2 | IoT 데이터 수집 지연 < 10초 (PLC → 대시보드) | End-to-End latency |
| 3 | 오프라인 내성: 네트워크 단절 30분 후 재연결 시 데이터 무손실 | Edge 버퍼 검증 |
| 4 | 감사 로그 불변성: 쓰기 전용(append-only), 삭제 불가 | DB 정책 + 감사 |
| 5 | 역할 기반 접근제어 (RBAC): 5개 기본 역할 정의 | 테스트 커버리지 |
| 6 | 로컬 환경 1분 내 구동 (`docker compose up`) | 시간 측정 |

### 1.2 설계 원칙

- **Domain-First**: 비즈니스 도메인(LOT, Machine, WorkOrder)이 기술 선택보다 우선
- **Immutable Audit**: 감사 로그는 INSERT-ONLY, UPDATE/DELETE 차단
- **Edge Autonomy**: Edge PC는 클라우드 단절 시 독립 동작 (최소 30분)
- **Monorepo Structure**: `apps/` (서비스) + `packages/` (공유 타입/유틸) 구조
- **Contract-First API**: OpenAPI 스펙 먼저, 코드 나중

---

## 2. 아키텍처 (Architecture)

### 2.1 전체 컴포넌트 구성

```
┌───────────────────────────────────────────────────────────────┐
│                    [Client Layer]                             │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐    │
│  │  Web (Next.js)  │  │ Tablet (PWA) │  │ Mobile (PWA)  │    │
│  │  Port: 3000     │  │ Port: 3000   │  │ Port: 3000    │    │
│  └────────┬────────┘  └──────┬───────┘  └───────┬───────┘    │
└───────────┼─────────────────┼─────────────────────┼──────────┘
            │ HTTPS / WSS     │                     │
┌───────────▼─────────────────▼─────────────────────▼──────────┐
│                 [API Gateway - Kong]                           │
│  - JWT 검증 (Keycloak 공개키)                                 │
│  - Rate Limiting: 100 req/s per user                          │
│  - 라우팅: /api/v1/* → 마이크로서비스                          │
│  Port: 8000                                                   │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│               [Core Microservices]                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ auth-service │  │ master-svc   │  │ iot-collector-svc    │ │
│  │ :3001        │  │ :3002        │  │ :3003                │ │
│  │ (Keycloak    │  │ (기준정보/   │  │ (MQTT Sub,           │ │
│  │  Adapter)    │  │  LOT/코드)   │  │  TimescaleDB Write)  │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │ audit-svc    │  │ notif-svc    │                           │
│  │ :3004        │  │ :3005        │                           │
│  │ (감사로그    │  │ (WebSocket,  │                           │
│  │  append-only)│  │  Push, Email)│                           │
│  └──────────────┘  └──────────────┘                           │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                   [Data Layer]                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ PostgreSQL   │  │ TimescaleDB  │  │ Redis                │ │
│  │ :5432        │  │ :5433        │  │ :6379                │ │
│  │ (OLTP:       │  │ (IoT 시계열: │  │ (세션/캐시/          │ │
│  │  LOT, WO,    │  │  sensor_data │  │  Pub-Sub 알림)       │ │
│  │  Audit)      │  │  hypertable) │  │                      │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────┐                                             │
│  │ MinIO (S3)   │                                             │
│  │ :9000        │                                             │
│  │ (파일:검사   │                                             │
│  │  사진, 리포) │                                             │
│  └──────────────┘                                             │
└───────────────────────────────┬───────────────────────────────┘
                                │ MQTT over TLS
┌───────────────────────────────▼───────────────────────────────┐
│                  [Edge Layer (공장 내)]                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Edge PC (Ubuntu 22.04 + K3s)                           │  │
│  │  - edge-gateway service (OPC-UA → MQTT 변환)            │  │
│  │  - local-buffer (SQLite, 30분 분량)                     │  │
│  │  - edge-inference (룰 기반 알람)                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│  OPC-UA / Modbus / 직접 아날로그                               │
│  PLC / Sensor (진동·온도·전력·SPM카운터)                      │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름 (Data Flow)

**IoT 실시간 흐름:**
```
PLC/Sensor
  → OPC-UA Client (Edge PC)
  → MQTT Publish: topic = "factory/{machineId}/sensors"
  → EMQX Broker (Cloud)
  → iot-collector-svc (Subscribe)
  → TimescaleDB: sensor_data hypertable
  → Redis Pub-Sub: "realtime:{machineId}"
  → WebSocket → 대시보드 차트 업데이트
```

**LOT 추적 흐름:**
```
입고 QR 스캔
  → POST /api/v1/inbound/lots
  → master-svc: LOT 생성 (lot_id, material_id, supplier_id, timestamp)
  → PostgreSQL: lots, lot_events 테이블
  → 공정 투입 시: lot_event INSERT (event_type=PROCESS_START)
  → 출하 시: lot_event INSERT (event_type=SHIPMENT)
  → LOT 조회: SELECT * FROM lot_events WHERE lot_id=? ORDER BY occurred_at
```

**인증 흐름:**
```
사용자 로그인
  → Keycloak (OIDC Authorization Code Flow)
  → Access Token (JWT, 15분)
  → Refresh Token (httpOnly Cookie, 8시간)
  → API 호출: Authorization: Bearer {access_token}
  → Kong Gateway: 토큰 검증 → 서비스 라우팅
  → 서비스: req.user.roles 기반 접근제어
```

### 2.3 모노레포 구조

```
ks-mes/                          # 루트 (Turborepo)
├── apps/
│   ├── web/                     # Next.js 14 (App Router)
│   ├── auth-service/            # NestJS - Keycloak 어댑터
│   ├── master-service/          # NestJS - LOT / 기준정보
│   ├── iot-collector/           # NestJS - MQTT 수집
│   ├── audit-service/           # NestJS - 감사 로그
│   ├── notif-service/           # NestJS - 알림
│   └── edge-gateway/            # Node.js - OPC-UA → MQTT
├── packages/
│   ├── types/                   # 공유 TypeScript 타입
│   ├── ui/                      # 공유 UI 컴포넌트 (shadcn 기반)
│   ├── db/                      # Prisma 스키마 + 마이그레이션
│   └── config/                  # ESLint, TypeScript, Tailwind 공통 설정
├── infra/
│   ├── docker/                  # docker-compose.yml (개발)
│   ├── k8s/                     # Kubernetes manifests
│   └── terraform/               # AWS 인프라 (EKS, RDS, etc.)
├── docs/                        # 이 문서들
├── turbo.json
└── package.json
```

---

## 3. 데이터 모델 (Data Model)

### 3.1 핵심 엔티티

#### 3.1.1 LOT (원자재/제품 추적 단위)

```sql
-- PostgreSQL: lots 테이블
CREATE TABLE lots (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number    VARCHAR(50) NOT NULL UNIQUE,          -- 예: "LOT-20260701-001"
  lot_type      VARCHAR(20) NOT NULL,                 -- 'MATERIAL' | 'WIP' | 'PRODUCT'
  material_id   UUID        REFERENCES materials(id),
  supplier_id   UUID        REFERENCES suppliers(id),
  quantity      NUMERIC(12,3) NOT NULL,
  unit          VARCHAR(10) NOT NULL,                 -- 'kg', 'pcs', 'coil'
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'USED' | 'REJECTED' | 'SHIPPED'
  created_by    UUID        NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 이력 이벤트 (불변, INSERT-ONLY)
CREATE TABLE lot_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id        UUID        NOT NULL REFERENCES lots(id),
  event_type    VARCHAR(30) NOT NULL,  -- 'INBOUND' | 'INSPECTION' | 'PROCESS_START' |
                                       -- 'PROCESS_END' | 'QUALITY_CHECK' | 'SHIPMENT' | 'REJECT'
  machine_id    UUID        REFERENCES machines(id),
  work_order_id UUID        REFERENCES work_orders(id),
  operator_id   UUID        REFERENCES users(id),
  payload       JSONB,                 -- 이벤트별 추가 데이터
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- UPDATE, DELETE 권한 없음 (REVOKE UPDATE, DELETE ON lot_events FROM app_user)
);

CREATE INDEX idx_lot_events_lot_id ON lot_events(lot_id);
CREATE INDEX idx_lot_events_occurred_at ON lot_events(occurred_at DESC);
```

#### 3.1.2 Machine (설비)

```sql
CREATE TABLE machines (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_code  VARCHAR(20) NOT NULL UNIQUE,  -- 예: "PRESS-01"
  name          VARCHAR(100) NOT NULL,
  machine_type  VARCHAR(30) NOT NULL,         -- 'PRESS' | 'WELDER' | 'WASHER' | ...
  line_id       UUID        REFERENCES production_lines(id),
  manufacturer  VARCHAR(100),
  model         VARCHAR(100),
  plc_address   VARCHAR(200),                 -- OPC-UA endpoint 또는 Modbus IP:port
  mqtt_topic    VARCHAR(200) GENERATED ALWAYS AS
                  ('factory/' || machine_code || '/sensors') STORED,
  installed_at  DATE,
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 3.1.3 WorkOrder (작업 지시)

```sql
CREATE TABLE work_orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number       VARCHAR(30) NOT NULL UNIQUE,  -- 예: "WO-20260701-005"
  product_code    VARCHAR(50) NOT NULL,
  mold_id         UUID        REFERENCES molds(id),
  machine_id      UUID        NOT NULL REFERENCES machines(id),
  planned_qty     INTEGER     NOT NULL,
  produced_qty    INTEGER     NOT NULL DEFAULT 0,
  defect_qty      INTEGER     NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
                              -- 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
  planned_start   TIMESTAMPTZ,
  planned_end     TIMESTAMPTZ,
  actual_start    TIMESTAMPTZ,
  actual_end      TIMESTAMPTZ,
  operator_id     UUID        REFERENCES users(id),
  created_by      UUID        NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 3.1.4 SensorData (IoT 시계열, TimescaleDB)

```sql
-- TimescaleDB hypertable
CREATE TABLE sensor_data (
  time          TIMESTAMPTZ  NOT NULL,
  machine_id    UUID         NOT NULL,
  channel       VARCHAR(30)  NOT NULL,   -- 'vibration_x', 'temperature', 'power_kw', 'spm'
  value         DOUBLE PRECISION NOT NULL,
  quality       SMALLINT     NOT NULL DEFAULT 192  -- OPC-UA quality code
);

SELECT create_hypertable('sensor_data', 'time', chunk_time_interval => INTERVAL '1 day');

-- 7일 이상 지난 원시 데이터는 압축 (1/10 용량)
ALTER TABLE sensor_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'machine_id,channel'
);
SELECT add_compression_policy('sensor_data', INTERVAL '7 days');

-- 90일 후 자동 삭제 (원시), 집계 테이블에 보관
SELECT add_retention_policy('sensor_data', INTERVAL '90 days');

CREATE INDEX idx_sensor_data_machine_time ON sensor_data(machine_id, time DESC);
```

#### 3.1.5 AuditLog (감사 로그, 불변)

```sql
CREATE TABLE audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL,
  user_email    VARCHAR(200) NOT NULL,  -- 비정규화 (user 삭제 후에도 기록 보존)
  action        VARCHAR(50) NOT NULL,  -- 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT'
  resource_type VARCHAR(50) NOT NULL,  -- 'LOT' | 'WORK_ORDER' | 'USER' | ...
  resource_id   VARCHAR(100),
  before_value  JSONB,
  after_value   JSONB,
  ip_address    INET,
  user_agent    TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 감사 로그는 INSERT만 허용
REVOKE UPDATE, DELETE ON audit_logs FROM mes_app_user;
-- Row Security Policy: 조회 전용 사용자는 자기 로그만
```

### 3.2 엔티티 관계

```
[Supplier] 1 ──── N [Lot]
[Lot] 1 ──── N [LotEvent]
[WorkOrder] 1 ──── N [LotEvent]
[Machine] 1 ──── N [WorkOrder]
[Machine] 1 ──── N [SensorData] (TimescaleDB)
[Machine] 1 ──── N [Mold] (N:M via machine_mold_history)
[User] 1 ──── N [WorkOrder] (operator)
[User] 1 ──── N [AuditLog]
[ProductionLine] 1 ──── N [Machine]
```

### 3.3 집계 테이블 (Continuous Aggregates)

```sql
-- 1분 집계 (대시보드 실시간 차트용)
CREATE MATERIALIZED VIEW sensor_data_1min
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
GROUP BY bucket, machine_id, channel;

-- 1시간 집계 (트렌드 분석용)
CREATE MATERIALIZED VIEW sensor_data_1hour
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  machine_id,
  channel,
  AVG(value) AS avg_val,
  STDDEV(value) AS std_val,
  MAX(value) AS max_val,
  MIN(value) AS min_val
FROM sensor_data
GROUP BY bucket, machine_id, channel;
```

---

## 4. API 명세 (API Specification)

### 4.1 공통 규칙

| 항목 | 규칙 |
|------|------|
| Base URL | `/api/v1` |
| 인증 | `Authorization: Bearer {jwt}` |
| Content-Type | `application/json` |
| 날짜 형식 | ISO 8601 (UTC): `2026-07-01T09:00:00Z` |
| 페이징 | `?page=1&limit=20` → `{ data: [], total, page, limit }` |
| 에러 형식 | `{ error: { code, message, details? } }` |

### 4.2 인증 (auth-service)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/login` | Keycloak OIDC 로그인 (redirect) |
| POST | `/auth/refresh` | Access Token 갱신 |
| POST | `/auth/logout` | 세션 종료 |
| GET | `/auth/me` | 현재 사용자 정보 + 역할 |

**GET /auth/me Response:**
```json
{
  "id": "uuid",
  "email": "worker01@ks-mes.com",
  "name": "김철수",
  "department": "생산1팀",
  "roles": ["OPERATOR"],
  "permissions": ["lot:read", "work_order:write", "sensor:read"]
}
```

### 4.3 LOT 관리 (master-service)

| Method | Path | 설명 | 역할 |
|--------|------|------|------|
| POST | `/lots` | LOT 생성 (입고 시) | INSPECTOR+ |
| GET | `/lots/:id` | LOT 상세 | ALL |
| GET | `/lots/:id/trace` | LOT 전체 이력 추적 | ALL |
| GET | `/lots` | LOT 목록 (검색/필터) | ALL |
| PATCH | `/lots/:id/status` | LOT 상태 변경 | QUALITY+ |

**GET /lots/:id/trace Response:**
```json
{
  "lot": {
    "id": "uuid",
    "lotNumber": "LOT-20260701-001",
    "material": { "code": "SPCC-1.2T", "name": "냉연강판 1.2T" },
    "supplier": { "name": "POSCO" },
    "quantity": 500.0,
    "unit": "kg",
    "status": "SHIPPED"
  },
  "events": [
    {
      "eventType": "INBOUND",
      "occurredAt": "2026-07-01T08:30:00Z",
      "operator": { "name": "박입고" },
      "payload": { "truckNumber": "12가3456", "invoiceNo": "INV-001" }
    },
    {
      "eventType": "INSPECTION",
      "occurredAt": "2026-07-01T09:00:00Z",
      "payload": { "result": "PASS", "thickness": 1.21, "width": 300.2 }
    },
    {
      "eventType": "PROCESS_START",
      "occurredAt": "2026-07-01T14:00:00Z",
      "machine": { "code": "PRESS-01", "name": "1호 프레스" },
      "workOrder": { "woNumber": "WO-20260701-005" }
    },
    {
      "eventType": "SHIPMENT",
      "occurredAt": "2026-07-02T16:00:00Z",
      "payload": { "deliveryNo": "DEL-2026-0702-001", "customer": "현대모비스" }
    }
  ]
}
```

### 4.4 IoT 수집 (iot-collector — 내부 전용)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/sensors/latest` | 전 설비 최신 센서값 (대시보드용) |
| GET | `/sensors/:machineId/history` | 기간별 센서 이력 |
| GET | `/sensors/:machineId/realtime` | SSE 스트림 (실시간 차트) |

**GET /sensors/latest Response:**
```json
{
  "timestamp": "2026-07-01T09:00:00Z",
  "machines": [
    {
      "machineId": "uuid",
      "machineCode": "PRESS-01",
      "sensors": {
        "vibration_x": { "value": 2.3, "unit": "m/s²", "status": "NORMAL" },
        "temperature":  { "value": 45.2, "unit": "°C",   "status": "NORMAL" },
        "power_kw":     { "value": 18.5, "unit": "kW",   "status": "NORMAL" },
        "spm":          { "value": 60,   "unit": "spm",  "status": "NORMAL" }
      },
      "updatedAt": "2026-07-01T09:00:00Z"
    }
  ]
}
```

### 4.5 설비 (master-service)

| Method | Path | 설명 | 역할 |
|--------|------|------|------|
| GET | `/machines` | 설비 목록 | ALL |
| GET | `/machines/:id` | 설비 상세 + 현재 WO | ALL |
| POST | `/machines` | 설비 등록 | ADMIN |
| PATCH | `/machines/:id` | 설비 정보 수정 | ADMIN |

---

## 5. UI/UX 설계

### 5.1 공통 레이아웃

```
┌────────────────────────────────────────────────────┐
│ [광성정밀 AI-MES]  [알림벨 🔔(3)]  [김철수 ▼]      │  ← Header (h=60px)
├──────────┬─────────────────────────────────────────┤
│          │                                         │
│ [AI대시보드]  ◀ 메뉴                 콘텐츠 영역    │
│ [입고관리]                                          │
│ [프레스공정]                                         │
│ [출하관리]   사이드바 (w=240px,                     │
│ [공정관리]   태블릿에서 접기 가능)                   │
│ [품질분석]                                           │
│ ──────────                                          │
│ [기준정보]                                           │
│ [시스템관리]                                         │
│          │                                         │
└──────────┴─────────────────────────────────────────┘
```

### 5.2 로그인 화면

```
┌────────────────────────────────────────────┐
│                                            │
│         [광성정밀 로고]                     │
│      AI 제조 스마트공장 시스템              │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 사번 또는 이메일                      │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 비밀번호                              │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [ 🔑 로그인 ]   [ AD 계정으로 로그인 ]    │
│                                            │
│  ※ 비밀번호 분실 시 IT 담당자 문의 (내선 123) │
└────────────────────────────────────────────┘
```

### 5.3 기본 대시보드 (Foundation 단계)

```
┌─────────────────────────────────────────────────────────────┐
│ AI 대시보드          오늘 2026-07-01  14:30   [새로고침 30s] │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ 설비가동률│  오늘생산 │  불량률  │ 납기준수 │                 │
│  78.3%   │  1,240개 │  0.45%   │  100%    │  [알림 목록]    │
│ ▲ vs 어제│ ▲ +5%    │ ▼ 목표↓  │ ✅ 이상없음│  • PRESS-03    │
│          │          │          │          │    진동 경고    │
├──────────┴──────────┴──────────┴──────────┤  • LOT-241      │
│  설비 상태 현황                            │    입고 대기    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │                 │
│  │PRESS │ │PRESS │ │PRESS │ │PRESS │     │  [최근 작업지시]│
│  │  01  │ │  02  │ │  03  │ │  04  │     │  WO-241: 완료  │
│  │ 🟢가동│ │ 🟢가동│ │ 🟡경고│ │ 🔴정지│     │  WO-242: 진행中│
│  │ 60spm│ │ 58spm│ │ 55spm│ │  -   │     │  WO-243: 예정  │
│  └──────┘ └──────┘ └──────┘ └──────┘     │                 │
├────────────────────────────────────────────┤                 │
│  PRESS-01 진동 (실시간) ─────────────────  │                 │
│  [스파크라인 차트 30분]                    │                 │
└────────────────────────────────────────────┴─────────────────┘
```

### 5.4 컴포넌트 목록 (Foundation 단계)

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| `AppShell` | packages/ui | 헤더+사이드바+콘텐츠 레이아웃 |
| `Sidebar` | packages/ui | 메뉴 트리, 역할별 필터링 |
| `AuthGuard` | apps/web | 페이지 접근 제어 HOC |
| `KpiCard` | packages/ui | 숫자 + 트렌드 표시 카드 |
| `MachineStatusBadge` | packages/ui | 설비 상태 색상 배지 |
| `SensorSparkline` | packages/ui | 30분 실시간 라인 차트 (Recharts) |
| `AlertPanel` | packages/ui | 실시간 알림 슬라이드 패널 |
| `LotTraceTimeline` | apps/web/features/lot | LOT 이벤트 타임라인 |
| `DataTable` | packages/ui | 페이징 테이블 (TanStack Table) |

---

## 6. 인증 & 인가 설계

### 6.1 역할 정의 (RBAC)

| 역할 | 코드 | 대상 | 주요 권한 |
|------|------|------|-----------|
| 관리자 | `ADMIN` | IT담당자 | 전체 |
| 공장장/팀장 | `MANAGER` | 공장장, 생산팀장 | 조회 전체 + 일부 수정 |
| 작업자 | `OPERATOR` | 현장 작업자 | 자기 WO 입력, 자주검사 |
| 품질검사원 | `INSPECTOR` | 품질팀 | 입고검사, 품질 데이터 |
| 조회전용 | `VIEWER` | 모회사 SQA, 감사 | 읽기 전용 |

### 6.2 권한 매트릭스 (주요 리소스)

| 리소스 | ADMIN | MANAGER | OPERATOR | INSPECTOR | VIEWER |
|--------|-------|---------|----------|-----------|--------|
| LOT 생성 | ✅ | ❌ | ❌ | ✅ | ❌ |
| LOT 조회/추적 | ✅ | ✅ | ✅ | ✅ | ✅ |
| WO 생성 | ✅ | ✅ | ❌ | ❌ | ❌ |
| WO 실적입력 | ✅ | ✅ | ✅(자기) | ❌ | ❌ |
| 센서 데이터 조회 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 기준정보 관리 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 사용자 관리 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 감사 로그 조회 | ✅ | ✅ | ❌ | ❌ | ❌ |
| AI Agent 질의 | ✅ | ✅ | ✅ | ✅ | ✅ |
| KPI 대시보드 | ✅ | ✅ | ✅(기본) | ✅ | ✅ |

---

## 7. 보안 설계

### 7.1 보안 체크리스트

- [x] JWT 만료: Access 15분 / Refresh 8시간
- [x] Refresh Token httpOnly Cookie (XSS 방어)
- [x] HTTPS 강제 (Kong Gateway TLS Termination)
- [x] API Rate Limiting: 100 req/s per user, 1000 req/s per IP
- [x] SQL Injection: Prisma ORM (파라미터 바인딩)
- [x] CORS: 허용 Origin 화이트리스트
- [x] 감사 로그 INSERT-ONLY DB 정책
- [x] 파일 업로드: 확장자 화이트리스트 (jpg, png, pdf, xlsx)
- [x] 비밀번호: Keycloak 관리 (MES 앱은 평문 비밀번호 미보관)
- [x] DB 접속: app_user (최소 권한), audit_logs REVOKE UPDATE/DELETE

### 7.2 민감 데이터

| 데이터 | 보호 방법 |
|--------|-----------|
| 사용자 비밀번호 | Keycloak 관리 (bcrypt, MES DB 미저장) |
| API 키 (LLM) | AWS Secrets Manager, 환경변수 미포함 |
| DB 접속 정보 | K8s Secret / .env.local (git 제외) |
| 개인정보 (사번/이메일) | DB 암호화 컬럼 (pgcrypto) |

---

## 8. 에러 처리

### 8.1 표준 에러 코드

| HTTP | 에러 코드 | 메시지 | 원인 |
|------|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | 입력값이 올바르지 않습니다 | 필드 검증 실패 |
| 401 | `TOKEN_EXPIRED` | 세션이 만료되었습니다 | JWT 만료 |
| 401 | `UNAUTHORIZED` | 로그인이 필요합니다 | 토큰 없음 |
| 403 | `FORBIDDEN` | 권한이 없습니다 | 역할 부족 |
| 404 | `NOT_FOUND` | 데이터를 찾을 수 없습니다 | 리소스 없음 |
| 409 | `DUPLICATE_LOT` | 이미 등록된 LOT 번호입니다 | 중복 |
| 500 | `INTERNAL_ERROR` | 시스템 오류입니다. IT팀에 문의하세요 | 서버 오류 |
| 503 | `IOT_TIMEOUT` | 설비 데이터 수신 지연 | MQTT 연결 이슈 |

### 8.2 에러 응답 형식

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 올바르지 않습니다",
    "details": [
      { "field": "quantity", "message": "수량은 0보다 커야 합니다" }
    ]
  },
  "timestamp": "2026-07-01T09:00:00Z",
  "requestId": "req-uuid"
}
```

---

## 9. 테스트 계획

### 9.1 테스트 범위

| 유형 | 대상 | 도구 | 커버리지 목표 |
|------|------|------|--------------|
| 단위 테스트 | 서비스 레이어 비즈니스 로직 | Jest + ts-jest | 70%+ |
| 통합 테스트 | API 엔드포인트 (DB 포함) | Supertest + testcontainers | 핵심 경로 100% |
| E2E 테스트 | 로그인 → 대시보드 → LOT 추적 시나리오 | Playwright | 주요 5개 흐름 |
| IoT 파이프라인 | MQTT → TimescaleDB 지연 측정 | 커스텀 시뮬레이터 | 10초 이내 검증 |

### 9.2 핵심 테스트 케이스

- [ ] LOT 생성 → 공정 이벤트 → 출하까지 전체 추적 (Happy Path)
- [ ] OPERATOR가 ADMIN 전용 API 호출 시 403 반환
- [ ] JWT 만료 후 Refresh Token으로 재발급
- [ ] 네트워크 단절 30분 후 재연결 시 버퍼 데이터 무손실 동기화
- [ ] audit_logs UPDATE 시도 시 DB 레벨에서 오류 반환
- [ ] 동일 LOT 번호 중복 등록 시 409 Conflict

---

## 10. 클린 아키텍처 레이어

### 10.1 레이어 구조

| 레이어 | 책임 | 위치 |
|--------|------|------|
| **Presentation** | HTTP 컨트롤러, Next.js 페이지/컴포넌트 | `apps/*/src/controllers/`, `apps/web/src/app/` |
| **Application** | Use Case, CQRS 커맨드/쿼리 핸들러 | `apps/*/src/application/` |
| **Domain** | 엔티티, 값 객체, 도메인 이벤트 | `packages/types/src/domain/` |
| **Infrastructure** | Prisma 리포지터리, MQTT 어댑터, Redis 클라이언트 | `apps/*/src/infrastructure/` |

### 10.2 ai-mes-foundation 레이어 배정

| 컴포넌트 | 레이어 | 경로 |
|---------|--------|------|
| `LotController` | Presentation | `apps/master-service/src/controllers/lot.controller.ts` |
| `CreateLotUseCase` | Application | `apps/master-service/src/application/lot/create-lot.usecase.ts` |
| `TraceLotUseCase` | Application | `apps/master-service/src/application/lot/trace-lot.usecase.ts` |
| `Lot` (Entity) | Domain | `packages/types/src/domain/lot.entity.ts` |
| `LotEvent` (Value Object) | Domain | `packages/types/src/domain/lot-event.vo.ts` |
| `PrismaLotRepository` | Infrastructure | `apps/master-service/src/infrastructure/lot.repository.ts` |
| `MqttSensorAdapter` | Infrastructure | `apps/iot-collector/src/infrastructure/mqtt.adapter.ts` |
| `TimescaleWriteService` | Infrastructure | `apps/iot-collector/src/infrastructure/timescale.write.ts` |

---

## 11. 개발 환경 (Docker Compose)

```yaml
# infra/docker/docker-compose.dev.yml (핵심 서비스만)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ks_mes
      POSTGRES_USER: mes_app_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  timescaledb:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: ks_mes_ts
      POSTGRES_USER: mes_ts_user
      POSTGRES_PASSWORD: ${TS_PASSWORD}
    ports: ["5433:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  emqx:
    image: emqx/emqx:5.4
    ports: ["1883:1883", "18083:18083"]  # MQTT + 관리 UI

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    command: start-dev
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KC_PASSWORD}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
    ports: ["8080:8080"]
    depends_on: [postgres]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
```

**시작 명령:**
```bash
cp infra/docker/.env.example infra/docker/.env  # 환경변수 설정
docker compose -f infra/docker/docker-compose.dev.yml up -d
cd apps/master-service && npx prisma migrate dev
npm run dev  # Turborepo 전체 개발 서버
```

---

## 12. 구현 순서 (Implementation Order)

### Phase 1-A: 기반 인프라 (Week 1~2)

1. [ ] Turborepo 모노레포 초기화 (`packages/types`, `packages/ui`, `packages/db`)
2. [ ] Docker Compose 환경 구성 (PostgreSQL + TimescaleDB + Redis + EMQX + Keycloak)
3. [ ] Prisma 스키마 작성 + 초기 마이그레이션 (lots, machines, work_orders, audit_logs)
4. [ ] TimescaleDB sensor_data hypertable + continuous aggregates
5. [ ] Keycloak 초기 설정 (Realm, Client, 역할 5개, 테스트 사용자)

### Phase 1-B: 백엔드 코어 (Week 3~4)

6. [ ] Kong Gateway 설정 (JWT 검증 플러그인, 라우팅)
7. [ ] `auth-service`: Keycloak OIDC 어댑터 + /auth/me 엔드포인트
8. [ ] `master-service`: LOT CRUD + LOT 추적 API (`/lots/:id/trace`)
9. [ ] `master-service`: Machine / WorkOrder CRUD
10. [ ] `audit-service`: AuditLog 자동 기록 미들웨어
11. [ ] `iot-collector`: MQTT Subscribe → TimescaleDB 저장 + Redis Pub-Sub

### Phase 1-C: 프론트엔드 기반 (Week 5~6)

12. [ ] Next.js 14 App Router 초기화 + Keycloak NextAuth 연동
13. [ ] `AppShell` 컴포넌트 (헤더 + 사이드바 + 역할별 메뉴)
14. [ ] 기본 대시보드: KpiCard × 4, MachineStatusBadge, SensorSparkline (SSE)
15. [ ] LOT 추적 화면: QR 입력 → 타임라인 표시
16. [ ] 알림 패널: WebSocket 실시간 연결

### Phase 1-D: 통합 검증 (Week 7~8)

17. [ ] E2E 테스트: 로그인 → 대시보드 → LOT 추적
18. [ ] 성능 테스트: IoT 파이프라인 지연 < 10초 검증
19. [ ] 보안 점검: RBAC 권한 매트릭스 전수 테스트
20. [ ] Edge Gateway MVP: OPC-UA 시뮬레이터 → MQTT → 대시보드 표시

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1 | 2026-05-11 | 초안 작성 | SysArch + PM-Core |
