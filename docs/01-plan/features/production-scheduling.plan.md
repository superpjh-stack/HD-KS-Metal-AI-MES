# Plan: 생산 스케줄링 (production-scheduling)

**작성일**: 2026-05-13  
**레벨**: Dynamic  
**우선순위**: Phase 5

## 목표

설비별 생산 스케줄을 Gantt 차트로 시각화하여 생산계획 수립/조회와  
실시간 진행 상태 변경을 지원한다.

## 요구사항

| ID    | 요구사항                                    | 우선순위 |
|-------|--------------------------------------------|---------|
| PS-01 | ProductionSchedule Prisma 모델              | P0      |
| PS-02 | CRUD REST API (스케줄 생성/조회/수정/삭제)   | P0      |
| PS-03 | Gantt 뷰 API: 기간+설비별 그룹 조회          | P0      |
| PS-04 | 시간 충돌 검사 (같은 설비 겹치는 일정 거부)   | P0      |
| PS-05 | 프론트 Gantt 차트 (SVG, 설비행×날짜열)       | P1      |
| PS-06 | 상태 변경 액션 (PENDING→IN_PROGRESS→COMPLETED) | P1   |
| PS-07 | 사이드바 네비게이션 등록                      | P1      |

## 기술 스택

- Backend: 신규 `apps/scheduling-service` NestJS (port 3008)
- Prisma: `ProductionSchedule` 모델, `ScheduleStatus` enum
- Frontend: `/scheduling` 페이지, SVG Gantt, TanStack Query
- Auth: Keycloak JWT (MANAGER+ 생성, OPERATOR 상태변경, ADMIN 삭제)
