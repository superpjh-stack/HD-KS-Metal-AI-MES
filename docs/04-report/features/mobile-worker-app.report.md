# mobile-worker-app PDCA 완료 보고서

> **Feature**: 모바일 작업자 앱 (React Native / Expo)
> **Date**: 2026-05-13
> **Match Rate**: 95% ✅
> **Status**: Completed

---

## 구현 내역

### apps/mobile/ 구조

| 파일 | 내용 |
|-----|------|
| `package.json` | Expo ~51, expo-router ~3.5, TanStack Query, MMKV, NativeWind |
| `app.json` | Expo config (iOS/Android 번들 ID, expo-barcode-scanner plugin) |
| `tsconfig.json` | React Native 컴파일 옵션, `@/*` path alias |
| `babel.config.js` | NativeWind babel plugin |
| `src/lib/api.ts` | axios 클라이언트, JWT 인터셉터, refresh token 자동 재발급 |
| `src/lib/storage.ts` | MMKV 래퍼, 30분 TTL 캐시 |
| `src/hooks/useAuth.ts` | useLogin (mutate → JWT 저장 → 라우팅), useLogout |
| `src/hooks/useWorkOrders.ts` | TanStack Query WO 목록/완료, 30분 오프라인 캐시 |
| `src/hooks/useAlarmFeed.ts` | 30초 폴링 활성 알람 |
| `src/components/WorkOrderCard.tsx` | 상태별 색상 카드 |
| `src/components/AlarmItem.tsx` | 심각도별 좌측 border 색상 |
| `src/components/MachineStatusCard.tsx` | 상태 도트 + 코드 표시 |
| `app/_layout.tsx` | QueryClientProvider + AuthGuard |
| `app/(auth)/login.tsx` | 이메일/비밀번호 로그인 화면 |
| `app/(app)/_layout.tsx` | 하단 탭 네비게이션 (4탭) |
| `app/(app)/work-orders/index.tsx` | WO 목록 + 검색 필터 |
| `app/(app)/work-orders/[id].tsx` | WO 상세 + 완료 처리 (불량수량 입력) |
| `app/(app)/alarms.tsx` | 활성 알람 목록 (당겨서 새로고침) |
| `app/(app)/machines.tsx` | 설비 상태 그리드 (3열) |
| `app/(app)/lot-scan.tsx` | 바코드 스캔 + 수동 입력 + LOT 추적 타임라인 |

### 요구사항 달성 현황

| ID | 요구사항 | 상태 |
|----|---------|------|
| MOB-01 | 로그인 화면 (JWT) | ✅ |
| MOB-02 | 작업지시 목록 (상태 필터) | ✅ |
| MOB-03 | WO 상세 + 완료 처리 | ✅ |
| MOB-04 | LOT 바코드 스캔 + 추적 | ✅ |
| MOB-05 | 활성 알람 피드 (30초 폴링) | ✅ |
| MOB-06 | 설비 상태 그리드 | ✅ |
| MOB-07 | 오프라인 캐시 (MMKV 30분 TTL) | ✅ |

## 잔여 작업
- `pnpm-workspace.yaml`은 `apps/*` 글로브로 자동 포함됨 (별도 수정 불필요)
- `pnpm install` 후 `expo start`로 개발 서버 실행
- `EXPO_PUBLIC_API_URL=http://<host>:8000` 환경변수 설정 필요
