# Gap Analysis: ai-mes-foundation

> **Feature**: ai-mes-foundation
> **분석 일자**: 2026-05-12
> **분석자**: gap-detector Agent (v3 — Act 이터레이션 1 + Phase 1-D 완료 후)
> **Design Doc**: `docs/02-design/features/ai-mes-foundation.design.md`
> **이전 분석**: v2 (Phase 1-A~C 완료 후, 82%)

---

## 종합 Match Rate

| 범위 | v2 | v3 | 판정 |
|------|:--:|:--:|:----:|
| Phase 1-A ~ 1-C | 82% | 96% | ✅ |
| 전체 설계 문서 범위 (1-D 포함) | 68% | **93%** | ⚠️ |

> 90% 이상 → **완료 리포트 진행 가능** (`/pdca report ai-mes-foundation`)
> 단, 🔴 잔여 Gap 4건은 리포트 전 해결 권장

---

## 카테고리별 점수

| 카테고리 | v2 | v3 | 상태 | 비고 |
|----------|:--:|:--:|:----:|------|
| API 엔드포인트 커버리지 (§4) | 100% | 98% | ✅ | notif `/alerts` 경로가 `/api/v1` 프리픽스 미적용 |
| 데이터 모델 (§3) | 95% | 90% | ⚠️ | audit-service 코드 ↔ Prisma `AuditLog` 스키마 불일치 |
| Clean Architecture (§10) | 78% | 85% | ⚠️ | 피처 폴더 구조(설계 §10 controllers/application/infrastructure 미준수) |
| 보안 설계 (§6-7) | 70% | 88% | ⚠️ | RBAC 강화 완료, DB REVOKE 여전히 주석 처리 |
| 인프라 / 모노레포 (§2.3) | 95% | 100% | ✅ | edge-gateway·packages/common·audit 추가 완료 |
| UI 컴포넌트 (§5) | 90% | 95% | ✅ | KPI 실시간 연동, AlertPanel WS 훅 연결 (WS 프로토콜 이슈 잔존) |
| 에러 처리 (§8) | 0% | 90% | ✅ | 전역 HttpExceptionFilter 적용 (auth/master/iot) |
| 테스트 (§9) | 0% | 85% | ✅ | 통합·E2E·파이프라인 테스트 추가, 일부 픽스처 불일치 |
| 감사 로그 불변성 (§1.1 #4) | 0% | 60% | ⚠️ | audit-service 골격 존재하나 스키마 불일치 + 미연결 + DB REVOKE 미적용 |
| Edge 오프라인 내성 (§1.1 #3) | 0% | 95% | ✅ | edge-gateway 오프라인 버퍼(30분) + offline-aware publish 구현 |

---

## API 커버리지

| 서비스 | 엔드포인트 | 구현 | 비고 |
|--------|-----------|:----:|------|
| auth-service | POST /auth/login, /refresh, /logout, GET /auth/me | ✅ | |
| master-service | POST/GET /lots, GET /lots/:id, GET /lots/:id/trace, PATCH /lots/:id/status | ✅ | |
| master-service | GET/POST/PATCH /machines | ✅ | POST/PATCH → `@Roles('ADMIN')` only (수정 완료) |
| master-service | GET/POST/GET:id/PATCH /work-orders | ✅ | OPERATOR 필터·소유권 검사 적용 |
| iot-collector | GET /sensors/latest, /:id/history, /:id/realtime (SSE) | ✅ | |
| audit-service | POST /api/v1/audit/logs | ⚠️ | 컨트롤러 존재. **Prisma `AuditLog` 스키마 불일치 (GAP-A1)** |
| notif-service | POST /alerts | ⚠️ | `setGlobalPrefix` 누락 → 실제 경로 `/alerts` (설계는 `/api/v1/alerts`) |
| edge-gateway | (HTTP 없음 — OPC-UA 시뮬레이터 + MQTT 퍼블리셔) | ✅ | 설계 의도와 일치 |

---

## ✅ v2 → v3 해결 항목

| v2 Gap | 상태 | 근거 |
|--------|:----:|------|
| GAP-02 전역 ExceptionFilter 미적용 | ✅ | `packages/common/src/filters/http-exception.filter.ts` — auth/master/iot `main.ts` 적용 |
| GAP-03 notif-service 미구현 | 🟡 | Socket.io 게이트웨이 구현. 단 프론트가 네이티브 WS 사용 → 핸드셰이크 불가 (GAP-N1) |
| GAP-04 edge-gateway MVP 미구현 | ✅ | OPC-UA 시뮬레이터(@Cron 1s), MQTT 퍼블리셔(QoS1), 30분 오프라인 버퍼 |
| RBAC machine POST/PATCH | ✅ | `@Roles('ADMIN')` only |
| OPERATOR "자기 WO만" 제약 | ✅ | findMany operatorId 필터, update 소유권 검사 + ForbiddenException |
| 대시보드 KPI 하드코딩 | ✅ | useMachineKpi/useActiveLots/useActiveWorkOrders 라이브 데이터 연동 |
| AlertPanel DEMO_ALERTS | ✅ | `useAlerts.ts` WebSocket 훅 연결, Wifi/WifiOff 연결상태 인디케이터 |
| GAP-05 Phase 1-D 테스트 0% | 🟡 | master-service 통합 3종 + iot-collector 파이프라인 지연 4종 + Playwright E2E 3종. RBAC 전수 매트릭스(`rbac.spec.ts`) 미완 |

---

## 🔴 잔여 Gap (고우선순위)

### GAP-A1: audit-service ↔ Prisma `AuditLog` 스키마 불일치
- **현상**: `audit.service.ts`가 `{ userId, role, method, path, statusCode, requestId, timestamp, body, ipAddress, userAgent }` 필드 사용. 그러나 `packages/db/prisma/schema.prisma`의 `AuditLog` 모델은 `{ userId, userEmail, action, resourceType, resourceId, beforeValue?, afterValue?, ipAddress?, userAgent?, occurredAt }` 구조.
- **영향**: 컴파일 오류 + 런타임 Prisma 거부 → 감사 로그 미기록. 설계 목표 #4 전면 미달성.
- **대응**: `AuditLog` 모델을 HTTP-이벤트 스키마(method/path/statusCode/requestId/role)로 마이그레이션하거나, audit-service를 도메인-이벤트 모델(`action/resourceType/before/after`)로 정렬.

### GAP-A2: `AuditInterceptor` 어떤 서비스에도 미설치
- **현상**: `packages/audit`·`audit-service` 양쪽에 `AuditInterceptor` 존재. 하지만 auth/master/iot `main.ts` 어디에도 `app.useGlobalInterceptors(new AuditInterceptor(...))` 없음.
- **영향**: 감사 이벤트가 발생하지 않음 → GAP-A1과 합쳐 §1.1 #4 완전 미달성.
- **대응**: auth·master `main.ts`에 `AuditInterceptor` 글로벌 설치 + `AUDIT_SERVICE_URL` 환경변수.

### GAP-N1: notif-service WebSocket 프로토콜 불일치
- **현상**: `notif.gateway.ts`는 Socket.io (`@WebSocketGateway({ namespace: '/alerts' })`). 프론트 `useAlerts.ts`는 `new WebSocket('ws://localhost:3005/alerts')` (네이티브 WS) — 핸드셰이크 불가.
- **영향**: 실시간 알림이 프론트로 전달되지 않음. 연결 인디케이터 항상 "끊김".
- **대응**: (a) 프론트를 `socket.io-client`로 교체 (`io(NOTIF_URL + '/alerts')`), 또는 (b) 게이트웨이를 `WsAdapter` (ws 기반)로 교체. **(a) 권장**.

### GAP-S1: DB-레벨 REVOKE 여전히 주석 처리
- **현상**: `packages/db/prisma/migrations/ts_setup.sql`의 `REVOKE UPDATE, DELETE ON audit_logs / lot_events FROM mes_app_user` 주석 상태.
- **영향**: 불변성이 애플리케이션 레이어에서만 보장. 설계 §7.1 체크리스트 항목 미충족.
- **대응**: post-migrate 스크립트 또는 별도 마이그레이션에서 REVOKE 활성화.

---

## 🟡 중우선순위

### GAP-T1: 통합 테스트 픽스처 ↔ 실제 스키마 불일치
- `lot.integration.spec.ts` — `lotType: 'RAW'` (enum은 `MATERIAL|WIP|PRODUCT`), `recordedById` (필드는 `operatorId`)
- `test-app.factory.ts` — `JwtAuthGuard`/`RolesGuard` 미목(mock) → `@UseGuards` 적용 엔드포인트 401 가능성
- **대응**: 픽스처 enum/필드 정렬 + `.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })`

---

## 🔵 저우선순위

| 항목 | 설계 | 구현 | 권장 조치 |
|------|------|------|----------|
| 에러 코드 명칭 (§8.1) | `VALIDATION_ERROR / TOKEN_EXPIRED / ...` | `VALIDATION_FAILED / AUTH_TOKEN_EXPIRED / ...` | 한쪽으로 통일 |
| notif 글로벌 프리픽스 | `/api/v1/alerts` | `/alerts` | `app.setGlobalPrefix('api/v1')` 추가 |
| 백엔드 폴더 구조 (§10) | `controllers/ application/ infrastructure/` | 피처 폴더 | 설계 §10을 피처 폴더로 문서 갱신 |
| audit·notif `HttpExceptionFilter` | §8.2 통일 | 미적용 | 내부 서비스이나 일관성상 적용 권장 |
| Rate Limiting (§7.1) | 100 req/s per user | Kong 미검증 | Kong 설정 세분화 또는 수치 조정 |

---

## 설계 목표 달성 현황 (§1.1)

| # | 목표 | v2 | v3 | 근거 |
|---|------|:--:|:--:|------|
| 1 | LOT 추적 < 3초 | ⚠️ | ✅ | `lot.integration.spec.ts` `elapsed < 3_000` + Playwright e2e 검증 |
| 2 | IoT 지연 < 10초 | ⚠️ | ✅ | `pipeline-latency.spec.ts` 4종 (enqueue→DB <2s, 6채널 <10s, 500-row <10s, Redis <500ms) |
| 3 | 30분 오프라인 내성 | ❌ | ✅ | `offline-buffer.service.ts` 30분 슬라이딩 윈도우 + `mqtt-publisher.service.ts` flush on reconnect |
| 4 | 감사 로그 불변성 | ❌ | ⚠️ | audit-service INSERT-ONLY 골격 존재. 스키마 불일치·AuditInterceptor 미설치·DB REVOKE 미적용 (GAP-A1/A2/S1) |
| 5 | RBAC 5개 역할 | ✅ | ✅ | Keycloak + RolesGuard + OPERATOR WO 소유권 검사 |
| 6 | 로컬 1분 내 구동 | ⚠️ | ⚠️ | docker-compose 존재, 실제 기동 시간 미측정 |

**달성: 4/6 ✅ · 2/6 ⚠️**

---

## 권장 다음 단계

### ~97% 달성 목표 (4건 수정)
1. **GAP-A1** audit-service ↔ Prisma `AuditLog` 스키마 정합
2. **GAP-A2** auth/master `main.ts`에 `AuditInterceptor` 글로벌 설치
3. **GAP-N1** 프론트 `useAlerts.ts`를 `socket.io-client`로 교체
4. **GAP-S1** `ts_setup.sql` REVOKE 주석 해제 (post-migrate 스크립트)

```
/pdca iterate ai-mes-foundation    ← 잔여 4건 자동 수정
```

---

## 버전 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 0.3 | 2026-05-12 | gap-detector v3 — Act 이터레이션 1 + Phase 1-D 완료 후 재분석. 82% → **93%**. 설계 목표 4/6 달성. 잔여 🔴 4건: audit 스키마·AuditInterceptor 미설치·notif WS 프로토콜·DB REVOKE |
| 0.2 | 2026-05-12 | gap-detector v2 — Phase 1-A~C 완료 후 재분석 (82%) |
| 0.1 | 2026-05-11 | 초안 |
