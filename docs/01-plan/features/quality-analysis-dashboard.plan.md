# Plan: 품질 분석 대시보드 (quality-analysis-dashboard)

**작성일**: 2026-05-13  
**레벨**: Dynamic  
**우선순위**: Phase 5

## 목표

SPC (통계적 공정관리) 데이터를 기반으로 설비별 공정능력(Cpk)을 시각화하고,  
알람 이탈 추이를 대시보드에서 실시간으로 모니터링할 수 있도록 한다.

## 요구사항

| ID    | 요구사항                                  | 우선순위 |
|-------|-------------------------------------------|---------|
| QD-01 | KPI 카드: 총알람, CRITICAL, SPC이탈, 평균Cpk | P0      |
| QD-02 | 날짜 범위 선택 (7일/30일/90일)             | P0      |
| QD-03 | 일별 알람 추이 LineChart                   | P0      |
| QD-04 | 설비별 Cp/Cpk 테이블 (상태 color badge)    | P0      |
| QD-05 | 설비 drill-down → 채널별 Cpk 추이 차트     | P1      |
| QD-06 | SPC 이탈 raw 결과 테이블 (최근 100건)      | P1      |

## 데이터 모델

- 기존 `SpcResult` 테이블 활용 (ai-service)
- 기존 `AlarmEvent` 테이블 활용 (ai-service)
- 신규 API 엔드포인트: `/api/v1/stats/quality-summary`, `/api/v1/stats/defect-trend`

## 기술 스택

- Backend: `ai-service` NestJS (기존 stats.service.ts 확장)
- Frontend: Next.js App Router, Recharts, TanStack Query
- 경로: `/quality`, `/quality/[machineId]`
