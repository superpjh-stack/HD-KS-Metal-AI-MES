# ai-mes-foundation Implementation Guide

> **Summary**: 광성정밀 AI-MES 기반 인프라·공통 도메인·IoT 파이프라인·인증체계 구현 가이드
>
> **Project**: 광성정밀 AI-MES
> **Author**: Dev Team
> **Date**: 2026-05-11
> **Status**: In Progress
> **Design Doc**: [ai-mes-foundation.design.md](../02-design/features/ai-mes-foundation.design.md)

---

## PDCA 상태
```
[Plan] ✅ → [Design] ✅ → [Do] 🔄 → [Check] ⏳ → [Act] ⏳
```

---

## 1. 사전 점검 (Pre-Implementation Checklist)

### 1.1 문서 확인
- [x] Plan 문서: `docs/01-plan/features/ai-mes-foundation.plan.md`
- [x] Design 문서: `docs/02-design/features/ai-mes-foundation.design.md`
- [ ] 코딩 컨벤션: Design 문서 §10 참조

### 1.2 개발 환경

**필수 설치 항목:**
```powershell
# Node.js 20 LTS 확인
node -v   # v20.x 이상

# pnpm (모노레포 패키지 매니저)
npm install -g pnpm@9
pnpm -v

# Docker Desktop 확인 (PostgreSQL, TimescaleDB, Redis 등)
docker -v
docker compose version

# Turborepo CLI
pnpm install -g turbo
```

**환경변수 설정:**
```powershell
# infra/docker/.env.example → .env 복사 후 값 채우기
Copy-Item infra\docker\.env.example infra\docker\.env
# 편집 필요: DB_PASSWORD, TS_PASSWORD, KC_PASSWORD, MINIO_PASSWORD
```

---

## 2. 구현 순서 (8주, 4단계)

### Phase 1-A: 기반 인프라 (Week 1~2)

| # | 작업 | 파일/위치 | 완료 |
|---|------|-----------|:----:|
| 1 | 모노레포 초기화 (Turborepo) | `ks-mes/` 루트 | ☐ |
| 2 | 공유 TypeScript 타입 패키지 | `packages/types/` | ☐ |
| 3 | 공유 DB 패키지 (Prisma) | `packages/db/` | ☐ |
| 4 | 공유 UI 패키지 (shadcn 기반) | `packages/ui/` | ☐ |
| 5 | Docker Compose 개발 환경 | `infra/docker/docker-compose.dev.yml` | ☐ |
| 6 | Prisma 스키마 작성 | `packages/db/prisma/schema.prisma` | ☐ |
| 7 | 초기 DB 마이그레이션 실행 | `pnpm db:migrate` | ☐ |
| 8 | TimescaleDB hypertable 설정 | `packages/db/migrations/ts_setup.sql` | ☐ |
| 9 | Keycloak Realm/Client/Role 초기 설정 | `infra/keycloak/realm-export.json` | ☐ |

### Phase 1-B: 백엔드 코어 (Week 3~4)

| # | 작업 | 파일/위치 | 완료 |
|---|------|-----------|:----:|
| 10 | Kong Gateway 설정 (JWT 플러그인) | `infra/kong/kong.yml` | ☐ |
| 11 | `auth-service` NestJS 앱 생성 | `apps/auth-service/` | ☐ |
| 12 | Keycloak OIDC 어댑터 구현 | `apps/auth-service/src/auth/` | ☐ |
| 13 | `GET /auth/me` 엔드포인트 | `apps/auth-service/src/controllers/` | ☐ |
| 14 | `master-service` NestJS 앱 생성 | `apps/master-service/` | ☐ |
| 15 | LOT CRUD API | `apps/master-service/src/lot/` | ☐ |
| 16 | `GET /lots/:id/trace` API | `apps/master-service/src/lot/trace/` | ☐ |
| 17 | Machine / WorkOrder CRUD | `apps/master-service/src/machine/` | ☐ |
| 18 | `audit-service` + AuditLog 미들웨어 | `apps/audit-service/` | ☐ |
| 19 | `iot-collector` MQTT Subscribe | `apps/iot-collector/src/mqtt/` | ☐ |
| 20 | TimescaleDB 저장 + Redis Pub-Sub | `apps/iot-collector/src/timescale/` | ☐ |

