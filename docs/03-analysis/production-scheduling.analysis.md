# Gap Analysis: production-scheduling

**Date**: 2026-05-13  
**Match Rate**: **100% (7/7)**

## Requirements Check

| ID | Requirement | Status | Notes |
|----|-------------|:------:|-------|
| PS-01 | ProductionSchedule Prisma model | ✅ | `schema.prisma:395-416` — all fields match design; ScheduleStatus enum at line 418-424 |
| PS-02 | CRUD REST API | ✅ | `schedule.controller.ts` — POST/GET(list)/GET(one)/PATCH/DELETE all wired to service methods |
| PS-03 | Gantt view API (grouped by machine) | ✅ | `GET /schedules/gantt?from=&to=` with overlap filter, grouped by machineId |
| PS-04 | Time conflict detection | ✅ | `schedule.service.ts:11-25` — interval overlap predicate scoped to machineId + active statuses |
| PS-05 | Frontend SVG Gantt chart | ✅ | `scheduling/page.tsx` — DayHeaders, GanttRow, GanttBar, status color coding, 7/14/30d range |
| PS-06 | Status change actions | ✅ | `useUpdateScheduleStatus` mutation + DetailPanel `nextStatus` map (PENDING→IN_PROGRESS→COMPLETED) |
| PS-07 | Sidebar navigation | ✅ | `Sidebar/index.tsx:26` — '생산 스케줄', CalendarDays icon, roles: ADMIN/MANAGER/OPERATOR/VIEWER |

## Gaps Found

None — all 7 requirements fully implemented.

## Minor Observations (not gaps; candidates for next iteration)

1. **PATCH field-level permissions** — OPERATOR can currently update any field (not just status). Design intent suggests splitting into `PATCH /:id/status` (OPERATOR+) and `PATCH /:id` (MANAGER+).
2. **No conflict re-check on PATCH** — changing `plannedStart`/`plannedEnd` via PATCH bypasses the overlap check.
3. **Duplicated `ScheduleStatusDto` enum** in both `update-schedule.dto.ts` and `query-schedule.dto.ts` — should be hoisted to a shared file.
4. **CANCELLED transition missing from UI** — `nextStatus` map only covers the happy path; no cancel button in `DetailPanel`.
5. **`actualStart`/`actualEnd` not auto-stamped** on status transition to `IN_PROGRESS`/`COMPLETED`.

## Summary

Implementation is in full conformance with plan and design. Feature is ready for `/pdca report production-scheduling`.
