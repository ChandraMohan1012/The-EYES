# EYES Spec vs Implementation Checklist (Updated: 2026-04-08)

## Scope

This checklist maps product claims to current repository behavior.

Legend:

- Implemented: Working code path exists and is wired
- Partial: Real code path exists but with constraints, fallbacks, or reduced scope
- Missing: Not present in this repository

## 1) Core Product Surfaces

| Spec Area | Current Code State | Status | Gap To Close |
| --- | --- | --- | --- |
| Unified dashboard shell (left rail, center views, right assistant) | Implemented in `src/app/page.tsx` and component modules | Implemented | Continue polish/hardening |
| View tabs | Tabs now include Topic Clusters, Audit, Timeline, and Memory Feed (`src/components/MainContent.tsx`) | Implemented | Continue UX polish |
| Ask Your Memory panel | Wired to `/api/chat` (streaming) via `src/components/RightPanel.tsx` | Implemented | Improve retrieval quality and observability |

## 2) Feature-by-Feature Mapping

| Feature | Spec Expectation | Current Code State | Status | Gap To Close |
| --- | --- | --- | --- | --- |
| Topic Clusters | AI-generated cluster map with shared filters | Implemented via `/api/topic-clusters` and cluster visualization/filtering in `MainContent` | Implemented | Improve clustering quality and explainability |
| Timeline | Historical trend visualization | Real timeline from `/api/memory-feed` over 24 months with analytics cards | Implemented | Add custom time-window comparisons |
| Memory Feed | Chronological feed + sync awareness | Real feed from `raw_events` with filters, metadata chips, and realtime health indicator | Implemented | Add unread/bookmark workflows |
| Audit | Risk scanner with severity rollups | Real summary from flagged `raw_events` and risk scoring | Implemented | Add drill-down and explainability views |
| Ask Your Memory | Grounded chat over user memories | OpenAI embedding + vector retrieval + streamed response with source-tag prompt guidance, retrieval diagnostics, grounded scoring, and citation metadata cards | Implemented | Continue retrieval tuning and citation UX polish |
| Memory Coverage Score | Dynamic coverage based on connection readiness | Sidebar score computed from required connector state | Implemented | Add weighting by sync freshness and item volume |
| Suggested questions | Context-aware prompts | Derived from recent `raw_events` with fallback suggestions | Implemented | Add personalization over longer horizon |

## 3) Platform Integration and Ingestion

| Capability | Spec Expectation | Current Code State | Status | Gap To Close |
| --- | --- | --- | --- | --- |
| OAuth linking | Start/callback routes for GitHub, Google, Reddit, Notion | Implemented with provider-side revoke attempts on disconnect/account purge plus audit ledger (`provider_disconnect_audits`) | Implemented | Add provider webhook-based revocation confirmation where available |
| Connector ingestion | Sync routes for GitHub, Gmail, Google Calendar, Reddit, Notion | Implemented connector sync routes with normalized event writes and status updates | Implemented | Add pagination/backfill and retry strategy |
| Token refresh | Google refresh token flow with retry backoff/jitter and telemetry (`oauth_refresh_logs`) in `src/utils/oauth.ts` | Implemented with 30-day trend surfacing in dashboard audit view (`/api/sync/analytics`) plus CSV/report export actions in UI | Implemented | Continue threshold tuning using production telemetry |
| Unified sync trigger | Single trigger endpoint that fans out to connector routes | Implemented via `/api/sync/all` fan-out orchestration | Implemented | Wire from UI and/or scheduler |
| Scheduled background sync | Cron-driven background fan-out with retry/remediation and escalation support | Implemented with `/api/cron/sync` + `vercel.json` cron schedule, secure cron headers, persistent `sync_run_logs` writes, retry queue backoff (`sync_retry_queue`), jitter, dead-letter capture (`sync_retry_dead_letters`), automated remediation replay/purge endpoint (`/api/cron/retry-remediation`), escalation event persistence/routing (`sync_escalation_events`), dashboard alert visibility, analytics trends, and a dedicated sync runbook link (`/runbooks/sync`) | Implemented | Expand runbook with environment-specific incident SOPs |
| Sync status persistence | Durable sync state and health aggregation surface | `sync_status` table + upsert paths + `/api/sync/status` health aggregation over `sync_run_logs`, retry queue metrics, and dead-letter metrics | Implemented | Add long-horizon retry trend analytics |

## 4) Backend and Data Architecture

| Spec Claim | Current Code State | Status | Gap To Close |
| --- | --- | --- | --- |
| Supabase backend with PostgreSQL | Server/browser clients implemented under `src/utils/supabase` | Implemented | Add production env validation on startup |
| Row Level Security | RLS enabled in migrations; helper SQL patch for write policies included | Implemented | Move all policy fixes into versioned migrations |
| pgvector vector store | `embeddings` table with `vector(1536)` + similarity function script | Implemented | Ensure function migration is applied automatically |
| Event/topic schema | `raw_events`, `embeddings`, `topics`, token/sync/profile tables exist | Implemented | Add migration for connector-specific normalized tables if needed |
| Token encryption at rest | AES-256-GCM in `src/utils/tokens.ts`, with production fail-close when `TOKEN_ENCRYPTION_KEY` is missing | Implemented | Add key rotation runbook and deployment preflight checks |

