# ai-mes-foundation Plan Document

> **Summary**: 광성정밀 AI-MES 시스템의 기반 인프라, 공통 도메인 모델, IoT 파이프라인, 인증체계를 수립한다.
>
> **Project**: 광성정밀 AI-MES
> **Author**: PM-Core / CTO Lead
> **Date**: 2026-05-11
> **Status**: Approved
> **Phase**: Foundation (Phase 1, 2026.07 ~ 2026.08)

---

## 1. 목적 (Purpose)

`ai-mes-foundation`은 전체 MES 시스템의 **기반이 되는 공통 레이어**이다.
이 Feature 없이는 입고/공정/출하/AI 등 어떤 상위 기능도 구현할 수 없다.

구체적으로:
- 데이터베이스 스키마 (PostgreSQL + TimescaleDB)
- 인증/인가 체계 (Keycloak + JWT)
- IoT 수집 파이프라인 기초 (MQTT → Edge → Cloud)
- 공통 도메인 모델 (LOT, Material, Machine, WorkOrder, User, AuditLog)
- 프론트엔드 기반 (Next.js + 인증 연동 + 공통 컴포넌트)
- 백엔드 API 기반 (NestJS 모노레포 + API Gateway)
- 개발 환경 (Docker Compose, CI/CD 기초)

---

## 2. 사용자 스토리 (User Stories)

**US-F-01** (IT 관리자):
> "시스템에 처음 접속하면 회사 Active Directory 계정으로 로그인되어야 하고, 부서별로 볼 수 있는 메뉴가 달라야 한다."

**US-F-02** (개발팀):
> "프레스 PLC 데이터가 1초마다 MQTT로 들어오면 TimescaleDB에 저장되고, 10초 이내에 대시보드 차트에 반영되어야 한다."

**US-F-03** (품질팀):
> "LOT 번호 하나만 알면 그 LOT의 입고→공정→출하 전 이력을 30초 안에 한 화면에서 볼 수 있어야 한다."

**US-F-04** (보안/감사):
> "누가 언제 어떤 데이터를 변경했는지 기록이 남아야 하고, 그 기록은 삭제할 수 없어야 한다."

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] Keycloak으로 AD/LDAP 연동 로그인 가능
- [ ] 역할별(관리자/작업자/품질/보전/조회전용) 메뉴 분리
- [ ] MQTT → Edge Buffer → TimescaleDB 파이프라인 E2E 동작 (1초 샘플링)
- [ ] LOT 추적 API 응답 3초 이내
- [ ] 모든 쓰기 작업에 AuditLog 자동 생성
- [ ] Docker Compose 단일 명령으로 전체 로컬 환경 구동
- [ ] Next.js 앱 로그인 → 대시보드 기본 레이아웃 표시

---

## 4. 우선순위: Must Have (M)

모든 상위 Feature가 이 Foundation에 의존하므로 전체 Must Have.

---

## 5. 의존성

- 이전 Feature: 없음 (최초 Feature)
- 이후 Feature 차단: inbound-management, press-process, shipment, ai-dashboard 전부