### Phase 1-C: 프론트엔드 기반 (Week 5~6)

| # | 작업 | 파일/위치 | 완료 |
|---|------|-----------|:----:|
| 21 | Next.js 14 App Router 초기화 | `apps/web/` | ☐ |
| 22 | NextAuth + Keycloak Provider | `apps/web/src/lib/auth.ts` | ☐ |
| 23 | `AuthGuard` HOC (역할 기반) | `apps/web/src/components/auth/` | ☐ |
| 24 | `AppShell` (헤더+사이드바) | `packages/ui/src/AppShell/` | ☐ |
| 25 | `Sidebar` (역할별 메뉴 필터) | `packages/ui/src/Sidebar/` | ☐ |
| 26 | 기본 대시보드 페이지 | `apps/web/src/app/dashboard/page.tsx` | ☐ |
| 27 | `KpiCard` × 4 (설비가동률, 생산, 불량, 납기) | `packages/ui/src/KpiCard/` | ☐ |
| 28 | `MachineStatusBadge` | `packages/ui/src/MachineStatusBadge/` | ☐ |
| 29 | `SensorSparkline` (SSE 실시간 차트) | `packages/ui/src/SensorSparkline/` | ☐ |
| 30 | LOT 추적 화면 | `apps/web/src/app/lot/[id]/page.tsx` | ☐ |
| 31 | `LotTraceTimeline` 컴포넌트 | `apps/web/src/features/lot/` | ☐ |
| 32 | `AlertPanel` (WebSocket 알림) | `packages/ui/src/AlertPanel/` | ☐ |

### Phase 1-D: 통합 검증 (Week 7~8)

| # | 작업 | 파일/위치 | 완료 |
|---|------|-----------|:----:|
| 33 | E2E 테스트: 로그인 → 대시보드 → LOT 추적 | `apps/web/e2e/` | ☐ |
| 34 | API 통합 테스트 (testcontainers) | `apps/master-service/test/` | ☐ |
| 35 | IoT 파이프라인 지연 테스트 (< 10초) | `apps/iot-collector/test/` | ☐ |
| 36 | RBAC 권한 매트릭스 전수 테스트 | `apps/auth-service/test/rbac.spec.ts` | ☐ |
| 37 | Edge Gateway MVP (OPC-UA 시뮬레이터) | `apps/edge-gateway/` | ☐ |
| 38 | audit_logs INSERT-ONLY 검증 | DB 레벨 테스트 | ☐ |

---

## 3. 생성할 핵심 파일 목록

### 3.1 모노레포 루트

```
ks-mes/
├── package.json              # pnpm workspaces 설정
├── turbo.json                # Turborepo 파이프라인
├── .gitignore
└── .env.example
```

### 3.2 packages/db

```
packages/db/
├── package.json
├── prisma/
│   ├── schema.prisma         # 핵심 엔티티 (Lot, Machine, WorkOrder, User, AuditLog)
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_timescale_setup.sql
└── src/
    └── index.ts              # Prisma Client 싱글턴 export
```

**`packages/db/prisma/schema.prisma` 핵심 내용:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Lot {
  id          String     @id @default(uuid())
  lotNumber   String     @unique
  lotType     LotType
  materialId  String?
  supplierId  String?
  quantity    Decimal
  unit        String
  status      LotStatus  @default(ACTIVE)
  createdById String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  events      LotEvent[]
  createdBy   User       @relation(fields: [createdById], references: [id])
}

