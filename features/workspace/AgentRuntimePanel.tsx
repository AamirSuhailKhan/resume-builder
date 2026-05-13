"use client";

import { OpportunityGraph } from "@/lib/domain/opportunities/opportunity-graph.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Terminal, MonitorPlay, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AgentRuntimePanel({ graph }: { graph: OpportunityGraph }) {
  const { workflows } = graph;
  const activeWorkflow = workflows.find(w => w.status === "running" || w.status === "waiting_for_approval");
  const isRunning = activeWorkflow?.status === "running";
  const isPaused = activeWorkflow?.status === "waiting_for_approval";

  return (
    <div className="space-y-4">
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader className="border-b border-border bg-surface/50 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 text-primary" />
              Live Agent Runtime
            </span>
            {isRunning && (
              <Badge variant="success" className="animate-pulse">
                <Activity className="w-3 h-3 mr-1" /> Active
              </Badge>
            )}
            {isPaused && (
              <Badge variant="warning">
                <AlertCircle className="w-3 h-3 mr-1" /> Paused
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Watch the AI navigate and execute in real-time.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Browser Thumbnail Area */}
          <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden group">
            {isRunning ? (
              <>
                <img src="/placeholder-browser.jpg" alt="Live browser view" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                    <Terminal className="w-3 h-3" /> Filling input[name="first_name"]...
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground/50 space-y-2">
                <MonitorPlay className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs font-mono">Browser session inactive</p>
              </div>
            )}
            
            {/* Overlay if paused */}
            {isPaused && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <div>
                  <h4 className="font-semibold text-foreground">Action Required</h4>
                  <p className="text-xs text-muted-foreground mt-1">Agent paused for final human review before submission.</p>
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1">Take Over</Button>
                  <Button size="sm" className="flex-1">Approve</Button>
                </div>
              </div>
            )}
          </div>

          {/* Execution Timeline */}
          <div className="p-4 bg-surface max-h-[300px] overflow-y-auto">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Execution Timeline</h4>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              
              {/* Mock Timeline Events */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-primary bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10"></div>
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-surface-muted p-2 rounded border border-border">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-xs text-foreground">Navigated to Greenhouse</span>
                    <span className="text-[10px] text-muted-foreground">10:42 AM</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">"Located the application form for Senior React Developer."</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-emerald-500 bg-emerald-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-surface-muted p-2 rounded border border-border">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-xs text-foreground">Booted Browser Session</span>
                    <span className="text-[10px] text-muted-foreground">10:41 AM</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">"Initialized authenticated Playwright context."</p>
                </div>
              </div>

              {!isRunning && !isPaused && (
                <div className="text-center text-xs text-muted-foreground py-4 italic">
                  Agent is waiting to start.
                </div>
              )}

            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
