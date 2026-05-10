import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionShell } from "@/components/features/section-shell";
import { WorkflowVisualizer } from "@/components/agents/WorkflowVisualizer";
import { DashboardQueryService } from "@/lib/services/dashboard-query.service";

export async function AgentRunsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const { profile, recentWorkflows: workflows, activeCount, completedCount, pendingApprovals: approvals, memories } = await DashboardQueryService.getAgentRunsView(userId);

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Agent Runs"
        title="AI workflows with memory, approvals, and auditability."
        description="The foundation for supervised autonomy: every workflow has state, every agent run has a trace, and every sensitive action waits for approval."
        action={
          <Link href="/auto-apply">
            <Button>
              Prepare applications
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AgentMetric label="Active workflows" value={`${activeCount}`} icon={<GitBranch className="h-4 w-4" />} />
        <AgentMetric label="Pending approvals" value={`${approvals.length}`} icon={<ShieldCheck className="h-4 w-4" />} />
        <AgentMetric label="Career memories" value={`${memories.length}`} icon={<Database className="h-4 w-4" />} />
        <AgentMetric label="Completed" value={`${completedCount}`} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card variant="elevated">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Workflow Timeline</CardTitle>
            <Badge variant={activeCount > 0 ? "primary" : "neutral"}>{activeCount > 0 ? "Live" : "Idle"}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(workflow.status)}>{workflow.status.replaceAll("_", " ")}</Badge>
                      <span className="text-xs text-muted-foreground">{workflow.type}</span>
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-foreground">{workflow.goal}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {workflow._count.agentRuns} agent run{workflow._count.agentRuns === 1 ? "" : "s"} · {formatDate(workflow.updatedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/execution/${workflow.id}`}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                  >
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" /></span>
                    Watch
                  </Link>
                </div>

                {workflow.agentRuns[0] && (
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Latest agent
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-foreground">
                      <span>{workflow.agentRuns[0].agentType}</span>
                      <Badge variant={agentStatusVariant(workflow.agentRuns[0].status)}>
                        {workflow.agentRuns[0].status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    {workflow.agentRuns[0].steps[0] && (
                      <p className="mt-2 text-sm text-muted-foreground">{workflow.agentRuns[0].steps[0].summary}</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {workflows.length === 0 && (
              <EmptyState
                icon={<Clock3 className="h-4 w-4" />}
                title="No workflow runs yet"
                detail="Create a workflow through the API or application packet flow to start collecting agent traces."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {workflows[0] && (
            <WorkflowVisualizer workflowId={workflows[0].id} title="Live Latest Workflow" />
          )}

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Approval Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{approval.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{approval.summary}</p>
                    </div>
                    <Badge variant="warning">pending</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{approval.type} · {formatDate(approval.createdAt)}</p>
                </div>
              ))}
              {approvals.length === 0 && (
                <EmptyState
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="No approvals waiting"
                  detail="Sensitive actions will land here before anything is submitted or sent."
                />
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Career Memory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-semibold text-foreground">{profile.headline ?? "Career profile initialized"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Autonomy starts in manual mode until the user grants more trust.
                </p>
              </div>
              {memories.slice(0, 5).map((memory) => (
                <div key={memory.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{memory.type}</Badge>
                    <span className="text-xs text-muted-foreground">{Math.round(memory.confidence * 100)}% confidence</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">{memory.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{memory.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </SectionShell>
  );
}

function AgentMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card variant="elevated">
      <CardContent className="p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-accent">
          {icon}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/70 p-5 text-sm">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-muted-foreground">{detail}</p>
    </div>
  );
}

function statusVariant(status: string): "neutral" | "success" | "warning" | "danger" | "primary" {
  if (status === "completed") return "success";
  if (["failed", "canceled"].includes(status)) return "danger";
  if (["waiting_for_approval", "blocked", "retrying"].includes(status)) return "warning";
  if (["queued", "running", "planned"].includes(status)) return "primary";
  return "neutral";
}

function agentStatusVariant(status: string): "neutral" | "success" | "warning" | "danger" | "primary" {
  if (status === "completed") return "success";
  if (["failed", "canceled"].includes(status)) return "danger";
  if (status === "waiting_for_approval") return "warning";
  if (["queued", "running", "planned"].includes(status)) return "primary";
  return "neutral";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
