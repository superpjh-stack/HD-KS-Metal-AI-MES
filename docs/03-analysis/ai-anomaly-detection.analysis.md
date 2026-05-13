# Gap Analysis — ai-anomaly-detection
**Version**: v3 (Phase 2-D complete)
**Date**: 2026-05-12
**Analyzer**: bkit:gap-detector

---

## Match Rate: 97%

> G1 (CapabilityStatus enum) and G3 (role guards) fixed immediately after v3 analysis.
> G2 and G4 are accepted minor gaps — documented as known limitations.

---

## Backend: 23/23 ✅

| # | Requirement | File | Status |
|---|-------------|------|--------|
| B1 | AlarmRule CRUD service | `alarm/alarm.service.ts` | ✅ |
| B2 | AlarmEvent create/get/acknowledge/getSummary | `alarm/alarm.service.ts` | ✅ |
| B3 | AlarmRuleController GET (MANAGER/ADMIN), POST (ADMIN), PATCH, DELETE | `alarm/alarm.controller.ts` | ✅ |
| B4 | AlarmEventController GET / summary (VIEWER+), acknowledge (OPERATOR+) | `alarm/alarm.controller.ts` | ✅ fixed G3 |
| B5 | threshold.consumer subscribes `ks-mes:sensor:new-data` | `threshold/threshold.consumer.ts` | ✅ |
| B6 | In-process rule cache 5-min TTL | `threshold/threshold.consumer.ts` | ✅ |
| B7 | Publishes `ks-mes:alerts` | `threshold/threshold.consumer.ts` | ✅ |
| B8 | stats.service SIGMA `|value-mean| > N·σ` | `stats/stats.service.ts` | ✅ |
| B9 | stats.scheduler 5-min `@Cron('0 */5 * * * *')` | `stats/stats.scheduler.ts` | ✅ |
| B10 | SPC A2/D3/D4 constants ISO 8258 n=2..10 | `spc/spc.service.ts` | ✅ |
| B11 | buildChartData nested `limits` + `points[].range` | `spc/spc.service.ts` | ✅ |
| B12 | computeCapability one-sided Cp/Cpk | `spc/spc.service.ts` | ✅ |
| B13 | getCapabilityForMachine per-channel with status | `spc/spc.service.ts` | ✅ |
| B14 | upsertParameter / getParameterOrDefault | `spc/spc.service.ts` | ✅ |
| B15 | spc.scheduler 1-min `@Cron('0 * * * * *')` + WE detection | `spc/spc.scheduler.ts` | ✅ |
| B16 | SPC window = sampleSize × sampleCount minutes | `spc/spc.scheduler.ts` | ✅ |
| B17 | GET /spc/chart | `spc/spc.controller.ts` | ✅ |
| B18 | GET /spc/capability | `spc/spc.controller.ts` | ✅ |
| B19 | GET /spc/violations (WESTERN_ELECTRIC filter) | `spc/spc.controller.ts` | ✅ |
| B20 | POST/PUT /spc/parameters (MANAGER/ADMIN) | `spc/spc.controller.ts` | ✅ |
| B21 | detectWesternElectric() Rules 1–4 | `spc/western-electric.ts` | ✅ |
| B22 | alarm.integration.spec.ts (8+ test cases) | `test/integration/` | ✅ 11 cases |
| B23 | test-app.factory createTestApp/resetDatabase/seedMachine | `test/integration/` | ✅ |

## Frontend: 12/12 ✅

| # | Requirement | File | Status |
|---|-------------|------|--------|
| F1 | /spc list page (machine list + alarm summary) | `app/(app)/spc/page.tsx` | ✅ |
| F2 | /spc/[machineId] detail (XbarChart, RangeChart, CapabilityTable, filters) | `app/(app)/spc/[machineId]/page.tsx` | ✅ |
| F3 | /alarms history (machine + severity filters) | `app/(app)/alarms/page.tsx` | ✅ |
| F4 | /alarms/active (unacknowledged + summary cards) | `app/(app)/alarms/active/page.tsx` | ✅ |
| F5 | useSpcChart → GET /spc/chart (60s refetch) | `features/spc/useSpcChart.ts` | ✅ |
| F6 | useCapability → GET /spc/capability | `features/spc/useCapability.ts` | ✅ |
| F7 | useAlarmEvents / useAlarmSummary / useAcknowledge | `features/alarms/useAlarmEvents.ts` | ✅ |
| F8 | alarmApi / spcApi types in api-client | `lib/api-client.ts` | ✅ fixed G1 |
| F9 | SpcXbarChart + SpcRangeChart (Recharts + UCL/CL/LCL) | `packages/ui/src/SpcChart.tsx` | ✅ |
| F10 | CapabilityTable (Cp/Cpk + status badges incl. INSUFFICIENT_DATA) | `packages/ui/src/CapabilityTable.tsx` | ✅ fixed G1 |
| F11 | AlarmList (severity icons + acknowledge button) | `packages/ui/src/AlarmList.tsx` | ✅ |
| F12 | Sidebar SPC + Alarm nav links | `packages/ui/src/Sidebar/index.tsx` | ✅ |

---

## Accepted Known Limitations

| ID | Description | Impact | Disposition |
|----|-------------|--------|-------------|
| G2 | Alarm history uses `useQuery` (no infinite scroll); capped at backend `take: 500` | Low — sufficient for initial release | Backlog |
| G4 | `/alarms/active` summary cards display raw `machineId` (cuid) instead of `machineCode` | Cosmetic — operator unfriendly | Backlog |

---

## Analysis History

| Version | Date | Match Rate | Phase |
|---------|------|------------|-------|
| v1 | 2026-05-12 | 73% | After Phase 2-A+2-B |
| v2 | 2026-05-12 | 90% | After Phase 2-C |
| v3 | 2026-05-12 | 97% | After Phase 2-D + G1/G3 fixes |
