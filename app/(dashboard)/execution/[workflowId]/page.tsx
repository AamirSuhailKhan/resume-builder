import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardQueryService } from "@/lib/services/dashboard-query.service";
import { ExecutionSurface } from "@/features/execution/ExecutionSurface";
import { ExecutionIntelligence } from "@/features/execution/ExecutionIntelligence";
import { ExecutionStatusBar } from "@/features/execution/ExecutionStatusBar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";

export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  return {
    title: `Execution · ${workflowId.slice(0, 8).toUpperCase()} | Career OS`,
    description: "Live AI execution viewer — watch autonomous agent work in real time.",
  };
}

export default async function ExecutionViewerPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workflowId } = await params;
  const userId = session.user.id;

  const data = await DashboardQueryService.getWorkflowExecutionView(workflowId, userId);

  if (!data.workflow) notFound();

  const { workflow, execution, domActions, reasoning, latestScreenshot, screenshots } = data;

  const statusVariant =
    workflow.status === "running" || workflow.status === "queued"
      ? "primary"
      : workflow.status === "completed"
      ? "success"
      : workflow.status === "failed" || workflow.status === "canceled"
      ? "danger"
      : "neutral";

  return (
    // Full-bleed layout — bypasses the dashboard main padding
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-4 overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/agents"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to agents
        </Link>

        <div className="h-4 w-px bg-border/40" />

        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-semibold text-foreground">{workflow.goal}</p>
        </div>

        <Badge variant={statusVariant} className="shrink-0 ml-auto capitalize">
          {workflow.status.replace(/_/g, " ")}
        </Badge>

        <span className="shrink-0 font-mono text-[10px] text-zinc-600 hidden lg:block">
          {workflowId.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* ── Main viewport: left screenshot + right intelligence ─────────── */}
      <div className="flex flex-1 gap-3 overflow-hidden min-h-0">
        {/* Left — Execution Surface (emotional centerpiece, ~60% width) */}
        <div className="flex-[3] min-w-0 overflow-hidden">
          <ExecutionSurface
            workflowId={workflowId}
            initialScreenshot={
              latestScreenshot
                ? { ...latestScreenshot, createdAt: latestScreenshot.createdAt.toISOString() }
                : null
            }
            initialUrl={execution?.currentUrl ?? null}
            initialTitle={execution?.currentTitle ?? null}
            executionStatus={execution?.status ?? null}
          />
        </div>

        {/* Right — Execution Intelligence (~40% width) */}
        <div className="flex-[2] min-w-0 overflow-hidden">
          <ExecutionIntelligence
            workflowId={workflowId}
            initialDomActions={domActions.map((a) => ({
              ...a,
              createdAt: a.createdAt.toISOString(),
            }))}
            initialReasoning={reasoning.map((r) => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>

      {/* ── Bottom status bar ─────────────────────────────────────────────── */}
      <div className="shrink-0">
        <ExecutionStatusBar
          workflowId={workflowId}
          workflowStatus={workflow.status}
          agentRuns={workflow.agentRuns}
          initialScreenshotCount={screenshots.length}
          startedAt={execution?.startedAt?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