model LotEvent {
  id          String    @id @default(uuid())
  lotId       String
  eventType   String    // INBOUND | INSPECTION | PROCESS_START | PROCESS_END | SHIPMENT | REJECT
  machineId   String?
  workOrderId String?
  operatorId  String?
  payload     Json?
  occurredAt  DateTime  @default(now())
  lot         Lot       @relation(fields: [lotId], references: [id])
  // INSERT-ONLY: REVOKE UPDATE, DELETE ON lot_events FROM mes_app_user
  @@index([lotId])
  @@index([occurredAt(sort: Desc)])
}

model Machine {
  id           String    @id @default(uuid())
  machineCode  String    @unique  // PRESS-01
  name         String
  machineType  String    // PRESS | WELDER | WASHER
  lineId       String?
  plcAddress   String?
  status       String    @default("ACTIVE")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workOrders   WorkOrder[]
}

model WorkOrder {
  id           String    @id @default(uuid())
  woNumber     String    @unique
  productCode  String
  moldId       String?
  machineId    String
  plannedQty   Int
  producedQty  Int       @default(0)
  defectQty    Int       @default(0)
  status       WOStatus  @default(PLANNED)
  plannedStart DateTime?
  plannedEnd   DateTime?
  actualStart  DateTime?
  actualEnd    DateTime?
  operatorId   String?
  createdById  String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  machine      Machine   @relation(fields: [machineId], references: [id])
}

model User {
  id         String   @id @default(uuid())
  email      String   @unique
  name       String
  department String?
  roles      String[] // ADMIN | MANAGER | OPERATOR | INSPECTOR | VIEWER
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  lots       Lot[]
}

model AuditLog {
  id           String   @id @default(uuid())
  userId       String
  userEmail    String
  action       String   // CREATE | UPDATE | DELETE | LOGIN | EXPORT
  resourceType String
  resourceId   String?
  beforeValue  Json?
  afterValue   Json?
  ipAddress    String?
  occurredAt   DateTime @default(now())
  // INSERT-ONLY: enforced via DB REVOKE
}

enum LotType   { MATERIAL WIP PRODUCT }
enum LotStatus { ACTIVE USED REJECTED SHIPPED }
enum WOStatus  { PLANNED IN_PROGRESS COMPLETED ON_HOLD }
```

### 3.3 apps/auth-service

```
apps/auth-service/src/
├── main.ts
├── app.module.ts
├── auth/
│   ├── auth.controller.ts    # POST /auth/login, /refresh, /logout | GET /auth/me
│   ├── auth.service.ts       # Keycloak 토큰 검증, 사용자 정보 조회
│   ├── keycloak.adapter.ts   # Keycloak Admin API 래퍼
│   └── jwt.strategy.ts       # Passport JWT Strategy
└── guards/
    ├── jwt-auth.guard.ts
    └── roles.guard.ts        # @Roles('ADMIN', 'MANAGER') 데코레이터
```

### 3.4 apps/master-service

```
apps/master-service/src/
├── main.ts
├── app.module.ts
├── lot/
│   ├── lot.controller.ts     # POST /lots | GET /lots | GET /lots/:id | GET /lots/:id/trace
│   ├── lot.service.ts
│   ├── lot.repository.ts     # Prisma 기반 Repository
│   ├── trace-lot.usecase.ts  # LOT 전체 이력 집계 (30초 SLA)
│   └── dto/
│       ├── create-lot.dto.ts
│       └── lot-response.dto.ts
├── machine/
│   ├── machine.controller.ts
│   ├── machine.service.ts
│   └── machine.repository.ts
└── work-order/
    ├── work-order.controller.ts
    ├── work-order.service.ts
    └── work-order.repository.ts
