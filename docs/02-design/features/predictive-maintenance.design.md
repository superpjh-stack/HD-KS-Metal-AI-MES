# predictive-maintenance Design Document

> **Feature**: predictive-maintenance (Phase 3)
> **Plan Reference**: `docs/01-plan/features/predictive-maintenance.plan.md`
> **Author**: CTO Lead / Frontend Architect
> **Date**: 2026-05-12
> **Status**: Draft

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        apps/ml-service  (FastAPI :3007)          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ LSTM-AutoEnc │  │   XGBoost    │  │   RUL (Linear/LSTM)  │  │
│  │  (PDM-03)   │  │  (PDM-04)   │  │      (PDM-05)         │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         └─────────────────┴──────────────────────┘              │
│                     /predict/* endpoints                         │
│                     /train/*  endpoints (내부 전용)              │
│                     /model/status                                 │
└──────────────────────────────┬──────────────────────────────────┘
                                │ HTTP (axios)
                                │ @Cron 5분 배치
┌──────────────────────────────▼──────────────────────────────────┐
│                   apps/ai-service  (NestJS :3006)                │
│                                                                   │
│  PdmScheduler          PdmService         PdmController           │
│  @Cron 5분  ──────▶  ml-service 호출  ──▶  REST API             │
│                      AlarmEvent 변환                              │
│                      Redis 발행                                   │
└──────────────────────────────┬──────────────────────────────────┘
                                │ AlarmEvent, Redis
                    기존 ai-service 인프라 (notif-service, 프론트)
```

---

## 2. 데이터베이스 스키마

### 2.1 packages/db/prisma/schema.prisma 추가

```prisma
model MlModelStatus {
  id            String   @id @default(cuid())
  modelType     String   @db.VarChar(20)  // "AUTOENCODER" | "FAILURE_PROB" | "RUL"
  version       String   @db.VarChar(20)
  trainedAt     DateTime
  trainSamples  Int
  threshold     Float?   // AutoEncoder: reconstruction error threshold
  metrics       Json?    // {"mae": 0.012, "auc": 0.91}
  filePath      String   @db.VarChar(200) // /models/autoencoder_v3.pt
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  @@unique([modelType, isActive])
  @@index([modelType, trainedAt(sort: Desc)])
  @@map("ml_model_status")
}

model PredictionLog {
  id            String   @id @default(cuid())
  machineId     String
  channel       String   @db.VarChar(40)
  modelType     String   @db.VarChar(20)
  predictedAt   DateTime @default(now())
  score         Float    // AutoEncoder: recon error; FailureProb: 0~1; RUL: hours
  isAnomaly     Boolean  @default(false)
  alarmEventId  String?  // 알람 발생 시 연결

  machine       Machine  @relation(fields: [machineId], references: [id])

  @@index([machineId, modelType, predictedAt(sort: Desc)])
  @@index([predictedAt(sort: Desc)])
  @@map("prediction_logs")
}
```

### 2.2 Machine 모델 relation 추가

```prisma
model Machine {
  // ... 기존 필드
  predictionLogs PredictionLog[]
}
```

---

## 3. ml-service 서비스 구조 (FastAPI)

```
apps/ml-service/
├── main.py                     FastAPI 앱 진입점 (:3007)
├── routers/
│   ├── predict.py              /predict/* 엔드포인트
│   ├── model_status.py         /model/status
│   └── train.py                /train/* (내부 전용, API key 필요)
├── services/
│   ├── feature_service.py      TimescaleDB 쿼리 + 특징 추출
│   ├── autoencoder_service.py  LSTM-AutoEncoder 추론
│   ├── failure_prob_service.py XGBoost 추론
│   └── rul_service.py          RUL 예측
├── models/
│   ├── autoencoder.py          LSTM-AutoEncoder PyTorch 모델 정의
│   └── schemas.py              Pydantic 요청/응답 스키마
├── training/
│   ├── train_autoencoder.py    AutoEncoder 학습 스크립트
│   └── train_failure_prob.py   XGBoost 학습 스크립트
│   # RUL: 선형 회귀 inline 처리 (services/rul_service.py), 별도 학습 스크립트 불필요
├── db/
│   └── timescale.py            asyncpg 연결 + 집계 쿼리
├── requirements.txt
└── Dockerfile
```

---

## 4. API 설계

### 4.1 ml-service API

```
POST /predict/anomaly
  Body: { machineId: str, channel: str }
  Response: { score: float, isAnomaly: bool, threshold: float }

POST /predict/failure
  Body: { machineId: str }
  Response: {
    machineId: str,
    channels: [{ channel: str, failureProbability: float }],
    predictedAt: str
  }

POST /predict/rul
  Body: { machineId: str, channel: str }
  Response: { rulHours: float | null, confidence: float, trend: "improving"|"stable"|"degrading" }

GET /model/status
  Response: [{
    modelType: str, version: str, trainedAt: str,
    trainSamples: int, threshold: float | null, isActive: bool
  }]

POST /train/autoencoder    (Internal — requires X-Api-Key header)
POST /train/failure-prob   (Internal — requires X-Api-Key header)
# /train/rul — 구현 예정 아님 (RUL은 선형 회귀 inline 처리, 별도 학습 API 불필요)
```

### 4.2 ai-service PDM API (NestJS 추가 엔드포인트)

```
GET  /api/v1/pdm/predictions?machineId=&modelType=&limit=
  Response: { data: PredictionLog[] }

GET  /api/v1/pdm/summary?machineId=
  Response: { data: {
    machineId: str,
    anomalyScore:       { score: float, isAnomaly: bool, updatedAt: str } | null,
    failureProbability: { max: float, channel: str, updatedAt: str } | null,
    rul:                { hours: float, trend: str, updatedAt: str } | null,
  }}

GET  /api/v1/pdm/model-status
  Response: { data: MlModelStatus[] }
```

### 4.3 API 응답 예시

```jsonc
// GET /api/v1/pdm/summary?machineId=xxx
{
  "data": {
    "machineId": "clxxx",
    "anomalyScore": {
      "score": 0.083,
      "isAnomaly": false,
      "updatedAt": "2026-12-15T09:05:00Z"
    },
    "failureProbability": {
      "max": 0.71,
      "channel": "vibration_x",
      "updatedAt": "2026-12-15T09:05:00Z"
    },
    "rul": {
      "hours": 187.5,
      "trend": "degrading",
      "updatedAt": "2026-12-15T09:05:00Z"
    }
  }
}
```

---

## 5. 핵심 알고리즘

### 5.1 특징 엔지니어링 (feature_service.py)

```python
# TimescaleDB 슬라이딩 윈도우 집계 (asyncpg)
FEATURE_QUERY = """
  SELECT
    -- 단기 (5분)
    AVG(avg_val) FILTER (WHERE bucket >= now() - INTERVAL '5 minutes') AS mean_5m,
    STDDEV(avg_val) FILTER (WHERE bucket >= now() - INTERVAL '5 minutes') AS std_5m,
    -- 중기 (60분)
    AVG(avg_val) FILTER (WHERE bucket >= now() - INTERVAL '60 minutes') AS mean_60m,
    STDDEV(avg_val) FILTER (WHERE bucket >= now() - INTERVAL '60 minutes') AS std_60m,
    -- 최솟값/최댓값 (60분)
    MIN(min_val) FILTER (WHERE bucket >= now() - INTERVAL '60 minutes') AS min_60m,
    MAX(max_val) FILTER (WHERE bucket >= now() - INTERVAL '60 minutes') AS max_60m,
    -- 추세 기울기 (30분 선형 회귀 기울기 근사)
    REGR_SLOPE(avg_val, EXTRACT(EPOCH FROM bucket))
      FILTER (WHERE bucket >= now() - INTERVAL '30 minutes') AS trend_slope
  FROM sensor_data_1min
  WHERE machine_id = $1 AND channel = $2
    AND bucket >= now() - INTERVAL '60 minutes'
"""
# → float32 벡터 [mean_5m, std_5m, mean_60m, std_60m, min_60m, max_60m, trend_slope]
# 채널별 결합 → 최종 특징 벡터 크기: n_channels × 7
```

### 5.2 LSTM-AutoEncoder (PDM-03)

```python
# models/autoencoder.py
class LSTMAutoEncoder(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 64, latent_dim: int = 16):
        # Encoder: LSTM(input_dim→hidden_dim) → Linear(hidden_dim→latent_dim)
        # Decoder: Linear(latent_dim→hidden_dim) → LSTM(hidden_dim→input_dim)

# 학습: 정상 운전 데이터만 사용 (비지도)
# 추론: reconstruction_error = MSE(input, decoded)
# 이상 판단: reconstruction_error > threshold
#   threshold = mean_train_error + 3 * std_train_error

# Phase 3: 채널별 독립 단일채널(n_features=1) 처리
#   → 각 채널을 개별 모델로 추론 (channel 파라미터로 선택)
# 입력 shape: (batch, seq_len=60, n_features=1)  → 60분 시계열, 단일채널
# 출력: reconstruction_error (scalar)
```

### 5.3 XGBoost 고장 확률 (PDM-04)

```python
# 특징: 채널별 통계 + SPC 이탈 횟수 + 최근 알람 수
# 레이블: binary — 향후 24시간 내 AlarmEvent(CRITICAL) 발생 여부
# 모델: XGBClassifier(n_estimators=100, max_depth=4, scale_pos_weight=auto)
# 출력: predict_proba[:, 1]  →  0.0 ~ 1.0

# 임계값 (고장 확률 → 알람):
FAILURE_ALARM_THRESHOLD = 0.70   # ≥ 70% → AlarmEvent CRITICAL
```

### 5.4 잔여수명 RUL (PDM-05)

```python
# Phase 3 초기: 선형 열화 추세 기반
# RUL(시간) = (safe_threshold - current_mean) / |trend_slope_per_hour|
# trend_slope_per_hour: 최근 24시간 REGR_SLOPE (avg_val per hour)

# 알람 임계값:
RUL_WARNING_HOURS  = 200   # < 200h → WARNING AlarmEvent
RUL_CRITICAL_HOURS = 72    # < 72h  → CRITICAL AlarmEvent
```

---

## 6. ai-service PDM 모듈 구조 (NestJS)

```
apps/ai-service/src/pdm/
├── pdm.module.ts
├── pdm.service.ts          ml-service HTTP 호출 + DB 저장
├── pdm.controller.ts       GET /pdm/predictions, /pdm/summary, /pdm/model-status
├── pdm.scheduler.ts        @Cron 5분 배치 — 설비별 순회 + ml-service 호출
└── dto/
    └── query-predictions.dto.ts
```

### 6.1 PdmScheduler 로직

```typescript
// @Cron('0 */5 * * * *')
async runPdmBatch() {
  const machines = await this.prisma.machine.findMany({ where: { status: 'ACTIVE' } });

  for (const machine of machines) {
    // PDM-03: AutoEncoder
    const anomaly = await this.mlClient.predictAnomaly(machine.machineCode, 'vibration_x');
    if (anomaly.isAnomaly) await this.createAlarmEvent(machine, anomaly, 'AUTOENCODER');

    // PDM-04: Failure Probability
    const failure = await this.mlClient.predictFailure(machine.machineCode);
    for (const f of failure) {
      if (f.failureProbability >= 0.70) await this.createAlarmEvent(machine, f, 'FAILURE_PROB');
    }

    // PDM-05: RUL
    const rul = await this.mlClient.predictRul(machine.machineCode, 'vibration_x');
    if (rul.rulHours != null && rul.rulHours < 200) await this.createRulAlarm(machine, rul);

    // PredictionLog 저장
    await this.savePredictionLogs(machine.id, anomaly, failure, rul);
  }
}
```

---

## 7. 학습 파이프라인

### 7.1 스케줄 (APScheduler inside ml-service)

```python
# training/scheduler.py
scheduler.add_job(train_autoencoder,   'cron', day_of_week='sun', hour=2, minute=0)
scheduler.add_job(train_failure_prob,  'cron', day_of_week='sun', hour=3, minute=0)
# train_rul 배치 제거 — RUL은 inline 선형 회귀로 매 추론 시 계산
```

### 7.2 AutoEncoder 학습 데이터

```sql
-- 정상 데이터: AlarmEvent 없는 구간의 sensor_data_1min
SELECT bucket, machine_id, channel, avg_val
FROM sensor_data_1min
WHERE bucket >= NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM alarm_events ae
    WHERE ae.machine_id = sensor_data_1min.machine_id
      AND ae.occurred_at BETWEEN sensor_data_1min.bucket - INTERVAL '5 minutes'
                              AND sensor_data_1min.bucket + INTERVAL '5 minutes'
  )
