# Gap Analysis Report — predictive-maintenance (Phase 3)

> **Feature**: predictive-maintenance  
> **Design**: `docs/02-design/features/predictive-maintenance.design.md`  
> **Analysis Date**: 2026-05-12  
> **Analyzer**: bkit:gap-detector  
> **Match Rate**: **84%**

---

## 전체 매칭률 요약

| 섹션 | 설계 항목 | 상태 | 매칭률 |
|------|-----------|:----:|:------:|
| §2 DB Schema | MlModelStatus, PredictionLog, Machine relation | ✅ | 100% |
| §3 ml-service 구조 | 전체 파일 트리 | ⚠️ | 92% |
| §4 API 설계 | ml-service + ai-service 엔드포인트 | ⚠️ | 90% |
| §5 핵심 알고리즘 | AutoEncoder / XGBoost / RUL | ✅ | 95% |
| §6/§7 학습 파이프라인 | APScheduler, 재학습 스크립트 | ⚠️ | 85% |
| §6 ai-service PdmModule | Service / Controller / Scheduler / DTO | ✅ | 95% |
| §8 프론트엔드 | 페이지, 훅, API 클라이언트, UI 컴포넌트 | ⚠️ | 70% |
| §9 Docker | docker-compose.dev.yml, Dockerfile | ✅ | 100% |

---

## 체크리스트

### B — 백엔드 (ml-service + ai-service)

| ID | 항목 | 상태 | 비고 |
|----|------|:----:|------|
| B01 | `config.py` — Pydantic Settings (ML_SERVICE_URL, AE_THRESHOLD 등) | ✅ | |
| B02 | `db/timescale.py` — asyncpg pool + 3종 쿼리 | ✅ | |
| B03 | `models/autoencoder.py` — LSTM-AutoEncoder (encoder LSTM + latent + decoder LSTM) | ✅ | 단일채널 (n_features=1) 단순화 |
| B04 | `models/schemas.py` — Pydantic 요청/응답 스키마 전종 | ✅ | |
| B05 | `services/autoencoder_service.py` — load_model / predict / is_model_loaded | ✅ | |
| B06 | `services/failure_prob_service.py` — load_model / predict(predict_proba) | ✅ | |
| B07 | `services/feature_service.py` — get_channel_features / build_sequence_tensor | ✅ | |
| B08 | `services/rul_service.py` — predict_rul (선형 회귀 inline) | ✅ | |
| B09 | `training/train_autoencoder.py` — DataLoader, 30 epoch, threshold=mean+3σ | ✅ | |
| B10 | `training/train_failure_prob.py` — XGBClassifier(n_est=100, max_depth=4) | ✅ | |
| B11 | `training/train_rul.py` | ❌ | RUL 선형회귀 inline 처리로 별도 스크립트 미작성 |
| B12 | `training/scheduler.py` — APScheduler sun 02:00 AE + sun 03:00 FP | ✅ | RUL job 미포함 |
| B13 | `routers/predict.py` — /predict/anomaly + /failure + /rul | ✅ | |
| B14 | `routers/train.py` — X-Api-Key 인증 + AE/FP 구현, RUL 501 stub | ⚠️ | /train/rul 501 |
| B15 | `routers/model_status.py` — latest.json + meta.json 파일 기반 | ✅ | DB 미기록 (G8) |
| B16 | `main.py` — lifespan (pool init/close, model load, scheduler) | ✅ | |
| B17 | `Dockerfile` — python:3.11-slim multi-stage | ✅ | |
| B18 | `packages/db/prisma/schema.prisma` — MlModelStatus 모델 | ✅ | |
| B19 | `packages/db/prisma/schema.prisma` — PredictionLog 모델 | ✅ | |
| B20 | `packages/db/prisma/schema.prisma` — Machine.predictionLogs relation | ✅ | |
| B21 | `pdm.service.ts` — mlPost / runAnomalyDetection / runFailurePrediction / runRulPrediction | ✅ | |
| B22 | `pdm.service.ts` — createPdmAlarm (alarmRule.upsert + AlarmService) | ✅ | |
| B23 | `pdm.service.ts` — getPdmSummary / getPredictions / getModelStatus | ✅ | |
| B24 | `pdm.controller.ts` — GET /pdm/summary, /predictions, /model-status + { data } 래핑 | ✅ | |
| B25 | `pdm.scheduler.ts` — @Cron 5분 배치 (ACTIVE 머신 순회) | ✅ | |
| B26 | `pdm.module.ts` — AlarmModule import, exports PdmService | ✅ | |
| B27 | `app.module.ts` — PdmModule 추가 | ✅ | |
| B28 | `dto/query-predictions.dto.ts` — machineId, modelType(IsIn), limit(Transform) | ✅ | |
| B29 | `infra/docker/docker-compose.dev.yml` — ml-service, ml_models volume, ai-service env | ✅ | |