```

### 3.5 apps/iot-collector

```
apps/iot-collector/src/
├── main.ts
├── app.module.ts
├── mqtt/
│   ├── mqtt.adapter.ts       # EMQX Subscribe: factory/+/sensors
│   └── mqtt.module.ts
├── timescale/
│   ├── timescale.write.ts    # sensor_data hypertable INSERT
│   └── timescale.module.ts
├── realtime/
│   ├── sse.controller.ts     # GET /sensors/:machineId/realtime (SSE)
│   └── redis.pubsub.ts       # Redis Publish 후 SSE 전달
└── sensor/
    └── sensor.controller.ts  # GET /sensors/latest | GET /sensors/:id/history
```

### 3.6 apps/web (Next.js)

```
apps/web/src/
├── app/
│   ├── layout.tsx            # AppShell, AuthProvider 래핑
│   ├── page.tsx              # / → /dashboard redirect
│   ├── dashboard/
│   │   └── page.tsx          # 기본 대시보드
│   ├── lot/
│   │   └── [id]/page.tsx     # LOT 추적 화면
│   └── api/
│       └── auth/[...nextauth]/route.ts  # NextAuth Keycloak
├── components/
│   └── auth/
│       └── AuthGuard.tsx
├── features/
│   └── lot/
│       ├── LotTraceTimeline.tsx
│       └── useLotTrace.ts    # SWR or TanStack Query
└── lib/
    ├── auth.ts               # NextAuth config
    └── api-client.ts         # fetch wrapper with JWT
```

---

## 4. 패키지 설치 명령

### 4.1 모노레포 초기화

```bash
# 루트에서 실행
pnpm init
pnpm add -D turbo typescript @types/node

# 각 앱 생성
cd apps && npx @nestjs/cli new auth-service --package-manager pnpm
cd apps && npx @nestjs/cli new master-service --package-manager pnpm
cd apps && npx @nestjs/cli new iot-collector --package-manager pnpm
cd apps && npx @nestjs/cli new audit-service --package-manager pnpm
cd apps && npx create-next-app@latest web --typescript --tailwind --app --src-dir
```

### 4.2 공통 백엔드 의존성 (NestJS 서비스별)

```bash
# auth-service, master-service, iot-collector 공통
pnpm add @nestjs/passport passport passport-jwt @nestjs/jwt
pnpm add @prisma/client
pnpm add class-validator class-transformer
pnpm add -D prisma @types/passport-jwt

# iot-collector 전용
pnpm add mqtt @nestjs/microservices ioredis
pnpm add pg  # TimescaleDB 직접 쿼리용
```

### 4.3 프론트엔드 (apps/web)

```bash
pnpm add next-auth @auth/core
pnpm add @tanstack/react-query axios
pnpm add recharts                    # 센서 스파크라인 차트
pnpm add @tanstack/react-table       # DataTable
pnpm add lucide-react                # 아이콘
pnpm add -D @tanstack/react-query-devtools

# shadcn/ui 컴포넌트 초기화
npx shadcn@latest init
npx shadcn@latest add card badge button input table dialog alert
```

### 4.4 패키지 DB (Prisma)

```bash
cd packages/db
pnpm add @prisma/client
pnpm add -D prisma
npx prisma init
```

---

## 5. 구현 패턴 (Design 기반)

### 5.1 NestJS 서비스 레이어 패턴

```typescript
// apps/master-service/src/lot/trace-lot.usecase.ts
// Clean Architecture: Application Layer Use Case
@Injectable()
export class TraceLotUseCase {
  constructor(private readonly lotRepo: LotRepository) {}