ORDER BY bucket;
```

### 7.3 모델 파일 관리

```
/models/
  autoencoder_v{N}.pt          PyTorch state_dict
  autoencoder_v{N}.meta.json   {"threshold": 0.045, "trainSamples": 12400, ...}
  failure_prob_v{N}.pkl        XGBoost booster (pickle)
  rul_v{N}.pkl                 LinearRegression (sklearn pickle)
  latest.json                  {"autoencoder": "v3", "failure_prob": "v2", "rul": "v1"}
```

---

## 8. 프론트엔드 (Next.js)

### 8.1 신규 페이지

```
apps/web/src/app/(app)/
├── pdm/
│   ├── page.tsx              예측정비 대시보드 — 설비별 건강 지수 카드
│   └── [machineId]/
│       └── page.tsx          설비 상세 — 이상도 추이, 고장확률 게이지, RUL 타임라인
```

### 8.2 신규 UI 컴포넌트 (packages/ui/src/)

```
HealthScoreCard.tsx    설비별 종합 건강 지수 (0~100) + 색상 게이지
FailureProbGauge.tsx   반원 게이지 차트 (채널별 고장 확률 %)
RulTimeline.tsx        잔여수명 막대 + 예상 고장일 표시
AnomalyTrend.tsx       AutoEncoder 재구성 오차 추이 (Recharts Line)
```

### 8.3 TanStack Query Hooks (apps/web/src/features/pdm/)

```typescript
usePdmSummary(machineId)      // GET /pdm/summary?machineId=
usePredictions(machineId, modelType)  // GET /pdm/predictions
useModelStatus()              // GET /pdm/model-status
```

### 8.4 Sidebar 추가 항목

```typescript
{ label: '예측 정비', href: '/pdm', icon: Activity, roles: ['ADMIN','MANAGER','INSPECTOR','VIEWER'] }
```

---

## 9. 인프라 (docker-compose.dev.yml 추가)

```yaml
ml-service:
  build:
    context: ./apps/ml-service
    dockerfile: Dockerfile
  ports:
    - "3007:3007"
  environment:
    - TIMESCALE_URL=${TIMESCALE_URL}
    - POSTGRES_URL=${DATABASE_URL}
    - ML_API_KEY=${ML_API_KEY}
    - MODEL_DIR=/models
  volumes:
    - ml_models:/models
  depends_on:
    timescaledb:
      condition: service_healthy

