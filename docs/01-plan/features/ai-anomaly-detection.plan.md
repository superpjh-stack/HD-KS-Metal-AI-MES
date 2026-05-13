# ai-anomaly-detection Plan Document

> **Summary**: 프레스 설비 실시간 이상감지 — 임계값 알람(PDM-01), SPC 통계 이상탐지(PDM-02), SPC 관리도(QAD-01), 공정능력지수(QAD-02) 구현.
>
> **Project**: 광성정밀 AI-MES
> **Author**: PM-AI / CTO Lead
> **Date**: 2026-05-12
> **Status**: Approved
> **Phase**: Phase 2 (2026.09 ~ 2026.11)

---

## 1. 목적 (Purpose)

`ai-anomaly-detection`은 AI-MES 3계층 아키텍처 중 **Layer 1 (룰/통계 기반)**을 구현한다.
Phase 1에서 구축된 TimescaleDB `sensor_data` hypertable과 notif-service 알람 채널을 활용하여,
실시간 이상 감지 및 SPC 품질관리 기능을 제공한다.

구체적으로:
- **PDM-01**: 임계값 초과 즉시 알람 (진동/온도/전류, 1초 이내)
- **PDM-02**: 통계 이상 감지 (평소 대비 ±3σ 이탈, SPC 방식)
- **QAD-01**: SPC 관리도 자동 생성 (X-bar R chart, Western Electric 8대 규칙)
- **QAD-02**: 공정능력지수 자동 계산 (Cp, Cpk — 부품×공정별)

---

## 2. 사용자 스토리 (User Stories)

**US-A-01** (보전팀장):
> "PRESS-05 진동이 임계값을 넘으면 1초 안에 휴대폰 알람이 오고, 어떤 채널(진동/전류/온도)이 문제인지 바로 보여야 한다."

**US-A-02** (품질 엔지니어):
> "X-bar R 관리도가 자동으로 그려지고, Western Electric 규칙 위반이 생기면 자동으로 표시되어야 한다."

**US-A-03** (공장장):
> "각 공정별 Cp, Cpk 지수를 대시보드에서 실시간으로 보고 싶다. 1.33 미만이면 빨간색으로 표시."

**US-A-04** (작업반장):
> "내 라인에서 최근 24시간 알람 이력과 각 알람의 처리 여부를 한 화면에서 볼 수 있어야 한다."

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] 임계값 초과 → 1초 이내 Socket.io 알람 (notif-service 경유)
- [ ] 최소 4개 설비 (PRESS-01~04), 3개 채널 (vibration, current, temperature) 커버
- [ ] SPC: X-bar R 관리도 데이터 API (1분 집계 기반)
- [ ] Western Electric 8대 규칙 중 Rule 1~4 자동 감지
- [ ] Cp/Cpk: 설비×채널별 실시간 계산 (최근 50샘플 기반)
- [ ] 알람 이력 저장 및 조회 API (필터: 설비, 날짜, 레벨)
- [ ] 알람 acknowledge (처리 확인) 기능
- [ ] 프론트엔드: SPC 차트 페이지 + 알람 이력 페이지

---

## 4. 범위 (Scope)

### In Scope (Phase 2)

| ID | 기능 | 우선순위 |
|----|------|---------|
| PDM-01 | 임계값 기반 실시간 알람 | Must |
| PDM-02 | ±3σ 통계 이상감지 | Must |
| QAD-01 | X-bar R SPC 관리도 | Must |
| QAD-02 | Cp/Cpk 공정능력지수 | Must |
| ALM-01 | 알람 이력 저장/조회 | Must |
| ALM-02 | 알람 acknowledge | Should |

### Out of Scope (Phase 3+)

- LSTM-AutoEncoder ML 모델 (PDM-03)
- 고장 확률 예측 (PDM-04)
- 잔여수명 RUL 예측 (PDM-05)
- 비전 외관검사 (QAD-07)
- LLM AI Agent (AGT 계열)

---

## 5. 기술 결정 사항

| 항목 | 결정 | 사유 |
|------|------|------|
| 신규 서비스 | `apps/ai-service` (NestJS) | 기존 모노레포 통일성 |
| 통계 계산 | TypeScript (내장) | Phase 2는 단순 통계 — Python 불필요 |
| 알람 발행 | Redis pub/sub → notif-service | 기존 인프라 재활용 |
| 스케줄링 | NestJS @Cron | 1분 간격 SPC 배치, 즉시 임계값은 IoT 수신 시 |
| 데이터 소스 | TimescaleDB `sensor_data_1min` (집계뷰) | 이미 존재하는 1분 집계뷰 활용 |
| 프론트엔드 | Recharts (기존 dashboard 차트 라이브러리) | 통일성 |

---

## 6. 의존성

- `ai-mes-foundation` ✅ (완료) — sensor_data hypertable, notif-service, auth-service
- `packages/db` — Prisma 스키마 확장 (AlarmRule, AlarmEvent, SpcParameter)
- `apps/iot-collector` — 실시간 수집 데이터 소스
- `apps/notif-service` — 알람 Redis pub/sub 채널

---

## 7. 일정

| 단계 | 기간 | 내용 |
|------|------|------|
| Phase 2-A | 2026.09.01~09.14 | ai-service 기반 + 임계값 알람 (PDM-01) |
| Phase 2-B | 2026.09.15~09.30 | SPC 통계 이상감지 + 알람 이력 (PDM-02, ALM) |
| Phase 2-C | 2026.10.01~10.21 | SPC 관리도 API + Cp/Cpk (QAD-01, QAD-02) |
| Phase 2-D | 2026.10.22~11.07 | 프론트엔드 SPC/알람 페이지 + 테스트 |
