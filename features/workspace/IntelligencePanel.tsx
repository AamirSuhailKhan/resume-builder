"use client";

import { OpportunityGraph } from "@/lib/domain/opportunities/opportunity-graph.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ghost, ShieldAlert, ShieldCheck, Target, Network, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IntelligencePanel({ graph }: { graph: OpportunityGraph }) {
  const { job, connections } = graph;
  
  // Parse match reasoning from job.parsed if available
  const parsedData = job.parsed as any;
  const matchReasoning = parsedData?.matchReasoning || [
    { text: "Strong overlap in React and TypeScript experience.", memorySource: "Based on your frontend engineer role at TechCorp" },
    { text: "Previous experience leading small teams aligns with Senior role requirements.", memorySource: "Derived from your 2022-2024 Tech Lead promotion" }
  ];

  return (
    <div className="space-y-4">
      {/* Ghost Intelligence */}
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {job.ghostScore > 50 ? <Ghost className="w-4 h-4 text-red-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
            Opportunity Validity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-2xl font-bold">{100 - job.ghostScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {job.ghostScore > 50 ? "High probability of being a ghost job." : "Appears to be a real, actively hiring role."}
              </p>
            </div>
            {job.ghostScore > 50 && (
              <Button variant="outline" size="sm" className="text-xs text-red-500 border-red-200">
                View Signals
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Match Reasoning with Memory Attribution */}
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Match Reasoning ({job.matchScore}%)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {matchReasoning.map((reason: any, idx: number) => (
            <div key={idx} className="space-y-1">
              <p className="text-sm text-foreground">{reason.text}</p>
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-surface-muted p-2 rounded-md border border-border">
                <Search className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                <span className="italic">{reason.memorySource}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Networking */}
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            Networking Paths
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length > 0 ? (
            <div className="space-y-3">
              {connections.slice(0, 3).map((conn) => (
                <div key={conn.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{conn.personName}</span>
                    {conn.confidenceTier === "verified" ? (
                      <Badge variant="success" className="text-[10px] py-0"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified</Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px] py-0"><ShieldAlert className="w-3 h-3 mr-1"/> Inferred</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{conn.personTitle}</p>
                  <div className="text-xs bg-muted/30 p-2 rounded italic text-muted-foreground border-l-2 border-primary/40">
                    <span className="font-medium not-italic text-foreground block mb-0.5">Why am I seeing this?</span>
                    {conn.sharedContext}
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-1">
                    Draft Outreach
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No high-confidence networking paths found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