volumes:
  ml_models:
```

```yaml
# ai-service 환경변수 추가
ai-service:
  environment:
    - ML_SERVICE_URL=http://ml-service:3007
    - ML_API_KEY=${ML_API_KEY}
```

---

## 10. 보안

| 항목 | 방식 |
|------|------|
| ml-service 학습 API | `X-Api-Key` 헤더 (내부 전용) |
| ml-service 추론 API | 내부 네트워크 전용 (외부 미노출) |
| ai-service PDM API | 기존 JwtAuthGuard + RolesGuard 적용 |
| 모델 파일 | Docker volume 마운트 (컨테이너 외부 접근 불가) |

---

## 11. 구현 순서 (Phase 3-A → 3-D)

| 단계 | 구현 항목 |
|------|-----------|
| **3-A** | ml-service FastAPI 스캐폴딩, requirements.txt, Dockerfile, docker-compose 추가, feature_service.py (TimescaleDB 쿼리) |
| **3-B** | LSTM-AutoEncoder 모델 + 학습 스크립트 + `/predict/anomaly` + APScheduler 학습 배치 |
| **3-C** | XGBoost 고장확률 + RUL 선형 모델 + ai-service PdmModule (스케줄러 + DB 저장 + API) + Prisma 스키마 |
| **3-D** | 프론트엔드 예측정비 대시보드 페이지 + UI 컴포넌트 4종 + TanStack Query 훅 + Sidebar 링크 |
