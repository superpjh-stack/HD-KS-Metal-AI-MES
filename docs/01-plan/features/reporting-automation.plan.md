# Plan: reporting-automation (리포팅 자동화)

> PDCA Phase: Plan | Date: 2026-05-13

## 1. Feature Overview

일/주/월간 생산 실적 PDF 리포트 자동 생성 시스템. KPI, OEE, 알람, PDM 위험, SPC 이탈을 포함한 인쇄용 PDF를 온디맨드 및 스케줄 기반으로 생성한다.

## 2. Requirements

| ID | 요구사항 | 우선순위 |
|-----|---------|---------|
| RPT-01 | 날짜 범위 기반 PDF 생성 (일/주/월 프리셋) | Must |
| RPT-02 | PDF 구성: 표지, KPI 테이블, OEE 차트, 알람 분포, PDM 위험 매트릭스, SPC | Must |
| RPT-03 | 자동 스케줄: 일간 06:00, 주간 월 07:00, 월간 1일 08:00 (KST) | Must |
| RPT-04 | GET /api/v1/reports/generate?from=&to=&format=pdf | Must |
| RPT-05 | GET /api/v1/reports — 최근 30개 생성 이력 | Must |
| RPT-06 | 프론트엔드 /reports — 온디맨드 + 이력 목록 + 다운로드 버튼 | Must |
| RPT-07 | MANAGER 이상 생성 권한; VIEWER 이력 조회 허용 | Must |

## 3. Technical Decisions

| 항목 | 결정 |
|-----|------|
| PDF 라이브러리 | pdfkit (경량, 스트림 → 버퍼, canvas 불필요) |
| 차트 | pdfkit 프리미티브 (직사각형 바 차트) |
| 이력 저장 | ReportRecord Prisma 모델 (PDF 파일 미저장, 온디맨드 재생성) |
| 배치 위치 | apps/ai-service ReportModule (신규 서비스 불필요) |
| 스케줄러 | @nestjs/schedule @Cron (이미 AppModule에 포함) |

## 4. Scope

### In Scope
- ReportModule (apps/ai-service)
- ReportRecord Prisma 모델
- 프론트엔드 /reports, /reports/preview 페이지 강화

### Out of Scope
- PDF 파일 S3 저장
- 이메일 발송
- 다국어 PDF
