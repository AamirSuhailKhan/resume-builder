"use client";

import { useState } from "react";
import { OpportunityGraph } from "@/lib/domain/opportunities/opportunity-graph.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, FileSignature, GitCompare, Play, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { FollowUpSequence } from "../campaigns/FollowUpSequence";

export function DecisionSurface({ graph }: { graph: OpportunityGraph }) {
  const [activeTab, setActiveTab] = useState<"resume" | "cover-letter" | "plan" | "follow-ups">("resume");
  const { job, application, workflows } = graph;

  const hasTailoredResume = !!application?.generatedResume;
  const isApplying = workflows.some(w => w.status === "running" || w.status === "waiting_for_approval");

  return (
    <Card variant="glass" className="h-full border-primary/20 shadow-xl shadow-primary/5">
      <CardHeader className="border-b border-border bg-surface/50 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Collaboration Surface
            </CardTitle>
            <CardDescription className="mt-1">
              Review and guide the AI's execution strategy before applying.
            </CardDescription>
          </div>
          <Button size="lg" disabled={isApplying} className="gap-2 font-bold shadow-lg shadow-primary/20">
            {isApplying ? (
              <>Agent Running...</>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Approve & Execute Plan
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="w-full">
          <div className="flex w-full justify-start rounded-none border-b border-border bg-surface px-4 py-6">
            <button
              onClick={() => setActiveTab("resume")}
              className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === "resume" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-muted")}
            >
              <FileText className="w-4 h-4" />
              Tailored Resume
            </button>
            <button
              onClick={() => setActiveTab("cover-letter")}
              className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === "cover-letter" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-muted")}
            >
              <FileSignature className="w-4 h-4" />
              Cover Letter
            </button>
            <button
              onClick={() => setActiveTab("plan")}
              className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === "plan" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-muted")}
            >
              <GitCompare className="w-4 h-4" />
              Execution Plan
            </button>
            <button
              onClick={() => setActiveTab("follow-ups")}
              className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === "follow-ups" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-muted")}
            >
              <Mail className="w-4 h-4" />
              Follow-Up Sequence
            </button>
          </div>

          {activeTab === "resume" && (
          <div className="p-6 m-0 outline-none">
            {hasTailoredResume ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Resume Tailoring Diff</h3>
                  <Button variant="outline" size="sm">Edit Document</Button>
                </div>
                <div className="bg-surface-muted rounded-xl border border-border p-4 min-h-[400px] flex flex-col font-mono text-sm">
                  {/* Mock Diff Viewer */}
                  <div className="text-red-400 dark:text-red-300 bg-red-500/10 px-2 py-1 -mx-2">
                    - Led development of internal tools using standard web technologies.
                  </div>
                  <div className="text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 -mx-2 relative group">
                    + Led migration of legacy monolith to React/TypeScript micro-frontends, matching the stack required for this Senior role.
                    <div className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                      <Sparkles className="w-3 h-3 text-primary" />
                      Optimized for ATS Match
                    </div>
                  </div>
                  <div className="text-muted-foreground px-2 py-1 -mx-2 mt-4">
                      Architected high-throughput data pipelines in Python...
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No tailored resume yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                    The AI will generate a highly optimized resume targeting the specific requirements of this role.
                  </p>
                </div>
                <Button>Generate Tailored Resume</Button>
              </div>
            )}
          </div>
          )}

          {activeTab === "cover-letter" && (
          <div className="p-6 m-0 outline-none">
             <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileSignature className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Generate Cover Letter</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                    Draft a cover letter utilizing your Career Memory and the AI Networking intelligence gathered.
                  </p>
                </div>
                <Button variant="outline">Draft Cover Letter</Button>
              </div>
          </div>
          )}

          {activeTab === "plan" && (
          <div className="p-6 m-0 outline-none">
            <div className="space-y-6">
              <h3 className="font-semibold text-sm">Proposed Execution Strategy</h3>
              <div className="relative border-l-2 border-primary/20 ml-3 pl-6 space-y-8">
                <div className="relative">
                  <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-background" />
                  <h4 className="font-medium text-sm">1. Resume Optimization</h4>
                  <p className="text-xs text-muted-foreground mt-1">Rewrite bullet points to match the {job.role} JD.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-surface border-2 border-primary ring-4 ring-background" />
                  <h4 className="font-medium text-sm">2. Form Navigation</h4>
                  <p className="text-xs text-muted-foreground mt-1">Navigate to {job.company} greenhouse portal and map form fields.</p>
                </div>
                <div className="relative opacity-50">
                  <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-muted border-2 border-border ring-4 ring-background" />
                  <h4 className="font-medium text-sm">3. Human Approval</h4>
                  <p className="text-xs text-muted-foreground mt-1">Pause for final review of data before submission.</p>
                </div>
              </div>
            </div>
          </div>
          )}

          {activeTab === "follow-ups" && (
            <div className="p-6 m-0 outline-none">
              {application?.emailCampaign ? (
                <FollowUpSequence campaign={application.emailCampaign} />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No Active Sequence</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                      Generate an intelligent follow-up sequence using your Career Memory to improve response rates.
                    </p>
                  </div>
                  <Button onClick={async () => {
                    await fetch('/api/v1/campaigns', { 
                      method: 'POST', 
                      body: JSON.stringify({ jobOpportunityId: job.id })
                    });
                    // Ideally, refresh graph state here
                  }}>Draft Sequence</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
