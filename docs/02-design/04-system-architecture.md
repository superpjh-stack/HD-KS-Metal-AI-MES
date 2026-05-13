# 전체 시스템 아키텍처 & 기술 스택 (System Architecture)

> 작성자: SysArch (아키텍트) | 작성일: 2026-05-11 | 문서 버전: v1.0
> 분류: PDCA - Design Phase - System Architecture
> Project Level: Enterprise

---

## 1. 문서 목적

본 문서는 광성정밀 AI-MES 시스템의 **전체 기술 아키텍처, 기술 스택, 인프라, 보안, 운영 전략**을 정의한다.
기능/UX 산출물은 `docs/01-plan/`, `docs/02-design/01-03`을 참조한다.
본 문서는 개발/인프라/보안/운영팀 모두의 기준점이 된다.

---

## 2. 아키텍처 원칙 (Architecture Principles)

| # | 원칙 | 설명 |
|---|------|------|
| 1 | **Edge + Cloud Hybrid** | 공장 내 Edge로 IoT 처리 + 클라우드로 분석/AI |
| 2 | **Event-Driven First** | IoT는 Event Stream, 트랜잭션은 REST/GraphQL |
| 3 | **Domain-Driven Microservices** | 도메인별 서비스 분리 (입고/공정/품질/출하/AI) |
| 4 | **Time-series Native** | 시계열 DB(TimescaleDB) 1급 시민화 |
| 5 | **AI as a Layer, Not a Bolt-on** | AI를 별도 시스템이 아닌 데이터 플로우의 한 레이어로 |
| 6 | **Offline-First Floor** | 현장 디바이스는 오프라인에서도 동작 |
| 7 | **Auditable Everything** | 모든 변경은 불변 감사 로그에 기록 (IATF 16949) |
| 8 | **Cost-aware AI** | LLM 호출 캐싱, sLM 라우팅으로 비용 통제 |

---

## 3. 전체 아키텍처 다이어그램

### 3.1 논리 아키텍처 (Logical Architecture)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          [Presentation Layer]                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Web App      │  │ Floor Tablet │  │ Mobile (반장)│  │ AI Agent UI   │ │
│  │ Next.js      │  │ PWA          │  │ PWA          │  │ (Embed)       │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘ │
│         └─────────────────┴──────────────────┴──────────────────┘         │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │ HTTPS / WSS / SSE
┌─────────────────────────────────▼──────────────────────────────────────────┐
│                    [API Gateway + Auth Layer]                              │
│  Kong / Traefik   |  Keycloak (OIDC, SSO)  |  Rate Limit  |  WAF          │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────────────────┐
│                       [Microservices Layer]                                │
│  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Inbound  │  │ Press   │  │ Process  │  │ Shipment │  │ Master Data  │ │
│  │ Service  │  │ Service │  │ Service  │  │ Service  │  │ Service       │ │
│  └──────────┘  └─────────┘  └──────────┘  └──────────┘  └───────────────┘ │
│  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Quality  │  │ KPI     │  │ AI Agent │  │ Notif.   │  │ User/Auth     │ │
│  │ (SPC)    │  │ Service │  │ (LLM)    │  │ Service  │  │ Service       │ │
│  └──────────┘  └─────────┘  └──────────┘  └──────────┘  └───────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ ML Inference Service  |  ML Training Pipeline  |  Audit Service     │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────────────────┐
│                          [Data & Event Layer]                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐ │
│  │ PostgreSQL  │  │ TimescaleDB  │  │ Redis      │  │ S3 / MinIO       │ │
│  │ (OLTP)      │  │ (IoT TS)     │  │ (Cache/    │  │ (Files, DataLake)│ │
│  │             │  │              │  │ Pub-Sub)   │  │                  │ │
│  └─────────────┘  └──────────────┘  └────────────┘  └──────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐  │
│  │ EMQX (MQTT) │  │ RabbitMQ     │  │ Qdrant / pgvector (Vector DB)   │  │
│  │ Broker      │  │ (Workflow)   │  │ (RAG)                           │  │
│  └─────────────┘  └──────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────────────────┐
│                              [Edge Layer]                                  │
│  Edge Industrial PC × N (per 라인)                                         │
│  - OPC-UA Client (PLC → MQTT)                                              │
│  - Local Buffer (네트워크 단절 대비)                                       │
│  - Edge Inference (간이 ML, 룰 기반)                                       │
│  - Time Sync (NTP)                                                         │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │ Field Bus
┌─────────────────────────────────▼──────────────────────────────────────────┐
│                            [Field Layer]                                   │
│  PLC (Siemens S7-1500, Mitsubishi Q)                                       │
│  Sensors: 진동(IEPE), 온도(PT100), 전력(Modbus), 거리(레이저)              │
│  QR Scanner (Zebra)                                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 물리 아키텍처 (Physical Deployment)

