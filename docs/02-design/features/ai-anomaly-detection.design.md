# ai-anomaly-detection Design Document

> **Summary**: Layer 1 AI — 임계값 알람 + SPC 통계 이상감지 + SPC 관리도 + Cp/Cpk 엔진 설계.
>
> **Project**: 광성정밀 AI-MES
> **Author**: Frontend-Architect / Backend-Expert / CTO Lead
> **Date**: 2026-05-12
> **Status**: Approved
> **PDCA Phase**: Design
> **References**: `docs/01-plan/features/ai-anomaly-detection.plan.md`, `docs/01-plan/02-pm-ai-agent-spec.md`

---

## 1. 시스템 아키텍처

```
sensor_data (TimescaleDB)
        │
        ├─── IoT Collector (1초 수집)
        │         │
        │    [즉시 임계값 체크] ─────────────────────────────►  Redis pub/sub
        │                                                         │
        └─── sensor_data_1min (집계뷰)                     notif-service
                  │                                              │
         ai-service @Cron 1분                           Socket.io /alerts
                  │                                         (frontend)
         ┌────────┴────────┐
         │                 │
    SPC 계산           ±3σ 이상감지
    (X-bar R,            (rolling
     Cp/Cpk)              window)
         │                 │
    AlarmEvent DB    AlarmEvent DB
```

---

## 2. 도메인 모델 (Prisma Schema 확장)

### 2.1 신규 모델

```prisma
// packages/db/prisma/schema.prisma 에 추가

model AlarmRule {
  id          String   @id @default(cuid())
  machineId   String
  channel     String   // "vibration_x", "current", "temperature"
  ruleType    AlarmRuleType
  threshold   Float?   // PDM-01: 임계값
  sigmaFactor Float?   @default(3.0)  // PDM-02: σ 배수
  windowMin   Int?     @default(60)   // 통계 윈도우 (분)
  enabled     Boolean  @default(true)
  severity    AlarmSeverity @default(WARNING)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  machine     Machine  @relation(fields: [machineId], references: [id])
  events      AlarmEvent[]

  @@unique([machineId, channel, ruleType])
  @@map("alarm_rules")
}

model AlarmEvent {
  id            String    @id @default(cuid())
  ruleId        String
  machineId     String
  channel       String
  severity      AlarmSeverity
  value         Float     // 발생 시점 측정값
  threshold     Float?    // 위반된 임계값 (룰 기준값)
  message       String
  occurredAt    DateTime
  acknowledgedAt DateTime?
  acknowledgedBy String?  // userId
  rule          AlarmRule @relation(fields: [ruleId], references: [id])
  machine       Machine   @relation(fields: [machineId], references: [id])

  @@index([machineId, occurredAt(sort: Desc)])
  @@index([severity, occurredAt(sort: Desc)])
  @@map("alarm_events")
}

model SpcParameter {
  id          String   @id @default(cuid())
  machineId   String
  channel     String
  usl         Float?   // Upper Spec Limit
  lsl         Float?   // Lower Spec Limit
  sampleSize  Int      @default(5)    // 서브그룹 크기 n
  sampleCount Int      @default(25)   // 관리한계 계산용 샘플 수
  updatedAt   DateTime @updatedAt
  machine     Machine  @relation(fields: [machineId], references: [id])

  @@unique([machineId, channel])
  @@map("spc_parameters")
}

enum AlarmRuleType {
  THRESHOLD   // PDM-01: 고정 임계값
  SIGMA       // PDM-02: ±Nσ 통계
  WESTERN_ELECTRIC // SPC Western Electric 규칙
}

enum AlarmSeverity {
  INFO
  WARNING
  CRITICAL
}
```

### 2.2 기존 모델 관계 추가

```prisma
// Machine 모델에 추가
model Machine {
  // ... 기존 필드 ...
  alarmRules    AlarmRule[]
  alarmEvents   AlarmEvent[]
  spcParameters SpcParameter[]
}
```

---

## 3. 서비스 구조 (`apps/ai-service`)

