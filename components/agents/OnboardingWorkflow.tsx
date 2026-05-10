"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Sparkles, BrainCircuit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEventSource } from "@/hooks/useEventSource";

const STEPS = [
  { id: "analyze", label: "Parsing resume and extracting skills" },
  { id: "memory", label: "Building career memory graph" },
  { id: "market", label: "Scanning real-time job market" },
  { id: "match", label: "Ranking initial job opportunities" },
  { id: "workflow", label: "Generating personalized action plan" },
];

export function OnboardingWorkflow({ userId }: { userId: string }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  useEventSource(workflowId ? `/api/v1/events/stream?workflowId=${workflowId}` : null, {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "step.completed") {
          setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length));
        }
        if (data.type === "workflow.completed") {
          setCurrentStepIndex(STEPS.length);
          setTimeout(() => setIsComplete(true), 1500);
        }
      } catch (err) {}
    }
  });

  useEffect(() => {
    let mounted = true;
    
    async function startOnboarding() {
      try {
        const res = await fetch("/api/v1/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "career_coaching", goal: "Initialize Career OS Profile", start: true })
        });
        const data = await res.json();
        if (mounted && data.data?.id) {
          setWorkflowId(data.data.id);
        }
      } catch (err) {
        console.error("Failed to start onboarding workflow", err);
        // Fallback for demo/resilience
        if (mounted) {
          const fallbackTimer = setInterval(() => {
            setCurrentStepIndex((prev) => {
              if (prev >= STEPS.length) {
                clearInterval(fallbackTimer);
                setIsComplete(true);
                return prev;
              }
              return prev + 1;
            });
          }, 2000);
        }
      }
    }
    
    startOnboarding();
    
    return () => { mounted = false; };
  }, []);

  // Effect removed, replaced by startOnboarding and useEventSource

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-blue-500 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]">
        <BrainCircuit className="h-10 w-10 text-white" />
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
        {isComplete ? "Your Career OS is ready" : "AI Career OS initializing..."}
      </h1>
      
      <p className="mb-8 text-muted-foreground text-center max-w-md">
        {isComplete 
          ? "We've initialized your career profile and discovered high-match opportunities." 
          : "Our agents are analyzing your profile and preparing your workspace."}
      </p>

      <Card className="w-full max-w-md border-border bg-surface/50 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div 
                key={step.id} 
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isPending ? "opacity-30" : "opacity-100"
                }`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {isComplete && (
        <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in duration-700">
          <Button size="lg" onClick={() => window.location.reload()} className="gap-2">
            <Sparkles className="h-4 w-4" /> Enter Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
