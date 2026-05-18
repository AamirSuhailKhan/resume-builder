"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, Circle, ExternalLink, GraduationCap, ArrowRight, BookOpen, AlertCircle, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SkillGapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") || "";

  const [role, setRole] = useState(initialRole);
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!role) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/skill-gap/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole: role, targetCompany: company }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (skillName: string) => {
    if (!analysis) return;
    try {
      const res = await fetch(`/api/v1/skill-gap/${analysis.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderConfidenceBadge = (confidence: string) => {
    switch(confidence) {
      case "strong": return <Badge variant="success" className="text-[10px]">Strong</Badge>;
      case "working": return <Badge variant="primary" className="text-[10px]">Working</Badge>;
      case "basic": return <Badge variant="warning" className="text-[10px]">Basic</Badge>;
      case "missing": return <Badge variant="danger" className="text-[10px]">Missing</Badge>;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-indigo-500" />
          Capability Gap Intelligence
        </h1>
        <p className="text-muted-foreground">Personalized market-aware progression and learning paths.</p>
      </div>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">Target Role</label>
              <input
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">Target Company <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Stripe"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !role} className="h-10 w-full md:w-auto">
              {loading ? "Researching Market..." : "Analyze Gap"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="w-10 h-10 animate-bounce mb-4 text-indigo-500" />
          <p>Extracting market requirements for {role}...</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Skill Gap Radar</CardTitle>
                <CardDescription>Market-weighted demand vs your current capabilities.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Required Capabilities</h4>
                  <div className="space-y-3">
                    {analysis.requiredSkills?.map((skill: any, idx: number) => {
                      const haveIt = skill.confidence !== "missing";
                      const demandScore = skill.marketDemandScore || 5;
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-muted/50">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm text-foreground flex items-center gap-2">
                              {skill.name} {renderConfidenceBadge(skill.confidence)}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              Demand Score: {demandScore}/10
                            </span>
                          </div>
                          <div>
                            {haveIt ? (
                              <Badge variant="success"><ShieldCheck className="w-3 h-3 mr-1" /> Have it</Badge>
                            ) : (
                              <Badge variant="danger"><ShieldAlert className="w-3 h-3 mr-1" /> Missing</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Timeline ({analysis.estimatedWeeks} Weeks)</CardTitle>
                <CardDescription>Project-based learning sequence for missing capabilities.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative border-l border-border ml-3 space-y-8 pb-4">
                  {analysis.learningPath?.map((step: any, idx: number) => {
                    const isCompleted = analysis.completedSkills?.includes(step.skill);
                    return (
                      <div key={idx} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 bg-background cursor-pointer" onClick={() => handleComplete(step.skill)}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-indigo-500 transition-colors" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="neutral" className="text-xs uppercase">Week {step.week}</Badge>
                          <span className="font-semibold text-sm text-foreground">{step.skill}</span>
                        </div>
                        
                        <div className="bg-surface-muted/30 border border-border rounded-lg p-4 mb-3">
                          <h5 className="text-sm font-medium mb-1">Resource</h5>
                          <a href={step.resource.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:underline flex items-center gap-1 mb-2">
                            {step.resource.title} <ExternalLink className="w-3 h-3" />
                          </a>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{step.resource.platform}</span>
                            <span>•</span>
                            <span>{step.resource.durationHours} hrs</span>
                            <span>•</span>
                            <span className="capitalize">{step.resource.type}</span>
                          </div>
                        </div>

                        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                          <h5 className="text-sm font-medium mb-1 text-accent-foreground">Validation Project</h5>
                          <p className="text-sm text-muted-foreground italic">{step.projectIdea}</p>
                          <p className="text-xs font-semibold mt-3 text-accent-foreground">Milestone: {step.milestone}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Completion</span>
                  <span className="text-sm font-bold text-foreground">{Math.round(analysis.progressPct)}%</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-2.5">
                  <div className="bg-success h-2.5 rounded-full transition-all duration-500" style={{ width: `${analysis.progressPct}%` }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  {analysis.completedSkills?.length || 0} of {analysis.learningPath?.length || 0} skills validated.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-between" onClick={() => router.push(`/matches?role=${role}`)}>
                  Find {role} jobs <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/builder")}>
                  Update Resume <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