```
apps/ai-service/
├── src/
│   ├── app.module.ts
│   ├── main.ts                    port 3006
│   ├── alarm/
│   │   ├── alarm.module.ts
│   │   ├── alarm.service.ts       AlarmRule CRUD, AlarmEvent 저장
│   │   ├── alarm.controller.ts    GET/PATCH /alarm-events, GET /alarm-rules
│   │   └── dto/
│   │       ├── create-alarm-rule.dto.ts
│   │       └── acknowledge-alarm.dto.ts
│   ├── threshold/
│   │   ├── threshold.module.ts
│   │   ├── threshold.service.ts   임계값 체크 엔진
│   │   └── threshold.consumer.ts  Redis sub → 체크 → 알람 발행
│   ├── spc/
│   │   ├── spc.module.ts
│   │   ├── spc.service.ts         X-bar R, Cp/Cpk 계산
│   │   ├── spc.controller.ts      GET /spc/chart, GET /spc/capability
│   │   ├── spc.scheduler.ts       @Cron 1분 배치
│   │   └── western-electric.ts    8대 규칙 감지 유틸
│   ├── stats/
│   │   ├── stats.module.ts
│   │   ├── stats.service.ts       rolling σ 계산 (PDM-02)
│   │   └── stats.scheduler.ts     @Cron 5분 배치
│   └── shared/
│       ├── redis.module.ts        pub/sub 클라이언트
│       └── timescale.module.ts    TimescaleDB 직접 연결 (Pool)
├── test/
│   ├── unit/
│   │   ├── spc.service.spec.ts
│   │   └── western-electric.spec.ts
│   └── integration/
│       ├── alarm.integration.spec.ts
│       └── global-setup.ts
├── package.json
└── tsconfig.json
```

---

## 4. API 설계

### 4.1 알람 규칙 관리

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/v1/alarm-rules` | MANAGER+ | 알람 규칙 목록 (machineId 필터) |
| POST | `/api/v1/alarm-rules` | ADMIN | 알람 규칙 생성 |
| PATCH | `/api/v1/alarm-rules/:id` | MANAGER+ | 임계값/활성화 변경 |
| DELETE | `/api/v1/alarm-rules/:id` | ADMIN | 규칙 삭제 |

### 4.2 알람 이벤트

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/v1/alarm-events` | VIEWER+ | 이벤트 목록 (machineId, severity, from, to, ack) |
| PATCH | `/api/v1/alarm-events/:id/acknowledge` | OPERATOR+ | 알람 처리 확인 |
| GET | `/api/v1/alarm-events/summary` | VIEWER+ | 설비별 미처리 알람 수 |

### 4.3 SPC

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/v1/spc/chart` | VIEWER+ | X-bar R 데이터 (machineId, channel, from, to) |
| GET | `/api/v1/spc/capability` | VIEWER+ | Cp/Cpk 목록 (machineId) |
| GET | `/api/v1/spc/violations` | VIEWER+ | Western Electric 위반 목록 |
| POST | `/api/v1/spc/parameters` | MANAGER+ | SPC 파라미터 (USL/LSL/n) 설정 |
| PUT | `/api/v1/spc/parameters/:machineId/:channel` | MANAGER+ | 파라미터 업데이트 |

### 4.4 응답 형식 예시

```jsonc
// GET /api/v1/spc/chart?machineId=xxx&channel=vibration_x&from=2026-09-01&to=2026-09-02
{
  "data": {
    "machineId": "uuid",
    "channel": "vibration_x",
    "sampleSize": 5,
    "limits": {
      "cl_xbar":  10.25,  // 중심선
      "ucl_xbar": 12.4,   // X-bar 관리상한
      "lcl_xbar": 8.1,    // X-bar 관리하한
      "cl_r":     2.46,
      "ucl_r":    5.2,    // R 관리상한
      "lcl_r":    0.0
    },
    "points": [
      { "bucket": "2026-09-01T08:00:00Z", "xbar": 10.1, "range": 2.3, "violations": [] },
      { "bucket": "2026-09-01T08:01:00Z", "xbar": 13.2, "range": 3.1, "violations": ["RULE_1"] }
    ]
  }
}

// GET /api/v1/spc/capability?machineId=xxx
{
  "data": [
    { "channel": "vibration_x", "cp": 1.45, "cpk": 1.38, "samples": 250, "status": "OK" },
    { "channel": "temperature",  "cp": 0.98, "cpk": 0.82, "samples": 250, "status": "WARNING" }
  ]
}
```

---

## 5. 핵심 알고리즘

### 5.1 임계값 알람 (PDM-01)

```typescript
// threshold.service.ts
checkThreshold(machineId: string, channel: string, value: number, rules: AlarmRule[]): AlarmEvent | null {
  const rule = rules.find(r => r.machineId === machineId && r.channel === channel
                            && r.ruleType === 'THRESHOLD' && r.enabled);
  if (!rule || value <= rule.threshold!) return null;
  return { ruleId: rule.id, machineId, channel, severity: rule.severity, value,
           threshold: rule.threshold, message: `${channel} ${value} > ${rule.threshold} (임계값 초과)`,
           occurredAt: new Date() };
}
```

### 5.2 ±3σ 통계 이상감지 (PDM-02)

```typescript
// stats.service.ts — rolling window 통계
interface RollingStats { mean: number; std: number; count: number; }