  async execute(lotId: string): Promise<LotTraceResult> {
    const lot = await this.lotRepo.findById(lotId);
    if (!lot) throw new NotFoundException('NOT_FOUND');

    const events = await this.lotRepo.findEvents(lotId);
    return { lot, events };
  }
}
```

### 5.2 감사 로그 자동 기록 인터셉터

```typescript
// apps/audit-service/src/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const { method, user, ip } = req;

    // POST/PUT/PATCH/DELETE만 기록
    if (['POST','PUT','PATCH','DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(async (responseData) => {
          await this.prisma.auditLog.create({
            data: {
              userId: user?.id ?? 'system',
              userEmail: user?.email ?? 'system',
              action: method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE',
              resourceType: this.extractResourceType(req.path),
              resourceId: responseData?.id,
              afterValue: responseData,
              ipAddress: ip,
            },
          });
        }),
      );
    }
    return next.handle();
  }
}
```

### 5.3 MQTT → TimescaleDB 저장 패턴

```typescript
// apps/iot-collector/src/mqtt/mqtt.adapter.ts
@Injectable()
export class MqttAdapter implements OnModuleInit {
  private client: MqttClient;

  constructor(
    private readonly timescaleWrite: TimescaleWriteService,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  onModuleInit() {
    this.client = connect(process.env.MQTT_BROKER_URL);
    this.client.subscribe('factory/+/sensors');

    this.client.on('message', async (topic, payload) => {
      const machineCode = topic.split('/')[1];  // factory/PRESS-01/sensors
      const data: SensorPayload = JSON.parse(payload.toString());

      // TimescaleDB INSERT (bulk insert every 1s for efficiency)
      await this.timescaleWrite.bulkInsert(machineCode, data);

      // Redis Pub-Sub → SSE 실시간 전달
      await this.redisPubSub.publish(`realtime:${machineCode}`, data);
    });
  }
}
```

### 5.4 SSE 실시간 스트림 (NestJS → Next.js)

```typescript
// apps/iot-collector/src/realtime/sse.controller.ts
@Controller('sensors')
export class SseController {
  constructor(private readonly redis: Redis) {}

