# Plan — integrated-dashboard (Phase 4)

> **Feature**: integrated-dashboard  
> **Phase**: 4 — 통합 대시보드 & 리포팅  
> **Date**: 2026-05-12  
> **Status**: Draft  
> **Level**: Dynamic

---

## 1. 목표

Phase 1~3에서 구축한 데이터(실시간 센서, SPC, 알람, 예측정비 AI)를 **단일 화면에서 통합 조회**하고, 경영진이 의사결정에 활용할 수 있는 **KPI 대시보드 & 자동 리포트** 기능을 제공한다.

### 핵심 성과 지표 (KPI)

| 지표 | 정의 | 데이터 소스 |
|------|------|-------------|
| **설비 가동률** | ACTIVE 설비 수 / 전체 설비 수 | Machine.status |
| **OEE** | 가동률 × 성능률 × 품질률 | WorkOrder + SensorData |
| **AI 위험 설비 수** | PDM anomaly/failure ≥ 임계값인 설비 | PredictionLog |
| **미처리 알람 수** | acknowledgedAt = null | AlarmEvent |
| **불량률** | defectQty / producedQty | WorkOrder |
| **에너지 소비** | power_kw 채널 평균 | SensorData |

---

## 2. 기능 범위

### Phase 4-A: OEE + KPI 대시보드 고도화
- 기존 `/dashboard` 페이지에 OEE 계산 추가
- 설비별 OEE 히스토리 (일/주 단위) Recharts BarChart
- 에너지 소비 트렌드 (power_kw 24h LineChart)
- ai-service에 `/stats/oee` 엔드포인트 추가

### Phase 4-B: AI 통합 현황 뷰 (`/overview`)
- **신규 페이지** `/overview` — 전체 설비 AI 상태 한눈에
- 설비 그리드 카드: 알람 심각도 + PDM 위험도 + SPC 이탈 — 색상 코딩
- 실시간 알람 피드 (최근 10건)
- PDM 위험 설비 Top 5 (고장확률 기준)
- 클릭 시 해당 설비 `/spc/:id` 또는 `/pdm/:id`로 이동

### Phase 4-C: 자동 리포트 (`/reports`)
- **신규 페이지** `/reports` — 기간 선택 후 PDF 미리보기 + 다운로드
- 일/주/월 보고서 — 설비 KPI 요약, 알람 집계, AI 예측 요약
- `@react-pdf/renderer` 기반 PDF 생성
- ai-service에 `/stats/report?from=&to=` 엔드포인트 추가 (집계 데이터)

---

## 3. 기술 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| PDF 생성 | `@react-pdf/renderer` | React 컴포넌트로 레이아웃 제어, Next.js 호환 |
| OEE 계산 | ai-service 백엔드 | WorkOrder + SensorData 접근 필요 |
| 실시간 갱신 | TanStack Query refetchInterval | 기존 패턴 유지 |
| 설비 상태 색상 | Tailwind CSS 조건부 클래스 | 기존 패턴 유지 |
| 차트 | Recharts (기존 의존성) | 추가 설치 불필요 |

---

## 4. 구현 순서

```
4-A (OEE/KPI)
  ├── ai-service: /stats/oee 엔드포인트
  ├── api-client.ts: statsApi 추가
  ├── useStats.ts: useOee, useEnergyTrend 훅
  └── dashboard/page.tsx: OEE 카드 + 에너지 차트 추가

4-B (AI 통합 뷰)
  ├── /overview/page.tsx: 설비 그리드 + 알람 피드 + PDM Top5
  └── Sidebar: 통합 현황 메뉴 추가

4-C (리포트)
  ├── ai-service: /stats/report 엔드포인트
  ├── /reports/page.tsx: 기간 선택 UI
  └── /reports/preview/page.tsx: PDF 렌더러 컴포넌트
```

---

## 5. 백엔드 API 추가 (ai-service)

```
GET /api/v1/stats/oee?machineId=&from=&to=
  Response: { data: { availability, performance, quality, oee, machineId } }

GET /api/v1/stats/oee/history?machineId=&days=7
  Response: { data: [{ date, oee, availability, performance, quality }] }

GET /api/v1/stats/energy?machineId=&hoursBack=24
  Response: { data: [{ time, avgKw }] }

GET /api/v1/stats/report?from=&to=
  Response: {
    data: {
      period: { from, to },
      machines: [{ machineId, code, name, oee, alarmCount, pdmRisk }],
      alarms:   { total, critical, warning, info, topChannels },
      pdm:      { anomalyCount, highRiskMachines, avgRulHours },
    }
  }
```

---

## 6. 프론트엔드 페이지 구조

```
/dashboard          기존 — OEE 카드 + 에너지 차트 추가 (4-A)
/overview           신규 — AI 통합 현황 (4-B)
/reports            신규 — 리포트 목록 + 기간 선택 (4-C)
/reports/preview    신규 — PDF 미리보기 + 다운로드 (4-C)
```

---

## 7. 비기능 요구사항

| 항목 | 목표 |
|------|------|
| /overview 로딩 | ≤ 2초 (Promise.all 병렬 쿼리) |
| PDF 생성 | ≤ 5초 (클라이언트 사이드) |
| 데이터 갱신 | 30초 자동 refetch (/overview) |
| 접근 권한 | VIEWER 이상 (/overview, /reports) |

---

## 8. 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| WorkOrder 데이터 부족 시 OEE 계산 불가 | 중간 | mock OEE 또는 가동률만 표시 fallback |
| @react-pdf 번들 크기 (+500KB) | 낮음 | dynamic import로 lazy load |
| TimescaleDB energy 쿼리 성능 | 낮음 | 1분 집계 테이블 재사용 |

---

## 9. 일정

| Phase | 내용 | 예상 |
|-------|------|------|
| 4-A | OEE API + 대시보드 개선 | 1일 |
| 4-B | /overview 통합 현황 뷰 | 1일 |
| 4-C | /reports + PDF 생성 | 1.5일 |

**총 예상: 3.5일**
