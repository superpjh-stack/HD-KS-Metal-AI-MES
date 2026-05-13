# tech-debt-cleanup 완료 보고서

> **Date**: 2026-05-13
> **Status**: ✅ Completed
> **Scope**: ai-mes-foundation 완료 보고서에서 확인된 잔여 기술 부채 4개 항목

---

## 수정 내역

### TD-01: 통합 테스트 픽스처 enum 정렬 ✅

**파일**: `apps/master-service/test/integration/lot.integration.spec.ts`

**문제**: `LotType` enum이 `MATERIAL | WIP | PRODUCT`로 정의되어 있으나 테스트 픽스처에서 존재하지 않는 값인 `'RAW'`를 9곳에서 사용 → 통합 테스트 실행 시 DB constraint 오류

**수정**: 전체 파일에서 `lotType: 'RAW'` → `lotType: 'MATERIAL'` 일괄 교체 (9건)

---

### TD-02: auth-service RBAC 매트릭스 테스트 추가 ✅

**파일 생성**: `apps/auth-service/test/rbac.spec.ts`

**내용**: `RolesGuard`와 `JwtAuthGuard.handleRequest`에 대한 unit test 11개
- ADMIN: admin-only + manager-level 접근 허용
- MANAGER: manager+ 허용, admin-only 차단
- OPERATOR: operator-level 허용, manager/admin-only 차단
- VIEWER: write-level 차단, 무제한 read 허용
- 미인증: roles 필요 시 ForbiddenException
- JWT 만료/없음: UnauthorizedException

---

### TD-03: 에러 코드 명칭 §8.1 통일 ✅

**파일**: `packages/common/src/constants/error-codes.ts`

**변경 사항**:
| 구 이름 | 신 이름 |
|--------|--------|
| `AUTH_TOKEN_EXPIRED` | `TOKEN_EXPIRED` |
| `AUTH_MISSING_TOKEN` | `UNAUTHORIZED` |
| `AUTH_FORBIDDEN` | `FORBIDDEN` |
| `RESOURCE_NOT_FOUND` | `NOT_FOUND` |
| `VALIDATION_FAILED` | `VALIDATION_ERROR` |
| `INTERNAL_SERVER_ERROR` | `INTERNAL_ERROR` |
| `SERVICE_UNAVAILABLE` | `IOT_TIMEOUT` |
| (신규) | `DUPLICATE_LOT`, `IOT_TIMEOUT` |

**파일**: `packages/common/src/filters/http-exception.filter.ts`

`codeFromStatus()` 메서드의 모든 참조를 새 이름으로 업데이트

---

### TD-04: docker-compose healthcheck 타이밍 문서화 ✅

**파일**: `infra/docker/docker-compose.dev.yml`

**변경 사항**:
- postgres: `start_period: 10s` 추가 + 주석
- timescaledb: `start_period: 10s` 추가 + 주석
- redis: `start_period: 5s` 추가 + 주석
- keycloak: 기존 `start_period: 60s`에 주석 추가 (Keycloak 초기화 이유 명시)
- ai-service: healthcheck 블록 신규 추가 (`wget -qO- http://localhost:3006/health`, `start_period: 15s`)

---

## 잔여 항목 없음

4개 항목 전체 수정 완료. 추가 tech-debt 없음.
