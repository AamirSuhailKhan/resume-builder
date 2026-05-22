# AI Career Twin

The AI Career Twin is the persistent intelligence layer for CareerOS. It turns resumes, applications, recruiter interactions, learning progress, wellbeing signals, India-market context, and workflow execution logs into one evolving professional identity.

## Implemented Surface

- `app/(dashboard)/twin/page.tsx`: server-rendered Twin page.
- `components/twin/CareerTwinClient.tsx`: live Twin UI with identity, predictions, memory graph, trajectory simulation, privacy controls, and SSE execution feed.
- `app/api/v1/twin/*`: APIs for snapshot/evolution, generation, semantic memory search, prediction refresh, simulation, and privacy updates.
- `lib/twin/career-twin.service.ts`: deterministic identity engine, scoring engine, prediction engine, simulation engine, memory seeding, explainability events, and privacy updates.
- `prisma/migrations/20260521170000_add_ai_career_twin/migration.sql`: PostgreSQL + pgvector schema for the Twin memory graph and historical intelligence records.

## Data Model

Core tables:

- `CareerTwin`: one active intelligence profile per user.
- `TwinMemory`: persistent semantic memory with pgvector support, importance, recency, reinforcement, decay, and privacy scope.
- `TwinInsight`: explainable strategic insights with evidence and actions.
- `BehavioralProfile`: consistency, anxiety, burnout, negotiation, and learning signals.
- `CommunicationProfile`: recruiter-facing tone and writing guidance.
- `CareerTrajectory`: historical progression snapshots.
- `OutcomePrediction`: callback, interview, offer, salary, ghosting, scam, burnout, stagnation, and ceiling predictions.
- `EmotionalState`: momentum, confidence, motivation, anxiety, burnout, rejection fatigue.
- `NegotiationPattern`: compensation behavior and outcomes.
- `LearningVelocity`: skill learning speed and proof-project path.
- `RecruiterInteraction`: recruiter trust, latency, sentiment, ghosting risk, compensation signals.
- `SkillGap`: role-specific missing skill plan.
- `CareerSimulation`: scenario projections with uncertainty.
- `TwinEvent`: user-visible transparency timeline.

Existing tables still power execution and trust:

- `WorkflowRun`, `AgentRun`, `ApprovalRequest`, `ExecutionReplay`, `BrowserExecution`, `DOMAction`, `ExecutionReasoning`, `AuditEvent`.

## Event Architecture

The Twin publishes user-visible events through `OrchestrationEventBus`, which already fans out through Redis and SSE at `/api/v1/events/stream`.

The Twin page listens to the SSE stream and displays:

- agent decisions,
- confidence and reasoning events,
- approval checkpoints,
- browser execution screenshots when available,
- workflow status updates.

## Agent Orchestration

The current implementation creates the durable intelligence layer that agents can use. The agent roles map to the existing orchestration primitives:

- Planner Agent -> `WorkflowRun` + `AgentRun(agentType="planner")`
- Match Agent -> jobs/matches + Twin predictions
- Optimization Agent -> resume/ATS/application artifacts
- Interview Agent -> interview prep routes and company briefs
- Negotiation Agent -> negotiation sessions and Twin negotiation patterns
- Wellbeing Agent -> wellbeing check-ins and `EmotionalState`
- Learning Agent -> `SkillGap` and `LearningVelocity`
- Networking Agent -> connection paths and recruiter interaction memory
- Market Intelligence Agent -> market weather, India track, job intelligence

Every autonomous external action should create an `ApprovalRequest` before submission unless the user's `CareerTwin.autonomyMode` and policy allow execution.

## AI Routing

The Twin service is intentionally useful without model keys. It uses deterministic scoring first, then can be upgraded to call `OrchestrationModelRouter` for:

- richer identity inference,
- semantic insight summarization,
- recruiter-message style modeling,
- trajectory scenario narratives,
- interview and negotiation coaching.

Provider usage should continue to be recorded in `AIUsage` for cost, quota, and model-routing optimization.

## Privacy And Safety

The default controls are:

- persistent memory enabled,
- AI training disabled,
- approval required for sensitive fields,
- execution replay enabled,
- retention windows for raw events, workflow events, and screenshots.

All updates write `TwinEvent` and `AuditEvent` records so users can see what changed, why, and what data was involved.

## Scaling Strategy

- Partition high-volume Twin memory/event tables by `userId` or time once write volume grows.
- Keep HNSW indexes on `TwinMemory.embedding`; shard by tenant/user hash before tens of millions of rows.
- Move scheduled evolution into BullMQ workers with per-plan queue priorities.
- Cache Twin snapshots in Redis with short TTLs and invalidate on resume/application/workflow events.
- Keep model routing tiered: Gemini Flash for extraction, Claude/Gemini premium for complex planning, deterministic fallbacks for core UX.
- Use existing OpenTelemetry/Sentry instrumentation for route latency, worker failures, and model cost.
- Store browser screenshots/replays in object storage with short retention and signed URLs.

## Revenue Hooks

The schema supports:

- free tier: manual Twin and limited simulations,
- pro tier: continuous evolution, memory search, prediction refreshes,
- premium automation: approved workflows and execution replay,
- elite coaching: human coach review over Twin insights,
- recruiter marketplace: anonymized recruiter/company quality intelligence.