### F — 프론트엔드

| ID | 항목 | 상태 | 비고 |
|----|------|:----:|------|
| F01 | `api-client.ts` — pdmApi.summary / predictions / modelStatus | ✅ | |
| F02 | `api-client.ts` — PdmSummary / PredictionLog / MlModelStatus 타입 | ✅ | |
| F03 | `features/pdm/usePdm.ts` — usePdmSummary (5분 refetch) | ✅ | |
| F04 | `features/pdm/usePdm.ts` — usePredictions / useModelStatus | ✅ | |
| F05 | `/pdm/page.tsx` — 설비 목록 + PDM 요약 (이상감지/고장확률/RUL/트렌드) | ✅ | 경로 `/predictive` → `/pdm` 변경 |
| F06 | `/pdm/[machineId]/page.tsx` — KPI 카드 3종 + 경고 배너 | ✅ | |
| F07 | `/pdm/[machineId]/page.tsx` — 모델별 추이 차트 탭 (Recharts + ReferenceLine) | ✅ | |
| F08 | `packages/ui/src/HealthScoreCard.tsx` (재사용 컴포넌트) | ❌ | 페이지 내 inline KpiCard로 대체 |
| F09 | `packages/ui/src/FailureProbGauge.tsx` | ❌ | 페이지 내 inline ProbGauge로 대체 |
| F10 | `packages/ui/src/RulTimeline.tsx` | ❌ | 미구현 (추이 차트로 대체) |
| F11 | `packages/ui/src/AnomalyTrend.tsx` | ❌ | 미구현 (PredictionChart로 대체) |
| F12 | `Sidebar/index.tsx` — 예측정비 AI (/pdm) 메뉴 추가 | ✅ | |

---

## 갭 목록