```
                    [Internet]
                         │
                ┌────────▼─────────┐
                │ CloudFront/CDN   │
                └────────┬─────────┘
                         │
                ┌────────▼──────────┐
                │   AWS Region (ap-northeast-2)   │
                │                                  │
                │   ┌──────────────────────────┐  │
                │   │       EKS Cluster        │  │
                │   │ ┌────┐ ┌────┐ ┌────┐    │  │
                │   │ │API │ │ML  │ │AI  │ …  │  │
                │   │ └────┘ └────┘ └────┘    │  │
                │   └──────────────────────────┘  │
                │                                  │
                │   RDS (PostgreSQL) Multi-AZ      │
                │   ElastiCache (Redis)            │
                │   S3 (Object/Data Lake)          │
                │   MSK (Kafka, Optional)          │
                └────────────┬─────────────────────┘
                             │ Site-to-Site VPN / Direct Connect
                             │
                ┌────────────▼──────────────────────┐
                │      광성정밀 공장 LAN              │
                │                                    │
                │   ┌────────────────────────────┐  │
                │   │  Edge K3s Cluster (HA)     │  │
                │   │  - MQTT Broker (EMQX)      │  │
                │   │  - TimescaleDB (Hot)       │  │
                │   │  - Edge Inference          │  │
                │   │  - Local API Cache         │  │
                │   └────────────────────────────┘  │
                │                                    │
                │   ┌──────────────────────────┐    │
                │   │  Industrial PC × 8 (각 라인) │ │
                │   │  - OPC-UA Client          │   │
                │   │  - Sensor Hub             │   │
                │   └──────────────────────────┘    │
                │                                    │
                │   Tablets / Phones / PCs           │
                │   PLCs / Sensors                   │
                └────────────────────────────────────┘
```

---

## 4. 기술 스택 (Tech Stack)

### 4.1 Frontend

| Layer | 선택 | 사유 |
|-------|------|------|
| Framework | Next.js 15 (App Router) | SSR/ISR, 한국어 i18n, App/Web 코드 공유 |
| Language | TypeScript 5.x | 타입 안정성, 대규모 협업 |
| UI Lib | shadcn/ui + Radix | 접근성, 커스터마이즈 자유 |
| Styling | Tailwind CSS | 디자인 토큰 일관성 |
| State | Zustand + TanStack Query | 간결한 상태, 서버 캐싱 |
| Charts | ECharts + Recharts | ECharts 성능, Recharts 단순함 병행 |
| Realtime | WebSocket (Socket.IO 또는 native) + SSE | IoT 라이브 차트 |
| Form | React Hook Form + Zod | 검증, DX |
| Mobile | PWA (Service Worker, IndexedDB) | 오프라인 모드 |
| Monorepo | Turborepo + pnpm | 빌드 캐싱, 코드 공유 |

### 4.2 Backend

| Layer | 선택 | 사유 |
|-------|------|------|
| Language | Python 3.12 (FastAPI) | AI/ML 친화, 한국어 NLP |
| | + TypeScript (Node.js)  | 일부 BFF, 알림 서비스 |
| Framework | FastAPI | async, OpenAPI 자동, Pydantic |
| ORM | SQLAlchemy 2 + Alembic | 마이그레이션, 타입 |
| API Style | REST (CRUD) + GraphQL (조회 통합) | 단순+ 유연 |
| Realtime | WebSocket (FastAPI + Redis Pub/Sub) | 1초 IoT 푸시 |
| Auth | Keycloak (OIDC) | 표준, SSO, RBAC |
| Task Queue | Celery + RabbitMQ | 배치 작업, 이메일 등 |
| Job Scheduler | Airflow 또는 Prefect | KPI 배치, ML 학습 |

### 4.3 Data Layer

