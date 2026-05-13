# predictive-maintenance Plan Document

> **Summary**: ML 기반 예측정비 — LSTM-AutoEncoder 이상감지(PDM-03), 고장 확률 예측(PDM-04), 잔여수명 RUL 예측(PDM-05).
>
> **Project**: 광성정밀 AI-MES
> **Author**: PM-AI / CTO Lead
> **Date**: 2026-05-12
> **Status**: Draft
> **Phase**: Phase 3 (2026.12 ~ 2027.02)

---

## 1. 목적 (Purpose)

`predictive-maintenance`는 AI-MES 3계층 아키텍처 중 **Layer 2 (ML 딥러닝 기반)**을 구현한다.
Phase 2 (`ai-anomaly-detection`)의 룰/통계 기반 감지를 넘어, 학습된 ML 모델로
**패턴 기반 이상감지**, **고장 확률 추정**, **잔여수명(RUL) 예측**을 제공한다.

구체적으로:
- **PDM-03**: LSTM-AutoEncoder 비지도 이상감지 — 정상 패턴 학습 후 재구성 오차(Reconstruction Error) 기반 이상 탐지
- **PDM-04**: 고장 확률 예측 — 현재 센서 상태 → 향후 24시간 내 고장 확률 (0~100%)
- **PDM-05**: 잔여수명 예측 (RUL) — 현재 열화 속도 기반 예상 잔여 운전 가능 시간 (단위: 시간)

---

## 2. 사용자 스토리 (User Stories)

**US-PM-01** (보전팀장):
> "PRESS-03이 이번 주 말에 고장날 가능성이 75%라고 AI가 알려주면, 주말 전에 예방정비를 예약할 수 있다."

**US-PM-02** (설비 엔지니어):
> "각 프레스 설비의 현재 열화 상태와 예상 잔여수명(RUL)을 한 화면에서 보고 싶다. 200시간 미만이면 경고."

**US-PM-03** (공장장):
> "AI가 비정상 진동 패턴을 발견하면, 기존 SPC 규칙이 잡기 전에 선제 알람을 보내줘야 한다."

**US-PM-04** (IT 관리자):
> "ML 모델이 언제 마지막으로 학습됐는지, 현재 정확도(Anomaly Score 임계값)가 얼마인지 볼 수 있어야 한다."

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] PDM-03: LSTM-AutoEncoder 학습 + 추론 API. Reconstruction Error > threshold → AlarmEvent 생성
- [ ] PDM-03: 모델은 최근 30일 `sensor_data_1min` 데이터로 주 1회 재학습
- [ ] PDM-04: 고장 확률 API. 설비 + 채널별 24시간 내 고장 확률 반환
- [ ] PDM-04: 확률 ≥ 70% 시 자동 AlarmEvent (CRITICAL) 생성
- [ ] PDM-05: RUL API. 잔여수명 예측값(시간) + 신뢰구간 반환
- [ ] PDM-05: RUL < 200h 시 자동 AlarmEvent (WARNING) 생성
- [ ] 프론트엔드: 예측정비 대시보드 — 설비별 고장확률 게이지 + RUL 타임라인
- [ ] 모델 상태 API: 마지막 학습 일시, 학습 샘플 수, threshold값
- [ ] ai-service → ml-service HTTP 연동 (ai-service가 ML 결과를 받아 AlarmEvent로 변환)

---

## 4. 범위 (Scope)

### In Scope (Phase 3)

| ID | 기능 | 우선순위 | 모델 |
|----|------|---------|------|
| PDM-03 | LSTM-AutoEncoder 이상감지 | Must | 비지도 학습 |
| PDM-04 | 고장 확률 예측 | Must | Gradient Boosting (XGBoost) |
| PDM-05 | 잔여수명 RUL 예측 | Should | 회귀 모델 (LSTM or Ridge) |
| MDL-01 | 모델 학습 파이프라인 | Must | 주 1회 자동 재학습 |
| MDL-02 | 모델 버전 관리 | Should | MLflow or 파일 기반 |

### Out of Scope (Phase 4+)

- 비전 외관검사 (QAD-07) — 카메라 하드웨어 선행 필요
- LLM AI Agent (AGT 계열) — Phase 4 별도 계획
- 모델 A/B 테스트 자동화
- On-edge 추론 (설비 PLC 내장)

---

## 5. 기술 결정 사항