| ID | 갭 내용 | 위치 | 심각도 | 권장 조치 |
|----|---------|------|:------:|-----------|
| **G1** | `training/train_rul.py` 미작성 | 설계 §3, §7.1 | 낮음 | RUL inline 처리 결정을 설계 §3/§7.1에 명시 |
| **G2** | `/train/rul` 엔드포인트 501 stub | `routers/train.py:56-60` | 낮음 | RUL 학습 미사용 확정 시 엔드포인트 제거 또는 설계에서 제거 |
| **G3** | APScheduler에 RUL 재학습 job 없음 | `training/scheduler.py` | 낮음 | 설계 §7.1에 "RUL 재학습 불필요 (inline 선형회귀)"로 명시 |
| **G4** | 채널명 불일치 — ml-service `vibration_x/y`, `power_kw` vs ai-service `vibration`, `voltage`, `speed`, `flow` | `feature_service.py:13`, `pdm.scheduler.ts:10` | **중간** | 단일 채널 표준 목록으로 통일 필요 (실 센서 연동 전 필수) |
| **G5** | `/predict/failure` 응답 구조가 배열 → 객체 래핑으로 변경 | `models/schemas.py:31`, 설계 §4.1 | 낮음 | 설계 §4.1을 구현에 맞춰 갱신 |
| **G6** | XGBoost feature 벡터 6차원 (설계: 채널통계7 + SPC이탈 + 알람수), `recent_critical_count=0` 하드코딩 | `routers/predict.py:59-66` | **중간** | SPC 이탈 횟수 + DB recent_critical_count 쿼리 추가 |
| **G7** | RUL 계산에 SpcParameter.usl 미연동 — 채널 기본값만 사용 | `routers/predict.py:96` | 낮음 | SpcParameter 조회 후 usl 전달 |
| **G8** | MlModelStatus Prisma 테이블에 학습 결과 미기록 | `train_autoencoder.py`, `train_failure_prob.py` | 낮음 | 학습 완료 후 ai-service POST 또는 직접 DB upsert |
| **G9** | UI 컴포넌트 4종 (`HealthScoreCard`, `FailureProbGauge`, `RulTimeline`, `AnomalyTrend`) `packages/ui` 미생성 | 설계 §8.2 | 낮음 | 재사용 없으면 설계에서 제거, 필요하면 inline → 컴포넌트 추출 |
| **G10** | 프론트엔드 경로 `/predictive` → `/pdm` 변경 | 설계 §8.1, §8.4 | 낮음 | 설계 §8을 `/pdm`으로 갱신 (의도적 변경) |
| **G11** | `predictionLog.alarmEventId` 미연결 (알람 생성 후 ID 미기록) | `pdm.service.ts:94-171` | 낮음 | createPdmAlarm 반환값으로 PredictionLog 업데이트 |
| **G12** | LSTM-AutoEncoder 단일채널 단순화 (설계: multi-feature 시퀀스) | `models/autoencoder.py` | 낮음 | 설계에 "Phase 3 = 채널별 독립 단일채널"로 명시 |
| **G13** | PdmController Roles에 `OPERATOR` 포함 (설계: VIEWER 이상) | `pdm.controller.ts` | 낮음 | 권한 정책 통일 (OPERATOR 포함 여부 결정) |

---

## 수용된 변경 (Accepted Deviations)

| 항목 | 설계 | 구현 | 판단 |
|------|------|------|------|
| RUL 학습 방식 | `train_rul.py` + 파일 저장 | `rul_service.py` 내 선형회귀 inline | ✅ Phase 3 범위 내 합리적 단순화 |
| 프론트엔드 경로 | `/predictive` | `/pdm` | ✅ 더 간결한 경로, Sidebar와 일관 |
| UI 컴포넌트 | `packages/ui` 4종 신규 추출 | 페이지 내 inline | ✅ 재사용 없는 경우 inline이 적절 |
| AutoEncoder 채널 처리 | multi-feature 시퀀스 | 채널별 독립 단일채널 | ✅ Phase 3 MVP 범위 내 |

---

## 즉시 수정 필요 항목 (Match Rate 향상)

**G4 채널명 통일 (중간, 실 데이터 연동 영향)**
```
ml-service DEFAULT_CHANNELS = ['vibration_x', 'vibration_y', 'temperature', 'power_kw', 'current']
ai-service CHANNELS         = ['temperature', 'vibration', 'pressure', 'current', 'voltage', 'speed', 'flow']
```
→ 실제 PLC/센서 채널명을 기준으로 양측 통일 필요.

**G6 XGBoost feature 완성 (중간, 모델 정확도 영향)**
- `recent_critical_count` DB 쿼리 구현
- SPC 이탈 횟수 연동

---

## 다음 단계

매칭률 84% (목표 90% 미만) — 아래 중 선택:

1. **`/pdca iterate predictive-maintenance`** — G4, G6 자동 수정 후 재검증
2. **수동 수정** — G4 채널명 통일 + G6 feature 완성 후 재분석
3. **설계 갱신** — 의도적 변경(G1~G3, G5, G10, G12)을 설계 문서에 반영하여 매칭률 상향