  @Get(':machineId/realtime')
  @Sse()
  @UseGuards(JwtAuthGuard)
  sensorStream(@Param('machineId') machineId: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const sub = this.redis.duplicate();
      sub.subscribe(`realtime:${machineId}`);
      sub.on('message', (_, data) => {
        subscriber.next({ data: JSON.parse(data) } as MessageEvent);
      });
      return () => sub.unsubscribe();
    });
  }
}
```

### 5.5 Next.js SensorSparkline (SSE 수신)

```typescript
// packages/ui/src/SensorSparkline/index.tsx
'use client';
export function SensorSparkline({ machineId, channel }: Props) {
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    const es = new EventSource(`/api/sensors/${machineId}/realtime`, {
      withCredentials: true,
    });
    es.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      setData((prev) => [
        ...prev.slice(-29),  // 최근 30포인트 유지
        { time: payload.time, value: payload[channel] },
      ]);
    };
    return () => es.close();
  }, [machineId, channel]);

  return (
    <LineChart width={200} height={60} data={data}>
      <Line type="monotone" dataKey="value" dot={false} stroke="#3b82f6" />
    </LineChart>
  );
}
```

---

## 6. 아키텍처 준수 체크리스트

### 6.1 클린 아키텍처 (Enterprise Level)

- [ ] **Domain** (`packages/types/src/domain/`): 순수 TypeScript, 외부 의존성 없음
- [ ] **Application** (`apps/*/src/application/`): Use Case는 Domain만 import
- [ ] **Infrastructure** (`apps/*/src/infrastructure/`): Prisma, MQTT, Redis 어댑터
- [ ] **Presentation** (`apps/*/src/controllers/`): DTO 변환, HTTP/WS 처리만

### 6.2 보안 체크리스트

- [ ] JWT Access Token 15분 만료 설정
- [ ] Refresh Token httpOnly Cookie 설정
- [ ] Kong Gateway JWT 검증 플러그인 활성화
- [ ] `audit_logs` 테이블 REVOKE UPDATE, DELETE 실행
- [ ] `lot_events` 테이블 REVOKE UPDATE, DELETE 실행
- [ ] `.env` 파일 `.gitignore` 포함 확인
- [ ] 파일 업로드 확장자 화이트리스트 (jpg, png, pdf, xlsx만 허용)

### 6.3 API 표준 체크리스트

- [ ] 모든 응답 `{ data, meta? }` 또는 `{ error: { code, message } }` 형식
- [ ] 날짜 필드 전부 ISO 8601 UTC 형식
- [ ] 페이징 `{ data: [], total, page, limit }` 형식
- [ ] HTTP 메서드: GET(조회), POST(생성), PATCH(부분수정), DELETE(삭제)

### 6.4 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|------|------|------|
| NestJS 컨트롤러 | PascalCase + Controller | `LotController` |
| NestJS 서비스 | PascalCase + Service | `LotService` |
| Use Case | PascalCase + UseCase | `TraceLotUseCase` |
| DTO | PascalCase + Dto | `CreateLotDto` |
| Next.js 컴포넌트 | PascalCase.tsx | `LotTraceTimeline.tsx` |
| Custom Hook | use + PascalCase | `useLotTrace.ts` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| DB 컬럼 | snake_case | `lot_number`, `created_at` |
| API 응답 JSON | camelCase | `lotNumber`, `createdAt` |

---

## 7. 테스트 체크리스트

### 7.1 수동 테스트 시나리오

- [ ] **로그인 플로우**: Keycloak 로그인 → Access Token 발급 → `/auth/me` 호출
- [ ] **LOT 추적**: QR 입고 등록 → 공정 시작 이벤트 → 출하 → `/lots/:id/trace` 30초 이내 응답
- [ ] **실시간 대시보드**: MQTT 메시지 발행 → 10초 이내 대시보드 차트 업데이트 확인
- [ ] **RBAC**: OPERATOR 계정으로 `/machines` POST 시도 → 403 응답
- [ ] **감사 로그**: LOT 생성 후 `audit_logs` 자동 기록 확인
- [ ] **오프라인 복구**: MQTT 브로커 30분 중단 후 재시작 → 버퍼 데이터 동기화

### 7.2 코드 품질

```bash
# 타입 검사
pnpm typecheck

# 린트
pnpm lint

# 단위 테스트
pnpm test

# 통합 테스트 (Docker 필요)
pnpm test:integration

# E2E 테스트
pnpm test:e2e
```

---

## 8. 진행 상황 추적

### 8.1 주차별 목표

| 주차 | 목표 | 완료 기준 |
|------|------|-----------|
| Week 1 | 모노레포 + Docker 환경 구동 | `docker compose up` 성공, 모든 컨테이너 healthy |
| Week 2 | DB 스키마 + Keycloak 설정 | Prisma migrate 성공, Keycloak 로그인 가능 |
| Week 3 | auth-service + Kong | `/auth/me` 응답, JWT 검증 동작 |
| Week 4 | master-service LOT/Machine | LOT CRUD + Trace API 동작 |
| Week 5 | iot-collector MQTT→DB | 시뮬레이터 데이터 TimescaleDB 저장 확인 |
| Week 6 | Next.js 기본 대시보드 | 로그인 → 대시보드 UI 표시, 실시간 차트 동작 |
| Week 7 | LOT 추적 화면 + 알림 | 타임라인 화면 동작, WebSocket 알림 수신 |
| Week 8 | 통합 테스트 + Edge MVP | 모든 수용 기준 통과 |

### 8.2 블로커 기록

| 이슈 | 영향 | 해결 방법 |
|------|------|-----------|
| (발생 시 기록) | | |

---

## 9. 구현 완료 후

모든 항목 완료 시 Gap Analysis 실행:

```
/pdca analyze ai-mes-foundation
```

Design 문서 대비 구현 일치율을 자동 측정합니다.

---

## 버전 이력

| 버전 | 날짜 | 내용 | 작성자 |
|------|------|------|--------|
| 0.1 | 2026-05-11 | 초안 | Dev Team |