| 용도 | 선택 | 사유 |
|------|------|------|
| OLTP (트랜잭션) | PostgreSQL 16 (RDS Multi-AZ) | 신뢰성, JSON 지원 |
| Time-series | TimescaleDB (Hypertable) | IoT 압축, Continuous Aggregate |
| Cache + Pub/Sub | Redis 7 (ElastiCache) | 빠른 캐시, WebSocket fan-out |
| Object Storage | S3 (또는 MinIO 온프레미스) | 사진, PDF, ML 데이터 |
| Vector DB | pgvector (PG 확장) | 통합 운영, RAG |
| Message Broker (IoT) | EMQX (MQTT 5) | 산업 표준, QoS |
| Message Broker (앱) | RabbitMQ | 작업 큐 |
| Data Lake | S3 + Parquet (Iceberg 검토) | 분석 |
| Search (옵션) | Meilisearch / OpenSearch | 글로벌 검색 |

### 4.4 AI/ML

| 용도 | 선택 | 사유 |
|------|------|------|
| LLM (Cloud) | Anthropic Claude 3.5 Sonnet + OpenAI GPT-4o | 한국어, Tool Use, 가용성 |
| LLM (Internal) | Llama 3 70B / Qwen2 (사내 GPU) | 비용, 보안 |
| LLM Orchestration | LangChain + LangGraph | Tool Use, 멀티스텝 |
| ML Framework | scikit-learn / XGBoost / PyTorch | 시계열, ML |
| Experiment Tracking | MLflow | 모델 버전, 메트릭 |
| Data Versioning | DVC | 데이터셋 버전 |
| Model Serving | FastAPI + ONNX Runtime | 표준 |
| Vector Embeddings | text-embedding-3-large (또는 사내 BGE-M3) | RAG |
| Notebooks | JupyterHub | 분석가 환경 |

### 4.5 Infrastructure & DevOps

| Layer | 선택 | 사유 |
|-------|------|------|
| Cloud | AWS (ap-northeast-2) | 모회사 호환, 안정성 |
| Edge | K3s on Industrial PC (Linux) | 경량 Kubernetes |
| Orchestration | EKS (Cloud) + K3s (Edge) | 통합 운영 |
| Container | Docker (BuildKit) | 표준 |
| IaC | Terraform (HCL) | 멀티 클라우드, 모듈 |
| Config Mgmt | Kustomize + Helm | K8s 표준 |
| GitOps | ArgoCD | Auto/Manual sync |
| CI/CD | GitHub Actions | PR 게이트, 빌드 |
| Secret Mgmt | AWS Secrets Manager + ESO | K8s 동기화 |
| Service Mesh (옵션) | Linkerd | mTLS, Observability |
| DNS / CDN | Route53 + CloudFront | - |

### 4.6 Observability

| 영역 | 선택 |
|------|------|
| Metrics | Prometheus + Thanos |
| Logs | Loki + Grafana |
| Traces | Tempo + OpenTelemetry |
| Dashboard | Grafana |
| Alerts | Alertmanager → 카카오워크 + 메일 + SMS |
| APM | (Sentry) for FE/BE 에러 |
| Synthetic | Blackbox Exporter (헬스체크) |

---

## 5. 마이크로서비스 상세 (Domain Services)

### 5.1 서비스 분리 원칙
- DDD Bounded Context = 1 서비스
- DB 분리 (서비스 간 직접 DB 접근 금지)
- 동기: REST/GraphQL, 비동기: RabbitMQ/Kafka

### 5.2 서비스 목록

| 서비스 | 책임 | 기술 | DB |
|--------|------|------|------|
| **inbound-service** | 입고, LOT, 공급처 품질 | Python FastAPI | PG.inbound |
| **press-service** | 프레스 작업, 4M, 금형 | Python FastAPI | PG.press + TS.iot_press |
| **process-service** | 일반 공정, 외주, 자격 | Python FastAPI | PG.process |
| **shipment-service** | 출하, 납기, LOT 역추적 | Python FastAPI | PG.shipment |
| **quality-service** | SPC, 불량, Cpk | Python FastAPI | PG.quality |
| **master-service** | 품번/자재/금형/표준 | Python FastAPI | PG.master |
| **kpi-service** | KPI 계산, 집계 | Python FastAPI + Celery | PG.kpi |
| **ai-agent-service** | LLM, Tool Use, RAG | Python + LangChain | PG.chat + pgvector |
| **ml-inference-service** | 예지보전, 이상탐지 추론 | Python + ONNX | (in-memory, model file) |
| **ml-training-service** | 학습 파이프라인 | Python + Airflow | (S3 datasets) |
| **notification-service** | 알람, 푸시, 메일 | Node.js | PG.notif |
| **audit-service** | 감사 로그 (Append-only) | Python | PG.audit |
| **user-service** | 사용자, 권한, 인증 | Python + Keycloak | PG.user |
| **bff-web** | 프런트엔드 BFF, GraphQL | Node.js / TS | (no DB) |

