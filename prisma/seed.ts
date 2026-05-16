/**
 * prisma/seed.ts — Production-quality seed for Career OS dashboard.
 * Generates realistic orchestration telemetry that makes the UI feel alive.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ago = (ms: number) => new Date(Date.now() - ms);
const mins = (n: number) => n * 60_000;
const hours = (n: number) => n * 3_600_000;
const days = (n: number) => n * 86_400_000;

async function main() {
  console.log('🌱 Seeding production-quality Career OS telemetry...');

  // ── 1. Demo User ─────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'demo@career-os.ai' },
    update: { name: 'Alex Chen' },
    create: { name: 'Alex Chen', email: 'demo@career-os.ai' },
  });
  console.log(`  ✓ User: ${user.email}`);

  // ── 2. Career Profile ─────────────────────────────────────────────────────
  await prisma.careerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      headline: 'Senior AI/ML Engineer · Platform · Systems',
      summary: 'Building production AI infrastructure at scale. 7 years in distributed systems, last 3 years focused on LLM orchestration and agent frameworks.',
      goals: {
        targetRoles: ['Staff Engineer, AI Platform', 'Principal Engineer', 'AI Architect'],
        targetCompanies: ['Anthropic', 'Stripe', 'Vercel', 'Scale AI', 'OpenAI'],
        targetSalary: 350000,
        timeline: '3 months',
        openToRemote: true,
      },
      preferences: { workStyle: 'async-first', teamSize: 'small', stage: ['series-b', 'series-c', 'public'] },
      constraints: { noRelocate: false, noStartup: false },
      autonomyPolicy: {
        mode: 'supervised',
        maxApplicationsPerDay: 5,
        approvalRequiredFor: ['application_submit', 'recruiter_message', 'salary_expectation'],
      },
    },
  });

  await prisma.anonymousBenchmark.createMany({
    skipDuplicates: true,
    data: [
      { roleLevel: 'entry', industry: 'tech', location: 'india', responseRate: 0.18, interviewRate: 0.08, offerRate: 0.03, avgDaysToOffer: 45, sampleSize: 1200 },
      { roleLevel: 'mid', industry: 'tech', location: 'india', responseRate: 0.26, interviewRate: 0.12, offerRate: 0.05, avgDaysToOffer: 39, sampleSize: 1800 },
      { roleLevel: 'senior', industry: 'tech', location: 'india', responseRate: 0.32, interviewRate: 0.16, offerRate: 0.07, avgDaysToOffer: 42, sampleSize: 1400 },
      { roleLevel: 'lead', industry: 'tech', location: 'india', responseRate: 0.30, interviewRate: 0.15, offerRate: 0.06, avgDaysToOffer: 50, sampleSize: 700 },
      { roleLevel: 'entry', industry: 'tech', location: 'remote', responseRate: 0.14, interviewRate: 0.06, offerRate: 0.02, avgDaysToOffer: 52, sampleSize: 900 },
      { roleLevel: 'mid', industry: 'tech', location: 'remote', responseRate: 0.21, interviewRate: 0.10, offerRate: 0.04, avgDaysToOffer: 48, sampleSize: 1300 },
      { roleLevel: 'senior', industry: 'tech', location: 'remote', responseRate: 0.27, interviewRate: 0.14, offerRate: 0.06, avgDaysToOffer: 50, sampleSize: 950 },
      { roleLevel: 'entry', industry: 'finance', location: 'india', responseRate: 0.16, interviewRate: 0.07, offerRate: 0.025, avgDaysToOffer: 44, sampleSize: 500 },
      { roleLevel: 'mid', industry: 'finance', location: 'india', responseRate: 0.23, interviewRate: 0.11, offerRate: 0.045, avgDaysToOffer: 41, sampleSize: 650 },
      { roleLevel: 'senior', industry: 'finance', location: 'india', responseRate: 0.28, interviewRate: 0.14, offerRate: 0.055, avgDaysToOffer: 47, sampleSize: 420 },
      { roleLevel: 'entry', industry: 'healthcare', location: 'india', responseRate: 0.15, interviewRate: 0.065, offerRate: 0.025, avgDaysToOffer: 46, sampleSize: 350 },
      { roleLevel: 'mid', industry: 'healthcare', location: 'india', responseRate: 0.22, interviewRate: 0.10, offerRate: 0.04, avgDaysToOffer: 43, sampleSize: 440 },
      { roleLevel: 'senior', industry: 'healthcare', location: 'india', responseRate: 0.26, interviewRate: 0.13, offerRate: 0.05, avgDaysToOffer: 49, sampleSize: 300 },
      { roleLevel: 'mid', industry: 'tech', location: 'us', responseRate: 0.20, interviewRate: 0.09, offerRate: 0.035, avgDaysToOffer: 44, sampleSize: 1600 },
      { roleLevel: 'senior', industry: 'tech', location: 'us', responseRate: 0.25, interviewRate: 0.12, offerRate: 0.05, avgDaysToOffer: 47, sampleSize: 1250 },
    ],
  });

  await prisma.hiringPattern.createMany({
    skipDuplicates: true,
    data: [
      { companyType: 'faang', industry: 'tech', bestMonths: [1, 2, 3, 9, 10], worstMonths: [11, 12, 7, 8], hiringCyclePeak: 'Q1', avgDaysToFill: 35, notes: 'New headcount budget opens Jan-Mar. Post-performance review hiring in Sep-Oct.' },
      { companyType: 'startup_seed', industry: 'tech', bestMonths: [2, 3, 4, 5, 8, 9], worstMonths: [12, 1], hiringCyclePeak: 'Q2', avgDaysToFill: 18, notes: 'Hire post-funding rounds. Avoid December.' },
      { companyType: 'startup_growth', industry: 'tech', bestMonths: [1, 2, 3, 7, 8, 9], worstMonths: [6, 11, 12], hiringCyclePeak: 'Q1', avgDaysToFill: 24, notes: 'Sales-driven headcount often follows revenue calendar.' },
      { companyType: 'enterprise', industry: 'tech', bestMonths: [1, 2, 3, 4, 10, 11], worstMonths: [7, 8, 12], hiringCyclePeak: 'Q1', avgDaysToFill: 45, notes: 'Budget year resets in Jan. Oct-Nov for next year planning.' },
      { companyType: 'public_company', industry: 'tech', bestMonths: [2, 3, 8, 9], worstMonths: [6, 7, 12, 1], hiringCyclePeak: 'Q1', avgDaysToFill: 40, notes: 'Tied to earnings calendar. Avoid quarter-end months.' },
    ],
  });

  // ── 3. Career Memories ────────────────────────────────────────────────────
  await prisma.careerMemory.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, type: 'skill', title: 'LLM Orchestration', content: 'Built production multi-agent systems using LangChain, AutoGen, and custom frameworks. Comfortable with tool-calling, RAG pipelines, and agent memory systems.', confidence: 0.95, source: 'resume' },
      { userId: user.id, type: 'skill', title: 'Distributed Systems', content: 'Designed event-driven microservices handling 50k RPS. Experience with Kafka, Redis Streams, BullMQ, and gRPC.', confidence: 0.92, source: 'resume' },
      { userId: user.id, type: 'preference', title: 'Work Style', content: 'Strongly prefers async-first, documentation-heavy engineering cultures. Thrives in high-ownership, low-process environments.', confidence: 0.88, source: 'user' },
      { userId: user.id, type: 'signal', title: 'Ghosting Pattern Detected', content: 'Applications to companies with >30 day old postings show <5% response rate. Filter future applications to jobs posted within 14 days.', confidence: 0.82, source: 'agent', metadata: { sampleSize: 23 } },
      { userId: user.id, type: 'goal', title: 'Target Compensation', content: 'Total comp target $350k-$400k. Base salary floor $240k. Open to equity-heavy packages at growth-stage companies.', confidence: 0.99, source: 'user' },
    ],
  });

  // ── 4. Job Opportunities ──────────────────────────────────────────────────
  const jobs = await Promise.all([
    prisma.jobOpportunity.create({ data: { userId: user.id, company: 'Anthropic', role: 'Member of Technical Staff, Inference', location: 'San Francisco, CA', salaryRange: '$300k–$450k', description: 'Build and scale Claude inference infrastructure. Work on distributed serving, model optimization, and reliability at the frontier.', matchScore: 96, sourceType: 'verified', sourceUrl: 'https://anthropic.com/careers' } }),
    prisma.jobOpportunity.create({ data: { userId: user.id, company: 'Stripe', role: 'Staff Software Engineer, AI Platform', location: 'Remote', salaryRange: '$280k–$380k', description: 'Design the AI platform layer powering Stripe Radar, Stripe Sigma AI, and future ML products. Own the MLOps and inference serving stack.', matchScore: 94, sourceType: 'verified' } }),
    prisma.jobOpportunity.create({ data: { userId: user.id, company: 'Vercel', role: 'Principal Engineer, AI Runtime', location: 'Remote', salaryRange: '$260k–$360k', description: 'Build the AI SDK and streaming runtime powering the Next.js AI ecosystem. Own the v1 of Vercel AI Gateway.', matchScore: 91, sourceType: 'verified' } }),
    prisma.jobOpportunity.create({ data: { userId: user.id, company: 'Scale AI', role: 'Principal Engineer, RLHF Platform', location: 'San Francisco, CA', salaryRange: '$270k–$370k', description: 'Own the RLHF data pipeline, annotation quality systems, and evaluator infrastructure for frontier model training.', matchScore: 88, sourceType: 'verified' } }),
    prisma.jobOpportunity.create({ data: { userId: user.id, company: 'Linear', role: 'Senior Engineer, AI Features', location: 'Remote', salaryRange: '$220k–$300k', description: 'Ship AI features into Linear: auto-triage, smart summaries, code-linked issues. Small team, high autonomy.', matchScore: 85, sourceType: 'ai_inferred' } }),
    prisma.jobOpportunity.create({ data: { userId: user.id, company: 'Notion', role: 'Staff Engineer, AI', location: 'Remote', salaryRange: '$240k–$320k', description: 'Lead the AI engineering team building Notion AI Q&A, summarization, and the emerging AI blocks system.', matchScore: 82, sourceType: 'ai_inferred' } }),
  ]);
  console.log(`  ✓ ${jobs.length} job opportunities`);

  // ── 5. Resumes ────────────────────────────────────────────────────────────
  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: 'Senior AI Engineer — Tailored (Anthropic)',
      status: 'completed',
      version: 3,
      data: {
        personalInfo: { name: 'Alex Chen', email: 'alex@example.com', phone: '+1 (555) 000-0000', location: 'San Francisco, CA', linkedin: 'linkedin.com/in/alexchen', github: 'github.com/alexchen' },
        summary: 'Senior AI/ML engineer specializing in LLM orchestration and distributed inference systems. Built production agent frameworks at scale, reducing inference latency 40% and cutting serving costs by $2M annually.',
        experience: [
          { company: 'TechCorp', role: 'Senior AI Platform Engineer', duration: '2022–Present', bullets: ['Designed multi-agent orchestration framework handling 10M+ daily tool calls', 'Reduced P99 inference latency from 3.2s to 1.1s via speculative decoding', 'Led migration to vLLM serving stack, saving $2.1M annually in GPU compute'] },
          { company: 'StartupCo', role: 'ML Infrastructure Engineer', duration: '2019–2022', bullets: ['Built distributed training pipeline for 7B parameter models on A100 clusters', 'Implemented RLHF data collection and reward modeling infrastructure'] },
        ],
        skills: ['Python', 'TypeScript', 'LangChain', 'vLLM', 'Ray Serve', 'Kubernetes', 'PostgreSQL', 'Redis', 'BullMQ', 'Anthropic Claude API', 'OpenAI API'],
        education: [{ school: 'Stanford University', degree: 'B.S. Computer Science', year: '2019' }],
      },
    },
  });
  console.log(`  ✓ Resume created`);

  // ── 6. Applications ───────────────────────────────────────────────────────
  await prisma.application.createMany({
    data: [
      { userId: user.id, resumeId: resume.id, jobOpportunityId: jobs[1].id, company: 'Stripe', role: 'Staff Software Engineer, AI Platform', status: 'interview', matchScore: 94, appliedAt: ago(days(3)) },
      { userId: user.id, resumeId: resume.id, company: 'OpenAI', role: 'Research Engineer, Safety', status: 'applied', matchScore: 79, appliedAt: ago(days(7)) },
      { userId: user.id, resumeId: resume.id, company: 'Cohere', role: 'Senior Platform Engineer', status: 'rejected', matchScore: 72, appliedAt: ago(days(14)) },
    ],
  });

  // ── 7. AI Usage ───────────────────────────────────────────────────────────
  await prisma.aIUsage.createMany({
    data: [
      { userId: user.id, provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', promptTokens: 12400, completionTokens: 3200, estimatedCost: 0.052, createdAt: ago(hours(2)) },
      { userId: user.id, provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', promptTokens: 8900, completionTokens: 2100, estimatedCost: 0.038, createdAt: ago(hours(5)) },
      { userId: user.id, provider: 'google', model: 'gemini-2.0-flash', promptTokens: 22000, completionTokens: 5500, estimatedCost: 0.012, createdAt: ago(days(1)) },
      { userId: user.id, provider: 'openai', model: 'gpt-4o', promptTokens: 6200, completionTokens: 1800, estimatedCost: 0.091, createdAt: ago(days(2)) },
    ],
  });

  // ── 8. Workflow: Resume Optimization (COMPLETED) ──────────────────────────
  const wf1 = await prisma.workflowRun.create({
    data: {
      userId: user.id,
      type: 'resume_optimization',
      status: 'completed',
      goal: 'Tailor resume for MTS, Inference at Anthropic — maximize ATS score and keyword alignment',
      plan: { steps: ['extract_jd_requirements', 'gap_analysis', 'rewrite_bullets', 'generate_cover_letter', 'ats_verify'] },
      createdAt: ago(hours(2.5)),
      completedAt: ago(hours(2.1)),
      updatedAt: ago(hours(2.1)),
    },
  });

  const ar1 = await prisma.agentRun.create({ data: { userId: user.id, workflowId: wf1.id, agentType: 'resume_optimizer', status: 'completed', startedAt: ago(hours(2.5)), completedAt: ago(hours(2.1)), costUsd: 0.052, tokenUsage: { prompt: 12400, completion: 3200 }, input: { resumeId: resume.id, targetCompany: 'Anthropic', targetRole: 'MTS, Inference' }, output: { atsScore: 96, keywordsAdded: ['vLLM', 'speculative decoding', 'inference serving', 'LLM serving'], bulletsRewritten: 4, coverLetterGenerated: true } } });
  await prisma.agentStep.createMany({ data: [
    { agentRunId: ar1.id, stepType: 'jd_parse', status: 'completed', summary: 'Extracted 47 requirements from JD. Top signals: inference serving, LLM optimization, distributed systems.', startedAt: ago(hours(2.5)), completedAt: ago(hours(2.48)), output: { requirements: 47, topKeywords: ['vLLM', 'inference', 'latency'] } },
    { agentRunId: ar1.id, stepType: 'gap_analysis', status: 'completed', summary: 'ATS score before: 71%. Missing keywords: vLLM, speculative decoding, CUDA kernels. 3 experience bullets need quantification.', startedAt: ago(hours(2.48)), completedAt: ago(hours(2.4)), output: { scoreBefore: 71, gaps: ['vLLM', 'speculative decoding'] } },
    { agentRunId: ar1.id, stepType: 'bullet_rewrite', status: 'completed', summary: 'Rewrote 4 experience bullets. Added quantified impact metrics. Integrated missing technical keywords naturally.', startedAt: ago(hours(2.4)), completedAt: ago(hours(2.25)), output: { bulletsRewritten: 4, scoreAfter: 96 } },
    { agentRunId: ar1.id, stepType: 'cover_letter_gen', status: 'completed', summary: 'Generated personalized cover letter referencing Constitutional AI work and Claude inference challenges.', startedAt: ago(hours(2.25)), completedAt: ago(hours(2.1)), output: { wordCount: 347 } },
  ] });

  // ── 9. Workflow: Auto Apply (WAITING_FOR_APPROVAL) ────────────────────────
  const wf2 = await prisma.workflowRun.create({
    data: {
      userId: user.id,
      type: 'auto_apply',
      status: 'waiting_for_approval',
      goal: 'Submit application to Stripe — Staff Software Engineer, AI Platform',
      plan: { steps: ['navigate_greenhouse', 'parse_form', 'fill_fields', 'upload_resume', 'request_human_approval', 'submit'] },
      createdAt: ago(mins(22)),
      updatedAt: ago(mins(3)),
    },
  });

  const ar2 = await prisma.agentRun.create({ data: { userId: user.id, workflowId: wf2.id, agentType: 'browser_automation', status: 'completed', startedAt: ago(mins(22)), completedAt: ago(mins(5)), costUsd: 0.018, input: { targetUrl: 'https://stripe.com/jobs/listing/123', company: 'Stripe' }, output: { formFieldsFilled: 14, customQuestionsDetected: 3 } } });
  await prisma.agentStep.createMany({ data: [
    { agentRunId: ar2.id, stepType: 'navigation', status: 'completed', summary: 'Navigated to Stripe Greenhouse ATS. Detected Lever-style form with 14 standard fields + 3 custom questions.', startedAt: ago(mins(22)), completedAt: ago(mins(20)) },
    { agentRunId: ar2.id, stepType: 'dom_parse', status: 'completed', summary: 'Parsed all form fields. Custom questions: (1) Describe your approach to ML infrastructure, (2) Largest scale system, (3) Salary expectation.', startedAt: ago(mins(20)), completedAt: ago(mins(17)) },
    { agentRunId: ar2.id, stepType: 'field_fill', status: 'completed', summary: 'Filled 11 standard fields. Held salary expectation field — requires human approval per autonomy policy.', startedAt: ago(mins(17)), completedAt: ago(mins(8)) },
    { agentRunId: ar2.id, stepType: 'upload_resume', status: 'completed', summary: 'Uploaded tailored resume (Stripe variant, v3). PDF generated, 847KB.', startedAt: ago(mins(8)), completedAt: ago(mins(5)) },
  ] });

  await prisma.approvalRequest.create({
    data: {
      userId: user.id,
      workflowId: wf2.id,
      type: 'application_submit',
      status: 'pending',
      title: 'Review Stripe Application Before Submission',
      summary: 'The auto-apply agent has completed all form fields and uploaded your tailored resume. Review the custom question answers and salary expectation before final submission.',
      payload: {
        company: 'Stripe',
        role: 'Staff Software Engineer, AI Platform',
        resumeUsed: 'Senior AI Engineer — Tailored (Stripe)',
        customAnswers: [
          { question: 'Describe your approach to ML infrastructure at scale', answer: 'I focus on three pillars: observability first (you cannot optimize what you cannot measure), incremental migration (never big-bang replace serving infrastructure), and cost accountability (every team owns their GPU spend). At TechCorp, this framework helped us cut serving costs 40% while improving reliability from 99.5% to 99.97%.' },
          { question: 'Largest scale distributed system you\'ve built or operated', answer: 'Led design and operation of a multi-region LLM inference cluster handling 10M+ daily tool calls across 8 model variants. Implemented adaptive batching, speculative decoding, and a custom KV-cache sharding scheme that reduced cold-start latency from 4.1s to 0.8s.' },
        ],
        salaryExpectation: { flagged: true, reason: 'Policy requires human approval for salary disclosure', suggestedRange: '$340k–$380k TC' },
      },
      riskFlags: { salaryDisclosure: true, customAnswerQuality: 'high', confidenceScore: 0.94 },
      expiresAt: new Date(Date.now() + 24 * 3600_000),
    },
  });

  // ── 10. Workflow: Recruiter Outreach (RUNNING) ────────────────────────────
  const wf3 = await prisma.workflowRun.create({
    data: {
      userId: user.id,
      type: 'recruiter_outreach',
      status: 'running',
      goal: 'Identify and draft warm outreach to 3 hiring managers at Anthropic via shared alumni network',
      plan: { steps: ['graph_search', 'warm_path_analysis', 'draft_messages', 'request_approval'] },
      createdAt: ago(mins(8)),
      updatedAt: ago(mins(1)),
    },
  });

  const ar3 = await prisma.agentRun.create({ data: { userId: user.id, workflowId: wf3.id, agentType: 'network_intelligence', status: 'running', startedAt: ago(mins(8)), costUsd: 0.009, input: { targetCompany: 'Anthropic', strategy: 'alumni_warm_path' } } });
  await prisma.agentStep.createMany({ data: [
    { agentRunId: ar3.id, stepType: 'graph_search', status: 'completed', summary: 'Traversed 2nd-degree LinkedIn graph. Found 3 Anthropic engineers who share Stanford alumni connection. 1 has responded to cold outreach historically.', startedAt: ago(mins(8)), completedAt: ago(mins(5)) },
    { agentRunId: ar3.id, stepType: 'draft_message', status: 'running', summary: 'Drafting personalized outreach referencing shared CS224N coursework and common open-source contributions...', startedAt: ago(mins(3)) },
  ] });

  // ── 11. Workflow: Job Intelligence Scan (COMPLETED) ───────────────────────
  const wf4 = await prisma.workflowRun.create({
    data: {
      userId: user.id,
      type: 'job_intelligence',
      status: 'completed',
      goal: 'Scan top-tier AI companies for new Staff/Principal openings matching career profile',
      createdAt: ago(hours(6)),
      completedAt: ago(hours(5.8)),
      updatedAt: ago(hours(5.8)),
    },
  });

  const ar4 = await prisma.agentRun.create({ data: { userId: user.id, workflowId: wf4.id, agentType: 'job_matcher', status: 'completed', startedAt: ago(hours(6)), completedAt: ago(hours(5.8)), output: { jobsScanned: 142, jobsMatched: 6, ghostJobsFiltered: 14 } } });
  await prisma.agentStep.createMany({ data: [
    { agentRunId: ar4.id, stepType: 'source_crawl', status: 'completed', summary: 'Crawled 12 job boards and 8 company career pages. Found 142 potentially relevant postings in last 14 days.', startedAt: ago(hours(6)), completedAt: ago(hours(5.95)) },
    { agentRunId: ar4.id, stepType: 'ghost_job_filter', status: 'completed', summary: 'Filtered 14 ghost jobs (posting age >30 days, company layoff signals, low employer activity). 128 remain.', startedAt: ago(hours(5.95)), completedAt: ago(hours(5.9)) },
    { agentRunId: ar4.id, stepType: 'semantic_match', status: 'completed', summary: 'Ran semantic similarity against career profile. 6 jobs scored >80%. Top match: Anthropic MTS Inference at 96%.', startedAt: ago(hours(5.9)), completedAt: ago(hours(5.8)), output: { matched: 6, topScore: 96 } },
  ] });

  // ── 12. Workflow: Interview Prep (PLANNED) ────────────────────────────────
  await prisma.workflowRun.create({
    data: {
      userId: user.id,
      type: 'interview_prep',
      status: 'planned',
      goal: 'Prepare for Stripe Staff Engineer technical screen — distributed systems + ML infra focus',
      plan: { steps: ['extract_job_signals', 'generate_question_bank', 'mock_interview_session', 'gap_remediation_plan'] },
      createdAt: ago(mins(5)),
      updatedAt: ago(mins(5)),
    },
  });

  // ── 13. Workflow Events (activity stream) ─────────────────────────────────
  const traceId1 = `trace_${Date.now()}_1`;
  await prisma.workflowEvent.createMany({
    data: [
      { userId: user.id, workflowId: wf1.id, type: 'workflow.started', source: 'orchestrator', visibility: 'user', payload: { message: 'Resume optimization workflow started for Anthropic application' }, traceId: traceId1, createdAt: ago(hours(2.5)) },
      { userId: user.id, workflowId: wf1.id, type: 'agent.step.completed', source: 'resume_optimizer', visibility: 'user', payload: { step: 'gap_analysis', atsScoreBefore: 71, missingKeywords: ['vLLM', 'speculative decoding'] }, traceId: traceId1, createdAt: ago(hours(2.4)) },
      { userId: user.id, workflowId: wf1.id, type: 'workflow.completed', source: 'orchestrator', visibility: 'user', payload: { atsScoreAfter: 96, improvement: 25, duration: '24 minutes' }, traceId: traceId1, createdAt: ago(hours(2.1)) },
      { userId: user.id, workflowId: wf2.id, type: 'approval.requested', source: 'approval_engine', visibility: 'user', payload: { message: 'Human approval required: Stripe application ready for submission', company: 'Stripe' }, traceId: `trace_${Date.now()}_2`, createdAt: ago(mins(3)) },
      { userId: user.id, workflowId: wf3.id, type: 'agent.step.completed', source: 'network_intelligence', visibility: 'user', payload: { message: 'Found 3 warm alumni paths to Anthropic engineering team' }, traceId: `trace_${Date.now()}_3`, createdAt: ago(mins(5)) },
    ],
  });

  console.log('  ✓ 5 workflow runs with agent telemetry');
  console.log('  ✓ Approval request pending');
  console.log('  ✓ Workflow event stream seeded');
  console.log('\n🎉 Database looks alive! Dashboard is ready.');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error('Seed failed:', e); await prisma.$disconnect(); process.exit(1); });
