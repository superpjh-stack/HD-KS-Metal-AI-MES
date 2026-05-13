# Gap Analysis — integrated-dashboard

> **Date**: 2026-05-12  
> **Feature**: integrated-dashboard (Phase 4)  
> **Match Rate**: 93%  
> **Status**: PASS (≥ 90%)

---

## Summary

All 14 implementation files (7 backend A1–A7, 7 frontend B1–B7) exist and are functionally correct. API response shapes, types, OEE calculation logic, security guards/roles, riskLevel color mapping, stats hooks, and Sidebar entries all match the design.

**One material deviation (G1):** Design §4.4 specified `@react-pdf/renderer` with dynamic import; the actual implementation uses browser-native `window.print()` with print-CSS-styled HTML. The package is not installed. This is a valid pragmatic alternative (no extra bundle, no SSR issues), but it deviates from the spec. The auto-generated "권고 사항 (비고)" section from §4.4 is also absent.

Three minor deviations: missing standalone OEE KpiCard on /dashboard (G5), alarm feed shows 8 items not 10 (G4), and pdmAnomalyScore "이상 감지 중" badge absent from machine card (G7).

---

## Gaps Found

| ID | Area | Design Spec | Actual | Severity | Fix |
|----|------|-------------|--------|----------|-----|
| G1 | B6 — /reports/preview (§4.4, §7) | `@react-pdf/renderer` with `dynamic import`; cover/summary/OEE chart/alarm agg/PDM/auto-generated 권고 사항 | `window.print()` on print-CSS HTML; 5 sections without react-pdf or auto-generated 권고 사항 | MED | Update design §4.4+§7 to document print approach, OR install `@react-pdf/renderer` and rebuild |
| G2 | A7 — stats.module.ts (§2.4) | `imports: [AlarmModule, DbModule]` (explicit DbModule) | `imports: [AlarmModule]` only | LOW | No action needed — DbModule is @Global(); optionally add explicit import for clarity |
| G3 | A7 — stats.module.ts (§2.4) | Design snippet listed `StatsController` in `providers` | `providers: [StatsService, StatsScheduler]`, `controllers: [StatsController]` | LOW | Fix design snippet — actual is correct NestJS pattern |
| G4 | §4.2 /overview alarm feed | "실시간 10건" with [시각][설비][채널][메시지][심각도] | `.slice(0, 8)` — 8 items; no 설비(machine) column | LOW | Change `.slice(0, 8)` → `.slice(0, 10)`, add machine column |
| G5 | §4.1 /dashboard OEE KPI card | 5th KpiCard "[OEE]" fed by `useOee` | `useOee` hook exists but unused; only history BarChart shows OEE | MED | Add `<KpiCard title="OEE" .../>` using `useOee(firstMachineId)`, or drop from design |
| G6 | §4.1 /dashboard OEE chart | "색상: 가동률/성능/품질" — A/P/Q breakdown per bar | Total OEE% per day only; bars colored by index | LOW | Add A/P/Q stacked bars, or simplify design text |
| G7 | §4.2 /overview machine card | "이상 감지 중" label when pdmAnomalyScore anomaly | failureProb + RUL shown; no anomaly badge tied to pdmAnomalyScore | LOW | Add anomaly badge, or accept as cosmetic |

---

## Matched Items

### Backend (ai-service) — A1-A7

| Check | File | Status |
|-------|------|--------|
| A1 | `stats/dto/query-oee.dto.ts` | ✅ machineId, from?, to? with @IsISO8601 |
| A2 | `stats/dto/query-oee-history.dto.ts` | ✅ machineId, days=7 with @Transform parseInt |
| A3 | `stats/dto/query-energy.dto.ts` | ✅ machineId, hoursBack=24 with @Transform |
| A4 | `stats/dto/query-report.dto.ts` | ✅ from, to required @IsISO8601 |
| A5 | `stats/stats.controller.ts` | ✅ 5 endpoints, @UseGuards(Jwt+Roles), correct @Roles per §8 |
| A6 | `stats/stats.service.ts` | ✅ calcOee/getOeeHistory/getEnergy/getOverview/getReport, OEE formula, fallback, Promise.all |
| A7 | `stats/stats.module.ts` | ✅ StatsController in controllers[], StatsService exported (G2/G3 cosmetic) |

All API response interfaces (OeeResult, OeeHistoryItem, EnergyPoint, OverviewItem, ReportData) match §2.3 field-for-field.

### Frontend (web) — B1-B7

| Check | File | Status |
|-------|------|--------|
| B1 | `lib/api-client.ts` | ✅ statsApi + 5 types, all 5 methods correct |
| B2 | `features/stats/useStats.ts` | ✅ 5 hooks, exact queryKeys/staleTime/refetchInterval |
| B3 | `app/(app)/dashboard/page.tsx` | ✅ OEE history BarChart + energy LineChart (G5/G6 minor) |
| B4 | `app/(app)/overview/page.tsx` | ✅ summary badges, machine grid, RISK_BORDER exact match §4.2, PDM Top5 |
| B5 | `app/(app)/reports/page.tsx` | ✅ date picker, quick ranges, KPI cards, PieChart, table, PDF link |
| B6 | `app/(app)/reports/preview/page.tsx` | ⚠️ Exists, all 5 report sections present, but window.print() not react-pdf (G1) |
| B7 | `packages/ui/src/Sidebar/index.tsx` | ✅ 통합 현황 (LayoutGrid) + 리포트 (FileText), correct roles |

Security alignment: JwtAuthGuard + RolesGuard at controller level; VIEWER+ for OEE/energy/overview; MANAGER+ for report — **exact match §8**.

---

## Match Rate Calculation

- Backend (A1-A7): 7/7 present, all functionally correct → ~98% (G2/G3 cosmetic) → **39/40 pts**
- Frontend (B1-B7): 7/7 present; B6 mechanism differs (G1 MED), B3 missing OEE card (G5 MED) → **34/40 pts**
- API schemas + security: all correct → **20/20 pts**

**Overall: 93%** — PASS (≥ 90% threshold met)

---

## Recommended Actions

### Design document updates (no code changes needed)
1. **§4.4 + §7** — replace `@react-pdf/renderer` / `dynamic import` with `window.print()` + print-CSS description; remove `pnpm add @react-pdf/renderer` step
2. **§2.4 snippet** — remove `DbModule` explicit import (it's @Global); move `StatsController` from `providers` to `controllers` in snippet
3. **§5 sidebar** — update to actual positions + note OPERATOR inclusion for 통합 현황

### Optional code improvements (non-blocking)
4. Add standalone OEE `<KpiCard>` to `/dashboard` using `useOee(firstMachineId)` (G5)
5. `/overview` alarm feed: `.slice(0, 8)` → `.slice(0, 10)` + add machine column (G4)
6. `/overview` machine card: add `pdmAnomalyScore` "이상 감지 중" anomaly badge (G7)