### 5.3 서비스 간 통신 패턴

| Pattern | 사용 예 |
|---------|---------|
| 동기 REST | master-service → 다른 서비스 (기준정보 조회) |
| 동기 GraphQL | bff-web → 여러 서비스 통합 조회 |
| 비동기 Event (RabbitMQ) | inbound → quality (입고검사 결과 전파) |
| 비동기 IoT (MQTT) | sensor → press-service / ml-inference |
| Stream (WebSocket) | press-service → web client (라이브 차트) |

---

## 6. 데이터 모델 핵심 엔티티

> 전체 ERD는 별도 Phase 1 산출물 (`docs/01-development/schema.dbml`)로 작성 예정.

### 6.1 도메인별 핵심 엔티티

```
[Master]
  - Part (품번)
  - Material (자재)
  - Mold (금형)
  - Equipment (설비)
  - WorkStandard (작업표준)
  - QualityStandard (품질기준)
  - Worker (작업자)
  - Supplier (거래처)

[Transaction]
  - InboundLot (입고 LOT)
  - InboundInspection (입고 검사)
  - WorkOrder (작업 지시)
  - PressOperation (프레스 작업)
  - SelfInspection (자주검사)
  - Defect (불량)
  - ProcessOperation (공정 작업)
  - ShipmentLot (출하 LOT)
  - ShipmentInspection (출하 검사)

[Time-Series (TimescaleDB)]
  - press_vibration (8kHz raw + 1sec RMS)
  - press_current (전류 3상)
  - press_temperature
  - press_force (타발력 곡선)

[AI / Audit]
  - ChatMessage (AI 대화)
  - ModelPrediction (예지보전 예측)
  - AuditLog (불변 감사 로그)
  - FourMChange (4M 변경 이력)
```

### 6.2 LOT 추적성 모델 (핵심)
```
InboundLot (raw material)
   ↓ many-to-many via material_consumption
PressOperation
   ↓ one-to-many
ProcessOperation (후공정)
   ↓ many-to-one
ShipmentLot
   ↓ one-to-many
ShipmentBox (QR 라벨 단위)
```
- LOT 추적 인덱스를 모든 단계에 부여 → 30초 역추적 SLA 보장

---

## 7. 인프라 설계

### 7.1 EKS Cluster (Cloud)

| 구분 | 사양 |
|------|------|
| 노드 그룹 (app) | m6i.xlarge × 3~6 (Auto-scale) |
| 노드 그룹 (data) | r6i.xlarge × 2 (메모리 집약) |
| 노드 그룹 (gpu) | g5.xlarge × 1~2 (ML inference) |
| Storage | EBS gp3 + S3 |
| 네트워크 | VPC, 2 Public + 2 Private + 2 DB subnet |

### 7.2 Edge K3s (On-Premise)

| 구분 | 사양 |
|------|------|
| 노드 | Industrial PC × 3 (HA), Ryzen 7 / 32GB / 1TB NVMe |
| 역할 | MQTT Broker + Local TimescaleDB + Edge Inference |
| 네트워크 | 공장 LAN (별도 IoT VLAN 분리) |
| 가용성 | 네트워크 단절 시에도 독립 운영 (Buffer + Local Inference) |

### 7.3 환경 분리

| 환경 | 인프라 | 배포 |
|------|--------|------|
| Local | Docker Compose | 수동 |
| Dev | EKS Dev cluster | GitHub Actions Auto |
| Staging | EKS Staging | ArgoCD Auto-sync |
| Production | EKS Prod + Edge | ArgoCD Manual-sync + 승인 |

---

## 8. 보안 설계