| 항목 | 결정 | 사유 |
|------|------|------|
| ML 런타임 | **Python FastAPI** (`apps/ml-service`) | PyTorch + scikit-learn 에코시스템 필요 |
| 딥러닝 프레임워크 | **PyTorch** (LSTM-AutoEncoder) | 유연한 커스텀 모델, ONNX 내보내기 지원 |
| 특징 엔지니어링 | **TimescaleDB SQL** (슬라이딩 윈도우 집계) | DB에서 집계 후 모델 입력 — Python에서 재집계 불필요 |
| 추론 스케줄 | 5분 배치 (`@Cron`) — ai-service가 ml-service HTTP 호출 | 실시간 요구사항 없음, 5분 지연 허용 |
| 학습 스케줄 | 매주 일요일 02:00 (`apscheduler`) — ml-service 내부 | 운영 시간 외 실행 |
| 모델 저장 | 로컬 파일시스템 (`/models/*.pt`, `/models/*.pkl`) | Phase 3에서는 MLflow 없이 단순화 |
| 연동 방식 | ai-service → ml-service REST API (HTTP) | NestJS ↔ FastAPI 표준 HTTP |
| 고장 확률 모델 | **XGBoost** (tabular features: 통계값) | 학습 데이터 부족 초기에 가장 안정적 |
| RUL 모델 | **선형 열화 추세** (초기) → LSTM (데이터 충분 후) | 데이터 적을 때 과적합 방지 |

---

## 6. 시스템 아키텍처 개요

```
IoT Collector
    │ sensor_data → TimescaleDB
    │
    ▼
ai-service (NestJS)
    │ @Cron 5분 배치
    │ HTTP POST /predict
    ▼
ml-service (FastAPI, :3007)
    ├── /predict/anomaly    LSTM-AutoEncoder 추론
    ├── /predict/failure    XGBoost 고장확률
    ├── /predict/rul        RUL 예측
    └── /model/status       모델 상태
    │
    │ 결과 반환
    ▼
ai-service
    │ AlarmEvent 생성
    │ Redis ks-mes:alerts 발행
    ▼
notif-service → Socket.io → 프론트엔드
```

---

## 7. 데이터 흐름 (Feature Engineering)

```
sensor_data_1min (TimescaleDB)
    │
    │ 슬라이딩 윈도우 쿼리 (최근 60분 = 60 버킷)
    ▼
특징 벡터 (채널별 × 통계):
  - mean, std, min, max, range  (최근 5분)
  - mean, std                   (최근 60분)
  - 추세 기울기 (linear slope)  (최근 30분)
  - SPC 이탈 횟수              (최근 60분)
    │
    ▼
ml-service 입력: [n_features] float32 벡터
```

---

## 8. 의존성

- `ai-anomaly-detection` ✅ (완료) — AlarmEvent 모델, Redis 알람 채널
- `apps/ai-service` ✅ — HTTP client 추가로 ml-service 호출
- `packages/db` — `MlModelStatus`, `PredictionLog` 테이블 추가 예정
- TimescaleDB `sensor_data_1min` — 학습 데이터 소스 (최소 30일 데이터 필요)
- Python 3.11+, PyTorch 2.x, FastAPI 0.110+

---

## 9. 전제 조건 (Prerequisites)

| 조건 | 상태 | 비고 |
|------|------|------|
| sensor_data 30일 이상 축적 | ⏳ 대기 | 2026.09 IoT 수집 시작 → 2026.12 충족 예상 |
| AlarmEvent 이력 (PDM-03 학습 레이블) | ⏳ 대기 | Phase 2 운영 3개월 후 확보 |
| docker-compose ml-service 컨테이너 | 미구성 | Phase 3-A에서 추가 |

---

## 10. 일정

| 단계 | 기간 | 내용 |
|------|------|------|
| Phase 3-A | 2026.12.01~12.14 | ml-service FastAPI 스캐폴딩 + TimescaleDB 특징 쿼리 |
| Phase 3-B | 2026.12.15~12.31 | LSTM-AutoEncoder 구현 + 학습 파이프라인 (PDM-03) |
| Phase 3-C | 2027.01.05~01.21 | XGBoost 고장확률 + RUL 모델 (PDM-04, PDM-05) |
| Phase 3-D | 2027.01.22~02.07 | 프론트엔드 예측정비 대시보드 + ai-service 연동 |

---

## 11. 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 30일 학습 데이터 부족 | 중 | 고 | 초기에 규칙 기반 RUL 추정으로 대체 |
| XGBoost 고장 레이블 불균형 | 고 | 중 | SMOTE / 클래스 가중치 조정 |
| ml-service 추론 지연 > 5초 | 저 | 중 | 배치 추론 + 캐싱 |
| PyTorch 버전 호환 (ARM/x86) | 저 | 저 | Docker 멀티스테이지 빌드 |
