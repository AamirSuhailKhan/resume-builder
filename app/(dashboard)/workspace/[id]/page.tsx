import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OpportunityGraphService } from "@/lib/domain/opportunities/opportunity-graph.service";
import { OpportunityWorkspace } from "@/features/workspace/OpportunityWorkspace";
import { SectionShell } from "@/components/features/section-shell";
import { Badge } from "@/components/ui/badge";
import { Ghost, ShieldCheck, ShieldAlert, Sparkles, Activity } from "lucide-react";

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const graphService = new OpportunityGraphService();
  const graph = await graphService.getOpportunityGraph(session.user.id, params.id);

  if (!graph) {
    notFound();
  }

  return (
    <SectionShell className="max-w-[1600px]">
      <div className="flex flex-col space-y-6">
        {/* Top Bar: Opportunity Status & Confidence */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-surface border border-border rounded-xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{graph.job.role}</h1>
            <p className="text-muted-foreground">{graph.job.company} • {graph.job.location}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <Badge variant="neutral" className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20">
                {graph.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">AI Confidence:</span>
              <div className="flex items-center gap-1">
                {graph.confidence.tier === "High" && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                {graph.confidence.tier === "Medium" && <ShieldAlert className="w-4 h-4 text-amber-500" />}
                {graph.confidence.tier === "Low" && <Ghost className="w-4 h-4 text-red-500" />}
                <span className={`font-semibold ${
                  graph.confidence.tier === "High" ? "text-emerald-500" :
                  graph.confidence.tier === "Medium" ? "text-amber-500" : "text-red-500"
                }`}>
                  {graph.confidence.tier} ({graph.confidence.score}/100)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Workspace Main Area */}
        <OpportunityWorkspace initialGraph={graph} />
      </div>
    </SectionShell>
  );
}
