# Interview Intelligence OS

CareerOS now includes an India-first interview intelligence layer: a searchable corpus, company/role hiring patterns, prediction engine, user contribution loop, mock interview sessions, vector-ready question storage, Meilisearch indexing, and programmatic SEO pages.

## Product Surface

- `/interview`: Bloomberg-style interview terminal for company + role search.
- `/interview/[slug]`: programmatic SEO page for company-role interview pages.
- `/api/v1/interview-intelligence/search`: hybrid Postgres/Meilisearch-ready search.
- `/api/v1/interview-intelligence/company`: company terminal data, prep plan, prediction.
- `/api/v1/interview-intelligence/predict`: selection, OA, weak-area, and likely-question forecast.
- `/api/v1/interview-intelligence/questions/[id]/solution`: original AI solution generation.
- `/api/v1/interview-intelligence/contributions`: moderated community submissions.
- `/api/v1/interview-intelligence/mock/start`: company-specific mock interview session.
- `/api/v1/interview-intelligence/ingest/seed-india`: seeds India company intelligence from curated local data.

## Data Spine

New Prisma models:

- `Company`, `CompanyRole`
- `InterviewQuestion`, `QuestionSolution`, `QuestionEmbedding`
- `QuestionFrequency`, `QuestionTag`, `QuestionCluster`
- `InterviewExperience`, `InterviewRound`
- `BehavioralQuestion`, `SystemDesignQuestion`
- `RecruiterPattern`, `SalaryInsight`, `SelectionPattern`, `DifficultyTrend`
- `InterviewIngestionSource`, `InterviewIngestionRun`, `RawInterviewArtifact`
- `InterviewContribution`, `ContributorReputation`, `InterviewModerationEvent`
- `InterviewPrediction`, `InterviewMockSession`, `InterviewSearchEvent`

Existing `CompanyInterviewBrief`, `CompanyIntelligence`, `IndiaCompanyTrack`, `InterviewSession`, `CoachSession`, and AI Career Twin tables remain product surfaces and personalization inputs.

## Ingestion Architecture

The ingestion layer is queue-first:

- `interview_ingest`: source crawl or raw artifact ingestion.
- `interview_normalize`: question extraction, classification, dedupe.
- `interview_embed`: OpenAI embedding generation into `QuestionEmbedding`.
- `interview_solution`: original solution generation.
- `interview_moderate`: contribution moderation and reputation update.

`EthicalInterviewCrawler` provides Playwright crawling with:

- allowlisted domains,
- per-domain throttling,
- source policy,
- source attribution,
- no aggressive ToS bypassing.

## Search And Ranking

Search combines:

- Postgres text/trigram fallback,
- Meilisearch index `interview_questions`,
- pgvector-ready embeddings,
- company frequency,
- freshness,
- topic match,
- AI Career Twin personalization.

Ranking factors are returned to the UI for explainability.

## Prediction Engine

The prediction engine estimates:

- likely questions,
- weak areas,
- OA difficulty,
- interview difficulty,
- behavioral themes,
- system design topics,
- selection probability,
- confidence and evidence.

It uses company frequency, role level, question mix, difficulty trend, India company type, and Career Twin skill gaps when available.

## Trust And Moderation

Community submissions enter `InterviewContribution` and are automatically moderated for:

- spam,
- leaked/unsafe content,
- sensitive data,
- low detail.

Moderation writes `InterviewModerationEvent`; contributor trust is tracked in `ContributorReputation`.

## SEO Strategy

Programmatic pages use:

- metadata generation,
- canonical URLs,
- schema.org FAQ markup,
- sitemap generation from `Company` + `CompanyRole`.

Example slugs:

- `/interview/google-sde2-interview-questions`
- `/interview/amazon-oa-questions`
- `/interview/flipkart-system-design`
- `/interview/tcs-ninja-questions`

## Scaling Notes

- Partition `InterviewQuestion`, `QuestionFrequency`, and `InterviewSearchEvent` by time or company hash at high scale.
- Shard `QuestionEmbedding` by company/cluster hash before tens of millions of rows.
- Run Meilisearch in clustered mode, with company/role filters as first-class attributes.
- Use Redis for search cache, crawler throttling, and queue coordination.
- Store raw artifacts with strict retention; retain normalized questions and attribution.
- Keep solutions original and generated from canonical problem statements, not copied source pages.
