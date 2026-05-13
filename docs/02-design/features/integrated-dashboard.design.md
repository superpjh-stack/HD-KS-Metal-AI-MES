# Design — integrated-dashboard (Phase 4)

> **Feature**: integrated-dashboard  
> **Plan**: `docs/01-plan/features/integrated-dashboard.plan.md`  
> **Author**: Frontend Architect / CTO Lead  
> **Date**: 2026-05-12  
> **Status**: Draft

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                  apps/web (Next.js :3000)                    │
│                                                              │
│  /dashboard   (기존 개선)    OEE 카드 + 에너지 차트 추가     │
│  /overview    (신규 4-B)     전체 설비 AI 통합 현황         │
│  /reports     (신규 4-C)     기간 선택 + 집계 뷰            │
│  /reports/preview (신규 4-C) PDF 렌더러                     │
└──────────────────┬──────────────────────────────────────────┘
                   │ REST (TanStack Query)
┌──────────────────▼──────────────────────────────────────────┐
│               apps/ai-service (NestJS :3006)                 │
│                                                              │
│  StatsModule (기존)                                          │
│    StatsService  — TimescaleDB 집계 (기존)                   │
│    StatsController (신규) — /stats/* 엔드포인트              │
│                                                              │
│  기존 모듈 재사용:                                            │
│    PrismaService  — WorkOrder, AlarmEvent, PredictionLog    │
│    AlarmService   — 알람 집계                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 백엔드 설계 (ai-service StatsController)

### 2.1 StatsController 신규 추가

파일: `apps/ai-service/src/stats/stats.controller.ts`

```typescript
@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  // GET /api/v1/stats/oee?machineId=&from=&to=
  // GET /api/v1/stats/oee/history?machineId=&days=7
  // GET /api/v1/stats/energy?machineId=&hoursBack=24
  // GET /api/v1/stats/overview          (4-B용 통합 현황)
  // GET /api/v1/stats/report?from=&to=  (4-C용 집계)
}
```

### 2.2 OEE 계산 로직

```
OEE = Availability × Performance × Quality

Availability (가동률) =
  실제 가동 시간 / 계획 가동 시간
  → WorkOrder.actualStart~actualEnd vs plannedStart~plannedEnd

Performance (성능률) =
  이론 생산량 / 실제 생산량
  = (producedQty / plannedQty) — 단순화 적용

Quality (품질률) =
  (producedQty - defectQty) / producedQty

OEE 데이터 없을 시 fallback: 가동 머신 수 / 전체 머신 수 (기존 방식)
```

### 2.3 API 응답 스키마

```typescript
// GET /stats/oee?machineId=&from=&to=
interface OeeResult {
  machineId:    string;
  from:         string;
  to:           string;
  availability: number;   // 0~1
  performance:  number;   // 0~1
  quality:      number;   // 0~1
  oee:          number;   // 0~1
  woCount:      number;   // 집계에 사용된 작업지시 수
}

// GET /stats/oee/history?machineId=&days=7
interface OeeHistoryItem {
  date:         string;   // YYYY-MM-DD
  availability: number;
  performance:  number;
  quality:      number;
  oee:          number;
}

// GET /stats/energy?machineId=&hoursBack=24
interface EnergyPoint {
  time:  string;   // ISO 8601
  avgKw: number;
}

// GET /stats/overview
interface OverviewItem {
  machineId:       string;
  machineCode:     string;
  name:            string;
  status:          string;
  alarmCount:      number;
  maxAlarmSeverity: 'NONE' | 'INFO' | 'WARNING' | 'CRITICAL';
  pdmAnomalyScore: number | null;   // 최신 AutoEncoder score
  pdmFailureProb:  number | null;   // 최신 고장 확률 max
  pdmRulHours:     number | null;   // 최신 RUL
  spcViolations:   number;          // 최근 1h SPC 이탈 건수
  riskLevel:       'NORMAL' | 'WARNING' | 'CRITICAL';
}

// GET /stats/report?from=&to=
interface ReportData {
  period: { from: string; to: string };
  machines: Array<{
    machineId:    string;
    machineCode:  string;
    name:         string;
    oee:          number | null;
    alarmCount:   number;
    pdmRisk:      'NONE' | 'LOW' | 'HIGH';
    topChannel:   string | null;
  }>;
  alarms: {
    total:       number;
    critical:    number;
    warning:     number;
    info:        number;
    topChannels: Array<{ channel: string; count: number }>;
  };
  pdm: {
    anomalyCount:      number;
    highRiskMachines:  number;   // failureProb >= 0.70
    avgRulHours:       number | null;
  };
  spc: {
    totalViolations: number;
    topMachines:     Array<{ machineCode: string; count: number }>;
  };
}
```

### 2.4 StatsModule 업데이트

```typescript
// stats.module.ts
@Module({
  imports: [AlarmModule, DbModule],     // DbModule(PrismaService) 추가
  providers: [StatsService, StatsScheduler, StatsController],
  controllers: [StatsController],        // 신규 추가
  exports: [StatsService],
})
export class StatsModule {}
```

### 2.5 DTO

```
apps/ai-service/src/stats/dto/
  query-oee.dto.ts          { machineId, from?, to? }
  query-oee-history.dto.ts  { machineId, days? = 7 }
  query-energy.dto.ts       { machineId, hoursBack? = 24 }
  query-report.dto.ts       { from, to }
```

---

## 3. 프론트엔드 설계

### 3.1 파일 구조

```
apps/web/src/
├── lib/
│   └── api-client.ts           statsApi 추가
├── features/
│   └── stats/
│       └── useStats.ts         useOee, useOeeHistory, useEnergy,
│                               useOverview, useReport 훅
├── app/(app)/
│   ├── dashboard/
│   │   └── page.tsx            OEE 카드 + 에너지 차트 추가 (기존 수정)
│   ├── overview/
│   │   └── page.tsx            신규 — AI 통합 현황
│   └── reports/
│       ├── page.tsx            신규 — 기간 선택
│       └── preview/
│           └── page.tsx        신규 — 집계 뷰 + PDF
└── packages/ui/src/
    └── Sidebar/index.tsx       통합 현황 + 리포트 메뉴 추가
```

### 3.2 api-client.ts 추가 타입

```typescript
// statsApi 추가
export interface OeeResult { machineId, from, to, availability, performance, quality, oee, woCount }
export interface OeeHistoryItem { date, availability, performance, quality, oee }
export interface EnergyPoint { time, avgKw }
export interface OverviewItem {
  machineId, machineCode, name, status,
  alarmCount, maxAlarmSeverity,
  pdmAnomalyScore, pdmFailureProb, pdmRulHours,
  spcViolations, riskLevel
}
export interface ReportData { period, machines, alarms, pdm, spc }

export const statsApi = {
  oee:        (machineId, from?, to?) => request(...)
  oeeHistory: (machineId, days?) => request(...)
  energy:     (machineId, hoursBack?) => request(...)
  overview:   () => request(...)
  report:     (from, to) => request(...)
}
```

### 3.3 useStats.ts 훅

```typescript
export function useOee(machineId: string, from?: string, to?: string)
  // queryKey: ['stats','oee', machineId, from, to]
  // staleTime: 5분

export function useOeeHistory(machineId: string, days = 7)
  // queryKey: ['stats','oee-history', machineId, days]
  // staleTime: 5분

export function useEnergy(machineId: string, hoursBack = 24)
  // queryKey: ['stats','energy', machineId, hoursBack]
  // refetchInterval: 5분

export function useOverview()
  // queryKey: ['stats','overview']
  // refetchInterval: 30초

export function useReport(from: string, to: string)
  // queryKey: ['stats','report', from, to]
  // enabled: !!from && !!to
  // staleTime: 10분
```

---

## 4. 페이지 설계

### 4.1 /dashboard 개선 (4-A)

기존 4개 KPI 카드 뒤에 추가:

```
현재: [설비 가동률] [활성 LOT] [작업지시 진행] [점검 필요 설비]
추가: [OEE] — useOee(각 머신 통합 또는 전체 평균)

새 섹션:
┌─────────────────────────────────────┐
│ OEE 히스토리 (7일)  — BarChart      │
│ X: 날짜, Y: OEE%, 색상: 가동률/성능/품질 │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 에너지 소비 (24h)   — LineChart     │
│ X: 시각, Y: kW, machineId 선택      │
└─────────────────────────────────────┘
```

### 4.2 /overview (4-B)

```
헤더: "AI 통합 현황" + 갱신 시각

┌──────────────────────────────────────────┐
│ 요약 배지 (상단)                           │
│ [설비 N대] [CRITICAL M건] [위험 K대] [이탈 J건] │
└──────────────────────────────────────────┘

설비 그리드 (카드형, 2~4열):
┌─────────────────┐  ┌─────────────────┐
│ PRESS-01        │  │ PRESS-02        │
│ 🔴 CRITICAL      │  │ 🟡 WARNING       │
│ 알람 3건         │  │ 알람 1건         │
│ 고장확률 78%     │  │ 이상 감지 중     │
│ RUL 45h         │  │ RUL 정상         │
│ SPC 이탈 2건     │  │ SPC 이탈 0건     │
│ [SPC] [PDM]     │  │ [SPC] [PDM]     │
└─────────────────┘  └─────────────────┘

우측 패널:
┌────────────────────────────────────────┐
│ 최근 알람 피드 (실시간 10건)             │
│ [시각] [설비] [채널] [메시지] [심각도]   │
└────────────────────────────────────────┘

하단:
┌────────────────────────────────────────┐
│ PDM 위험 설비 Top5 (고장확률 내림차순)   │
│ Bar chart — machineCode vs failureProb │
└────────────────────────────────────────┘
```

**riskLevel 색상 매핑:**
```
CRITICAL → border-red-400 bg-red-50
WARNING  → border-amber-400 bg-amber-50
NORMAL   → border-slate-200 bg-white
```

### 4.3 /reports (4-C)

```
기간 선택 폼:
  [시작일 DatePicker] ~ [종료일 DatePicker]  [조회] 버튼
  빠른 선택: [오늘] [이번 주] [이번 달]

조회 결과 집계 카드:
  [총 알람] [CRITICAL] [고위험 설비] [평균 OEE%]

설비별 요약 테이블:
  설비코드 | OEE | 알람수 | 고장위험 | 주요채널

알람 분포 차트 (PieChart): INFO/WARNING/CRITICAL 비율

PDF 다운로드 버튼 → /reports/preview (별도 탭)
```

### 4.4 /reports/preview (4-C)

```
@react-pdf/renderer 컴포넌트:
  - 표지: 회사명, 기간, 생성일
  - 요약: KPI 테이블
  - 설비별 OEE 바차트
  - 알람 집계
  - PDM 예측 요약
  - 비고 (권고 사항 자동 생성)

react-pdf는 dynamic import로 lazy load (번들 최적화)
```

---

## 5. Sidebar 업데이트

```typescript
// packages/ui/src/Sidebar/index.tsx
{ label: '통합 현황',   href: '/overview', icon: LayoutGrid, roles: ['ADMIN','MANAGER','INSPECTOR','VIEWER'] },
{ label: '리포트',      href: '/reports',  icon: FileText,   roles: ['ADMIN','MANAGER'] },
```

SPC 모니터링과 예측정비 AI 사이에 삽입.

---

## 6. 구현 순서 (Do Phase 체크리스트)

### A — 백엔드 (ai-service)

| # | 파일 | 내용 |
|---|------|------|
| A1 | `stats/dto/query-oee.dto.ts` | machineId, from?, to? |
| A2 | `stats/dto/query-oee-history.dto.ts` | machineId, days? |
| A3 | `stats/dto/query-energy.dto.ts` | machineId, hoursBack? |
| A4 | `stats/dto/query-report.dto.ts` | from, to |
| A5 | `stats/stats.controller.ts` | 5개 엔드포인트 |
| A6 | `stats/stats.service.ts` | calcOee, getOeeHistory, getEnergy, getOverview, getReport 메서드 추가 |
| A7 | `stats/stats.module.ts` | DbModule import, StatsController 추가 |

### B — 프론트엔드

| # | 파일 | 내용 |
|---|------|------|
| B1 | `lib/api-client.ts` | statsApi + 타입 5종 추가 |
| B2 | `features/stats/useStats.ts` | 5개 훅 |
| B3 | `app/(app)/dashboard/page.tsx` | OEE 카드 + OEE 히스토리 + 에너지 차트 |
| B4 | `app/(app)/overview/page.tsx` | 설비 그리드 + 알람 피드 + PDM Top5 |
| B5 | `app/(app)/reports/page.tsx` | 기간 선택 + 집계 뷰 |
| B6 | `app/(app)/reports/preview/page.tsx` | PDF 렌더러 (react-pdf dynamic import) |
| B7 | `packages/ui/src/Sidebar/index.tsx` | 통합 현황 + 리포트 메뉴 |

---

## 7. 의존성

```bash
# web 앱에 추가
pnpm add @react-pdf/renderer --filter web
pnpm add @types/react-pdf --filter web -D   # 필요 시
```

`recharts`는 이미 설치되어 있어 추가 설치 불필요.

---

## 8. 보안

| 항목 | 설계 |
|------|------|
| /stats/* 엔드포인트 | JwtAuthGuard + RolesGuard |
| OEE/에너지/overview | VIEWER 이상 |
| report | MANAGER 이상 |
| PDF 다운로드 | 클라이언트 사이드 생성 (서버 저장 없음) |

---

## 9. 비기능

| 항목 | 목표 | 구현 |
|------|------|------|
| /overview 응답 | ≤ 2s | Promise.all 병렬, TimescaleDB 집계 |
| PDF 생성 | ≤ 5s | dynamic import + react-pdf 클라이언트 렌더 |
| 데이터 신선도 | 30s | useOverview refetchInterval |
| OEE fallback | WorkOrder 없을 때 가동률 단일 표시 | woCount=0 조건 분기 |