computeRolling(samples: number[]): RollingStats {
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
  return { mean, std: Math.sqrt(variance), count: n };
}

isSigmaAnomaly(value: number, stats: RollingStats, sigmaFactor = 3): boolean {
  return Math.abs(value - stats.mean) > sigmaFactor * stats.std;
}
```

### 5.3 X-bar R 관리한계 계산 (QAD-01)

```typescript
// spc.service.ts
// 표준 SPC 상수 (n=2~10)
const A2 = { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 };
const D3 = { 2: 0,     3: 0,     4: 0,     5: 0,     6: 0,     7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223 };
const D4 = { 2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777 };

computeControlLimits(xbars: number[], ranges: number[], n: number) {
  const xbarBar = mean(xbars);
  const rBar = mean(ranges);
  return {
    cl_xbar: xbarBar,
    ucl_xbar: xbarBar + A2[n] * rBar,
    lcl_xbar: xbarBar - A2[n] * rBar,
    cl_r: rBar,
    ucl_r: D4[n] * rBar,
    lcl_r: D3[n] * rBar,
  };
}
```

### 5.4 Western Electric 규칙 (Rule 1~4)

```typescript
// western-electric.ts
export function detectViolations(points: number[], ucl: number, lcl: number, cl: number): string[] {
  const violations: string[] = [];
  // Rule 1: 1점이 관리한계 밖
  if (points[points.length-1] > ucl || points[points.length-1] < lcl) violations.push('RULE_1');
  // Rule 2: 연속 9점이 중심선 한쪽
  if (points.length >= 9) {
    const last9 = points.slice(-9);
    if (last9.every(p => p > cl) || last9.every(p => p < cl)) violations.push('RULE_2');
  }
  // Rule 3: 연속 6점 단조 증가/감소
  if (points.length >= 6) {
    const last6 = points.slice(-6);
    const inc = last6.every((p, i) => i === 0 || p > last6[i-1]);
    const dec = last6.every((p, i) => i === 0 || p < last6[i-1]);
    if (inc || dec) violations.push('RULE_3');
  }
  // Rule 4: 연속 14점 교호 증감
  if (points.length >= 14) {
    const last14 = points.slice(-14);
    const alternating = last14.every((p, i) =>
      i === 0 || (i % 2 === 1 ? p > last14[i-1] : p < last14[i-1]) ||
                 (i % 2 === 1 ? p < last14[i-1] : p > last14[i-1])
    );
    if (alternating) violations.push('RULE_4');
  }
  return violations;
}
```

### 5.5 Cp/Cpk 계산 (QAD-02)

```typescript
// spc.service.ts
computeCapability(samples: number[], usl: number, lsl: number) {
  const { mean: mu, std: sigma } = computeStats(samples);
  const cp = (usl - lsl) / (6 * sigma);
  const cpu = (usl - mu) / (3 * sigma);
  const cpl = (mu - lsl) / (3 * sigma);
  const cpk = Math.min(cpu, cpl);
  return { cp, cpk, cpu, cpl, mean: mu, std: sigma, samples: samples.length };
}
```

---

## 6. 스케줄러 설계

### 6.1 SPC 배치 (1분)

```
@Cron('0 * * * * *')  // 매 분 0초
spcBatch():
  1. sensor_data_1min에서 각 machine×channel별 최근 (sampleSize × sampleCount)분 데이터 조회 (기본값 5×25=125분)
  2. n=5 서브그룹으로 분할 → X-bar, R 계산
  3. 관리한계 계산 (초기값: 첫 25분 데이터)
  4. Western Electric Rule 1~4 체크
  5. 위반 시 AlarmEvent 저장 + Redis 발행
  6. Cp/Cpk 업데이트 (SpcParameter의 USL/LSL 필요 시)
```

### 6.2 σ 이상감지 배치 (5분)

```
@Cron('0 */5 * * * *')
sigmaBatch():
  1. 각 machine×channel 최근 60분 데이터 조회 (sensor_data_1min)
  2. rolling mean/std 계산
  3. 최신 1분 평균값 vs ±3σ 비교
  4. 위반 시 AlarmEvent 저장 + Redis 발행
