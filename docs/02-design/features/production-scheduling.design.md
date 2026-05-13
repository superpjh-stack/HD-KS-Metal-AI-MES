# Design: 생산 스케줄링

**작성일**: 2026-05-13

## 데이터 모델

```prisma
model ProductionSchedule {
  id           String         @id @default(cuid())
  scheduleNo   String         @unique  // "SCH-{timestamp}"
  workOrderId  String?
  machineId    String
  productCode  String
  plannedQty   Int
  plannedStart DateTime
  plannedEnd   DateTime
  actualStart  DateTime?
  actualEnd    DateTime?
  status       ScheduleStatus @default(PENDING)
  priority     Int            @default(5)  // 1(high) – 10(low)
  notes        String?
  createdById  String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

enum ScheduleStatus {
  PENDING | IN_PROGRESS | COMPLETED | CANCELLED | ON_HOLD
}
```

## API 설계 (scheduling-service, port 3008)

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| GET | /api/v1/schedules | ALL | 목록 조회 (machineId/status/from/to 필터) |
| GET | /api/v1/schedules/gantt | ALL | Gantt 뷰 (기간별 설비 그룹) |
| GET | /api/v1/schedules/:id | ALL | 단건 조회 |
| POST | /api/v1/schedules | MANAGER+ | 생성 (시간 충돌 검사) |
| PATCH | /api/v1/schedules/:id | OPERATOR+ | 상태/시간 업데이트 |
| DELETE | /api/v1/schedules/:id | ADMIN | 삭제 |

## 프론트엔드

```
/scheduling/page.tsx
  - DayHeaders (날짜 헤더 SVG)
  - GanttRow x N (설비행, 바 차트 SVG)
  - DetailPanel (슬라이드오버: 상태변경 버튼)
  - RANGE_OPTIONS: 7d/14d/30d
```

## 상태 전이

```
PENDING → IN_PROGRESS → COMPLETED
                      ↘ ON_HOLD → IN_PROGRESS
PENDING → CANCELLED
```
