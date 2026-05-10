import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  GitBranch,
  KanbanSquare,
  ShieldCheck,
  Sparkles,
  DatabaseZap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionShell } from "@/components/features/section-shell";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { CareerOSService } from "@/lib/services/career-os.service";
import { JobsService } from "@/lib/services/jobs.service";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LiveActivityFeed } from "@/components/agents/LiveActivityFeed";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingWorkflow } from "@/components/agents/OnboardingWorkflow";
import { AuthRecoveryRedirect } from "@/components/auth/AuthRecoveryRedirect";
import { AuthConsistencyError } from "@/lib/errors/auth-errors";

// ── Shared UI ─────────────────────────────────────────────────────────────
function WorkflowStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
    case "retrying":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />;
    case "waiting_for_approval":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
    case "failed":
      return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

// ── Independent Widgets ───────────────────────────────────────────────────

async function InfrastructureBanner({ userId }: { userId: string }) {
  const metrics = await AnalyticsService.getDashboardMetrics(userId).catch(() => ({ degraded: true, degradedReason: "unknown" }));
  if (!metrics.degraded) return null;

  return (
    <div className="mb-6 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-950/60 to-red-900/30 p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <DatabaseZap className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-300">Database schema migration required</p>
          <p className="text-sm text-red-400/80 mt-1">
            The Career OS tables are missing from your database.{" "}
            {metrics.degradedReason === "db_connection_failed"
              ? "Database connection failed — check your DATABASE_URL."
              : "Run the migration command below to restore full functionality."}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <code className="font-mono text-xs bg-black/60 border border-red-500/20 px-3 py-2 rounded-lg text-red-300 select-all">
              npx prisma migrate reset --force
            </code>
            <span className="text-xs text-red-400/60">then restart the dev server</span>
          </div>
        </div>
      </div>
    </div>
  );
}

async function MetricsRow({ userId }: { userId: string }) {
  const [metrics, opportunities, workflows, approvals] = await Promise.all([
    AnalyticsService.getDashboardMetrics(userId).catch(() => ({ degraded: true, totalApplications: 0, totalResumes: 0, aiCost: 0 })),
    JobsService.getOpportunitiesForUser(userId).catch(() => []),
    CareerOSService.listWorkflowRuns(userId, 10).catch(() => []),
    CareerOSService.listApprovalRequests(userId, "pending").catch(() => []),
  ]);

  const schemaReady = !metrics.degraded;
  const hotMatches = opportunities.filter((job) => job.matchScore >= 88);
  const activeWorkflows = workflows.filter((wf) =>
    ["queued", "running", "retrying", "waiting_for_approval"].includes(wf.status)
  );

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <Metric label="Top matches" value={`${hotMatches.length}`} href="/matches" icon={<BriefcaseBusiness className="h-4 w-4" />} />
      <Metric label="Agent runs" value={schemaReady ? `${activeWorkflows.length}` : "—"} href="/agents" icon={<GitBranch className="h-4 w-4" />} />
      <Metric label="Approvals" value={schemaReady ? `${approvals.length}` : "—"} href="/agents" icon={<ShieldCheck className="h-4 w-4" />} urgent={approvals.length > 0} />
      <Metric label="Applications" value={`${metrics.totalApplications || 0}`} href="/applications" icon={<KanbanSquare className="h-4 w-4" />} />
      <Metric label="Resumes" value={`${metrics.totalResumes || 0}`} href="/analytics" icon={<FileText className="h-4 w-4" />} />
      <Metric label="AI cost" value={`$${(metrics.aiCost || 0).toFixed(2)}`} href="/auto-apply" icon={<Sparkles className="h-4 w-4" />} />
    </div>
  );
}

async function TopMatchesWidget({ userId }: { userId: string }) {
  const opportunities = await JobsService.getOpportunitiesForUser(userId).catch(() => []);
  
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Top Matches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.slice(0, 4).map((job) => (
          <Link
            key={job.id}
            href="/matches"
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition hover:bg-surface-muted"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{job.company}</p>
              <p className="truncate text-sm text-muted-foreground">{job.role}</p>
            </div>
            <Badge variant={job.matchScore >= 90 ? "success" : "primary"}>{job.matchScore}%</Badge>
          </Link>
        ))}
        {opportunities.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No job matches yet.{" "}
            <Link href="/job-intelligence" className="text-accent hover:underline">Analyze a job</Link> to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function ActiveWorkflowsWidget({ userId }: { userId: string }) {
  const workflows = await CareerOSService.listWorkflowRuns(userId, 10).catch(() => []);
  const activeWorkflows = workflows.filter((wf) =>
    ["queued", "running", "retrying", "waiting_for_approval"].includes(wf.status)
  );

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>
          Active Workflows
          {activeWorkflows.length > 0 && (
            <Badge variant="primary" className="ml-2 text-xs">{activeWorkflows.length} running</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeWorkflows.length > 0 ? (
          activeWorkflows.map((wf) => (
            <div key={wf.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
              <WorkflowStatusIcon status={wf.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{wf.goal}</p>
                <p className="text-xs text-muted-foreground capitalize">{wf.type.replace(/_/g, " ")} · {wf.status.replace(/_/g, " ")}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No active workflows. The AI agents are idle.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export async function CommandCenter() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Domain boundary validation -> Auto-initializes profile if empty
  let profile;
  try {
    profile = await CareerOSService.getOrCreateProfile(userId);
  } catch (error) {
    if (error instanceof AuthConsistencyError || (error instanceof Error && error.name === "AuthConsistencyError")) {
      return (
        <SectionShell>
          <AuthRecoveryRedirect />
        </SectionShell>
      );
    }
    throw error;
  }

  // If we couldn't get a profile (e.g. auth inconsistency), redirect to login
  if (!profile) redirect("/login");

  // Check if user is completely new (no workflows, no resumes)
  const isNewUser = await CareerOSService.listWorkflowRuns(userId, 1).then(runs => runs.length === 0).catch(() => false);

  if (isNewUser) {
    return (
      <SectionShell>
        <OnboardingWorkflow userId={userId} />
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <InfrastructureBanner userId={userId} />
        </Suspense>
      </ErrorBoundary>

      <PageHeader
        eyebrow="Command Center"
        title="Your daily cockpit for winning better roles."
        description="One workspace for resume quality, match prioritization, applications, interview practice, and portfolio publishing."
        action={
          <Link href="/job-intelligence">
            <Button>
              <Sparkles className="h-4 w-4" /> Analyze a job
            </Button>
          </Link>
        }
      />

      <ErrorBoundary>
        <Suspense fallback={<div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>}>
          <MetricsRow userId={userId} />
        </Suspense>
      </ErrorBoundary>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-[200px]" />}>
              <TopMatchesWidget userId={userId} />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <ActiveWorkflowsWidget userId={userId} />
            </Suspense>
          </ErrorBoundary>
        </div>

        <div className="h-[600px] flex">
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              {/* Force demo mode off for established users to use SSE stream */}
              <LiveActivityFeed simulateDemo={false} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </SectionShell>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function Metric({ label, value, href, icon, urgent = false }: { label: string; value: string; href: string; icon: React.ReactNode; urgent?: boolean; }) {
  return (
    <Link href={href}>
      <Card variant="elevated" className={`h-full hover:border-border-strong transition-colors ${urgent ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted ${urgent ? "text-amber-400" : "text-accent"}`}>
              {icon}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{label}</p>
          <p className={`mt-1 text-3xl font-semibold ${urgent ? "text-amber-400" : "text-foreground"}`}>
            {value}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