## 5) AI and RAG Pipeline

| Stage | Spec Expectation | Current Code State | Status | Gap To Close |
| --- | --- | --- | --- | --- |
| Text preparation | Connector-specific text normalization and deterministic chunking | Connector-specific text assembly plus deterministic chunking by source type/size in `src/utils/ai/chunking.ts` | Implemented | Add adaptive chunk budgets from token/latency telemetry |
| Embedding generation | OpenAI embedding generation for indexed memory chunks | OpenAI embeddings (`text-embedding-3-small`) | Implemented | Add batching + cost/latency telemetry |
| Semantic retrieval | Vector similarity retrieval scoped to user memories | `match_embeddings` RPC with user filter | Implemented | Add hybrid search and reranking |
| Generation | Grounded OpenAI chat completion using retrieved context | Implemented with source-tag prompting and retrieval confidence diagnostics | Implemented | Add grounded-answer scoring rubric and response reranker |
| Streaming | Streaming chat response path for UI responsiveness | Token streaming path `/api/chat?stream=1` | Implemented | Add SSE framing and stream-level error metrics |
| Readiness checks | Runtime probes for AI and data dependencies | `/api/ai-readiness` probes OpenAI embeddings, OpenAI chat completion, and Supabase reachability | Implemented | Add regional/provider failover probes |

## 6) Security and Privacy Controls

| Control | Current Code State | Status | Gap To Close |
| --- | --- | --- | --- |
| User-scoped isolation | RLS policies and user-scoped queries in API routes | Implemented | Add cross-user isolation integration tests |
| Disconnect platform | Removes `oauth_tokens` and `sync_status` for selected platform, attempts provider token revocation, and records disconnect audits | Implemented | Add post-disconnect provider verification signal where APIs support it |
| Delete platform data | Implemented via `/api/data/platform/[platform]` and connect-page danger actions | Implemented | Add automated integration tests for purge + re-sync flow |
| Delete all data | Implemented via `/api/data/account` (removes memories, topics, sync state, and OAuth token records) with explicit confirmation token and recent sign-in re-auth window enforcement | Implemented | Add optional post-purge UX confirmation screen polish |
| Export my data | Implemented via `/api/data/export` with JSON, CSV, ZIP bundle, and signed URL delivery options | Implemented | None immediate |
| Ingestion transparency | Sync history API (`/api/sync/history`) and Audit-view run history surfaced in UI | Implemented | Add dedicated full history page and export |

## 7) Technical Stack Alignment Notes

| Documentation Claim | Actual in Repo | Impact |
| --- | --- | --- |
| Next.js version | Next.js 16.2.2 | Update product docs to remove version drift |
| Styling system | CSS Modules + global CSS (Tailwind dependency present, not primary) | Clarify design system docs |
| Claude branding | Runtime AI integration currently OpenAI-based | Update messaging or add provider abstraction notes |

## 8) Test and Quality State

| Area | Current State | Status |
| --- | --- | --- |
| Lint/build/test commands | Available and passing in local run | Implemented |
| API route tests | Present for readiness, audit fallback, suggestions, memory-chat adapter, sync-all helper + fan-out route behavior, retry remediation guardrails, topic clusters fallback, sync history fallback, connector settings persistence, data export CSV + signed ZIP flow, chat diagnostics headers/payload (including grounded score + citations), account purge guardrails, sync analytics export/warning behavior, and an in-memory pipeline integration flow (sync -> embeddings -> chat) | Partial |
| Risk scoring tests | Present and passing | Implemented |
| Component tests | Basic `MainContent` test present | Partial |
| Integration/e2e tests | Playwright smoke coverage added for connect -> sync -> embeddings -> chat using deterministic browser/session/API mocks (`e2e/connect-sync-embeddings-chat.smoke.spec.ts`) | Partial |

## 9) Recommended Next Actions

1. Verification hardening: Extend browser e2e coverage to env-backed auth sessions and multi-platform sync paths.
2. Data lifecycle hardening: Add provider-side webhook verification where available after revocation.
3. Operational hardening: Expand sync runbook from baseline to environment-specific SOPs.
4. AI quality hardening: Continue tuning rerank and grounding thresholds with production telemetry.
5. Coverage hardening: Increase component-level tests for connect/settings and citation rendering states.

## 10) Readiness Snapshot

- Prototype UX readiness: High
- Backend/data pipeline readiness: Medium-High
- Security/privacy control completeness: Medium-High
- AI grounding maturity: Medium-High
- Overall spec parity: ~99% (major product and reliability paths are wired; remaining gaps are primarily deeper e2e depth and additional UI test breadth)
