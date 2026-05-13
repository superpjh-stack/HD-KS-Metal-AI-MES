# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HD-KS-Metal-AI-MES** is an AI-specialized Smart Factory MES (Manufacturing Execution System) for Gwangseong Precision Co., Ltd. (광성정밀). The system integrates manufacturing AI with production management, targeting metal precision manufacturing environments.

This project is in **early planning phase** — no source code exists yet. Architecture and technology stack decisions are in progress.

## Development Framework

This project uses the **bkit framework** with **PDCA methodology** (Plan-Do-Check-Act). Development follows a 9-phase pipeline:

1. **Schema** — domain terminology and data model
2. **Convention** — coding standards
3. **Mockup** — UI/UX prototypes
4. **API** — backend endpoints
5. **Design System** — component library
6. **UI Integration** — frontend-backend connection
7. **SEO/Security** — hardening
8. **Review** — code quality
9. **Deployment** — production release

Use bkit skills to progress through phases: `/pdca plan`, `/pdca design`, `/pdca do`, `/pdca analyze`.

Current PDCA phase: **Plan (Phase 1)**. Development level: **Dynamic**.

## Business Domain

The MES system covers typical manufacturing execution concerns:
- Production order management and scheduling
- Real-time machine/line monitoring
- Quality control and defect tracking
- AI-driven anomaly detection and predictive maintenance
- Inventory and material traceability
- Worker performance and shift management

The business plan document is at `[사업계획서] 제조AI특화 스마트공장 사업계획서_(주)광성정밀_2차작성_v0.998.pdf` — read it for detailed requirements when making architecture decisions.

## Build & Run

_Not yet established._ Commands will be documented here once the stack is chosen and scaffolded.

## Architecture Decisions (TBD)

No technical decisions have been finalized. When the stack is chosen, document here:
- Frontend framework and entry point
- Backend framework and API structure
- Database and ORM
- AI/ML runtime (inference server, model serving)
- Deployment target (Docker, k8s, cloud)

## Key Conventions

- Use bkit agents for specialized tasks: `bkend-expert` for backend/BaaS, `frontend-architect` for UI, `infra-architect` for deployment.
- Follow the PDCA cycle: always create Plan/Design documents before implementing features.
- Run gap analysis (`/pdca analyze`) after each implementation phase.