### 8.1 인증 & 인가
- Keycloak (OIDC, OAuth2) 중앙 인증
- 토큰: JWT (15분) + Refresh Token (12시간)
- RBAC: Role × Resource × Action 매트릭스
- Row-level Security: 라인별/부서별 데이터 분리
- 외부 LLM에 민감 데이터 전송 차단 필터 (사내 sLM 라우팅)

### 8.2 네트워크
- 모든 인입 HTTPS (TLS 1.3)
- 내부 통신 mTLS (Linkerd 옵션)
- Edge ↔ Cloud는 Site-to-Site VPN (백업: Direct Connect)
- 공장 내 IoT VLAN 별도 분리 (방화벽)

### 8.3 데이터 보안
- DB 컬럼 암호화 (작업자 PII, 모회사 가격)
- S3 SSE-KMS
- 감사 로그 불변성 (append-only + 해시 체이닝)
- 비밀 정보: AWS Secrets Manager (절대 코드에 하드코딩 금지)

### 8.4 컴플라이언스
- IATF 16949 준수 (추적성, 변경관리)
- 개인정보보호법 (작업자 데이터 5년 후 마스킹)
- ISO 27001 지향
- 모회사 사이버 보안 요구사항 (TISAX 등) 단계적 대응

---

## 9. CI/CD 파이프라인

```
[개발자 Push]
    ↓
[GitHub Actions]
    - Lint (Ruff, ESLint)
    - Test (pytest, vitest)
    - Build Docker (BuildKit, cache)
    - Push to ECR
    - SBOM/SCA (Trivy, Snyk)
    ↓
[ArgoCD - Dev/Staging Auto Sync]
    ↓
[E2E Test (Playwright)]
    ↓
[PR Approval → Main Branch Merge]
    ↓
[ArgoCD - Production Manual Sync]
    ↓
[Canary / Blue-Green Deploy]
    ↓
[Smoke Test + Alert]
```

### 9.1 배포 전략

| 서비스 종류 | 전략 |
|------------|------|
| Web/BFF | Blue-Green |
| 일반 마이크로서비스 | Rolling Update (2 maxSurge) |
| ML Inference | Canary (10% → 50% → 100%) |
| DB Migration | Pre-deploy job (Alembic, 백워드 호환) |

---

## 10. 운영 시나리오 (Operational Scenarios)

### 10.1 IoT 데이터 흐름 (정상)
```
PLC (1ms cycle) → OPC-UA Server
  → Edge Industrial PC (1초 집계)
  → MQTT Publish (qos=1, retained)
  → EMQX Broker
  → Stream Processor (Telegraf / Python Worker)
  → TimescaleDB Hypertable
  → WebSocket Fan-out → Web/Tablet
  + 비동기 ML Inference Service
```

### 10.2 네트워크 단절 시
```
PLC → Edge PC (계속 동작)
  → Local TimescaleDB (Edge) 버퍼링
  → 네트워크 복구 시 자동 동기화 (MQTT QoS 1 + dedup)
  → 클라우드 TimescaleDB 합쳐짐
```

### 10.3 LLM Provider 장애 시
```
AI Agent → Claude (primary)
  ↓ 실패
  → GPT-4o (failover)
  ↓ 둘 다 실패
  → 사내 sLM (Llama 3)
  → 사용자에게 "AI 일시 제한" 표시
```

### 10.4 데이터베이스 장애 시
- RDS Multi-AZ → 자동 페일오버 (< 60초)
- 읽기는 Read Replica로 자동 라우팅
- 백업: Point-in-time Recovery 최대 35일

---

## 11. 비기능 요구사항 충족 전략

| NFR | 목표 | 전략 |
|-----|------|------|
| 가용성 | 99.5% | Multi-AZ, Edge 자율, HA Edge K3s |
| 응답성 | 화면 < 2초, 알람 < 1초 | CDN, WebSocket, Redis 캐시 |
| 동시 사용자 | 100명 (피크) | HPA, K8s 오토스케일링 |
| IoT Ingestion | 8 프레스 × 10채널 × 1Hz | TimescaleDB 압축, 파티션 |
| LOT 추적 | 30초 | 인덱스 설계, GraphQL DataLoader |
| 백업 | RTO 4h, RPO 1h | Multi-AZ + S3 Cross-Region |

---

## 12. 비용 추정 (월간, 운영 시작 후)