```

### 6.3 임계값 체크 (즉시 — IoT 수신 시)

```
IoT Collector가 TimescaleDB INSERT 후 Redis 채널 publish:
  Channel: "sensor:new-data"
  Payload: { machineId, channel, value, timestamp }

ai-service threshold.consumer.ts:
  subscribe "sensor:new-data"
  → AlarmRule 조회 (캐시: 5분 TTL)
  → 임계값 초과 시 AlarmEvent 저장 + notif-service Redis 발행
```

---

## 7. Redis 채널 설계

| 채널 | 발행자 | 수신자 | 페이로드 |
|------|--------|--------|---------|
| `ks-mes:sensor:new-data` | iot-collector | ai-service threshold.consumer | `{machineId, channel, value, timestamp}` |
| `ks-mes:alerts` | ai-service | notif-service | `{id, level, title, message, time}` |

> **참고**: `alerts` 채널은 ai-mes-foundation에서 이미 설계된 채널. ai-service가 새로운 발행자로 추가됨.

---

## 8. 프론트엔드 (Next.js)

### 8.1 신규 페이지

```
apps/web/src/app/(app)/
├── monitoring/          (기존)
│   └── page.tsx
├── spc/                 (신규)
│   ├── page.tsx         SPC 대시보드 — 설비/채널 선택 + X-bar R 차트
│   └── [machineId]/
│       └── page.tsx     설비별 상세 SPC + Cp/Cpk 테이블
└── alarms/              (신규)
    ├── page.tsx          알람 이력 (필터, 페이지네이션, 처리 확인)
    └── active/
        └── page.tsx      실시간 활성 알람 (Socket.io 연동)
```

### 8.2 신규 컴포넌트

```
packages/ui/src/components/
├── SpcChart/
│   ├── XbarChart.tsx     Recharts ComposedChart — X-bar + UCL/LCL/CL 라인
│   ├── RangeChart.tsx    R 차트
│   └── index.ts
├── CapabilityTable/
│   └── index.tsx         Cp/Cpk 테이블 (상태 배지: OK/WARNING/CRITICAL)
└── AlarmList/
    └── index.tsx         알람 이력 테이블 (레벨 아이콘, 처리 버튼)
```

### 8.3 신규 훅

```
apps/web/src/features/spc/
├── useSpcChart.ts        GET /api/v1/spc/chart (TanStack Query, 1분 refetch)
├── useCapability.ts      GET /api/v1/spc/capability
└── useAlarmEvents.ts     GET /api/v1/alarm-events (필터, 무한스크롤)
```

---

## 9. 보안

- 모든 ai-service 엔드포인트: `JwtAuthGuard` + `RolesGuard` (ai-mes-foundation 패키지 재사용)
- 알람 규칙 생성/수정: ADMIN 또는 MANAGER만 허용
- AlarmEvent acknowledge: OPERATOR 이상 (자신의 설비만 — 추후 Phase 3에서 강화)
- AuditInterceptor: ai-service main.ts에 설치 (`@ks-mes/audit` 재사용)

---

## 10. 구현 순서 (Do Phase 가이드)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| **2-A** | Prisma 스키마 확장 + migration | 1일 |
| **2-A** | apps/ai-service 스캐폴딩 + 기본 모듈 | 1일 |
| **2-A** | ThresholdConsumer (Redis sub → 체크 → 알람) | 1일 |
| **2-A** | AlarmRule/Event CRUD API | 1일 |
| **2-B** | SPC 배치 스케줄러 (X-bar R 관리한계) | 2일 |
| **2-B** | Western Electric Rule 1~4 + AlarmEvent | 1일 |
| **2-B** | σ 이상감지 배치 (PDM-02) | 1일 |
| **2-C** | SPC Chart API + Cp/Cpk API | 2일 |
| **2-C** | SpcParameter CRUD API | 1일 |
| **2-D** | 프론트엔드 SPC 차트 페이지 | 2일 |
| **2-D** | 프론트엔드 알람 이력 페이지 | 1일 |
| **2-D** | 단위/통합 테스트 | 2일 |

---

## 11. 비기능 요구사항

| 항목 | 목표 |
|------|------|
| 임계값 알람 지연 | ≤ 1초 (IoT 수집 → Socket.io 알람) |
| SPC 배치 완료 | ≤ 5초 (1분 주기 내) |
| AlarmEvent 조회 API | ≤ 500ms (30일 기간, 1,000건) |
| ai-service 메모리 | ≤ 256MB (NestJS 기준) |
| AlarmRule 캐시 | Redis TTL 5분 (DB 부하 최소화) |