| 항목 | 추정 |
|------|------|
| AWS EKS + RDS + S3 등 | ~$3,000 |
| LLM API (Claude+OpenAI) | ~$1,500 (캐싱+사내 sLM 도입 후 절감) |
| 사내 GPU 서버 (감가) | $500 |
| Edge HW 운영 | $200 |
| Observability (Grafana Cloud / 자체) | $300 |
| **합계 (운영 안정 후)** | **~$5,500/월** |

초기 1년 사업비 기준 별도, 위는 운영 시점 추정치.

---

## 13. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 노후 PLC OPC-UA 미지원 | High | Modbus TCP 게이트웨이 + 비접촉식 진동센서 |
| 클라우드 ↔ 공장 회선 불안정 | High | Edge 자율 운영, 이중화 회선 |
| LLM 비용 폭증 | Medium | 캐싱, sLM 라우팅, 사용량 제한 |
| K3s Edge 운영 복잡도 | Medium | 내부 운영팀 교육, 단순 IaC |
| 모회사 보안정책 변경 (클라우드 제한) | High | 온프레미스 백업 안 (MinIO, 자체 RDS) |

---

## 14. 단계별 인프라 구축 일정

| Phase | 인프라 작업 |
|-------|------------|
| Phase 1 (07-08월) | AWS 계정, VPC, EKS, RDS, Keycloak, GitHub Actions, Edge PC 1대 PoC |
| Phase 2 (09-11월) | Edge K3s HA, MQTT, TimescaleDB, 첫 마이크로서비스 운영 |
| Phase 3 (12-02월) | GPU 노드, ML Pipeline, Vector DB, LangChain |
| Phase 4 (03-04월) | Observability 풀스택, 보안 감사, 부하 테스트 |
| Phase 5 (05월) | 프로덕션 컷오버, 24/7 운영 체계 |

---

## 15. 의사결정 기록 (ADR 후보)

다음 항목들은 Phase 1 초기 ADR(Architecture Decision Record)로 별도 작성:
- ADR-001: Python FastAPI vs Java Spring 선정 사유
- ADR-002: TimescaleDB vs InfluxDB 비교
- ADR-003: Edge K3s vs Docker Compose
- ADR-004: LLM Provider 멀티 vs 단일
- ADR-005: pgvector vs Qdrant
- ADR-006: REST + GraphQL 하이브리드 전략
- ADR-007: EDI 표준 채택 (KAMA-EDI vs OEM 개별)
- ADR-008: 인증 (Keycloak vs Auth0)

---

## 16. 미해결 이슈

| # | 이슈 | 결정 시점 |
|---|------|----------|
| SA-OI-1 | 모회사 사이버 보안 요건 (TISAX/AIAG) 적용 범위 | Phase 1 시작 전 |
| SA-OI-2 | 클라우드 비중 (보안 제약 시 온프레미스 비율) | Phase 1 |
| SA-OI-3 | GPU 사내 서버 구매 vs 클라우드 시간제 | Phase 2 |
| SA-OI-4 | 모회사 EDI 표준 (실데이터 받아 결정) | Phase 1 |
| SA-OI-5 | 비전 검사 카메라 사양 (Phase 4 후보) | Phase 3 |

---

## 17. 다음 단계

- [ ] Phase 1 ADR 작성 (위 ADR 후보 → 결정)
- [ ] AWS 계정 + VPC + EKS Terraform 작성
- [ ] Edge PC 사양 확정 + 조달
- [ ] Keycloak Realm 설계
- [ ] DB 스키마 v0.1 (`docs/01-development/schema.dbml`)
- [ ] PDCA Do Phase 진입 준비

---

## 18. 참조 문서 매트릭스

| 영역 | 참조 문서 |
|------|----------|
| 비즈니스 목표/일정/예산 | `docs/01-plan/00-overview.md` |
| 핵심 기능 명세 | `docs/01-plan/01-pm-core-feature-spec.md` |
| AI 기능 명세 | `docs/01-plan/02-pm-ai-agent-spec.md` |
| 데이터/KPI/대시보드 | `docs/01-plan/03-pm-data-kpi-spec.md` |
| UX/IA | `docs/02-design/01-ux-information-architecture.md` |
| 웹 UI | `docs/02-design/02-ui-web-wireframe-concept.md` |
| 모바일 UI | `docs/02-design/03-ui-mobile-concept.md` |
| **본 문서** | `docs/02-design/04-system-architecture.md` |
