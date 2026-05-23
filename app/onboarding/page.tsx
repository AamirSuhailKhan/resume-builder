"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, UploadCloud, Award, Sparkles, AlertTriangle, CheckCircle2, ChevronRight, FileCheck, Check } from "lucide-react";
import ResumeDropZone from "@/components/upload/ResumeDropZone";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { SkipOnboardingButton } from "@/components/onboarding/SkipOnboardingButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { detectCollegeTier } from "@/lib/data/tier1-colleges";

interface AnalysisReport {
  score: number;
  fixes: string[];
  strongSkills: string[];
  weakSignals: string[];
}

export default function OnboardingResumePage() {
  const router = useRouter();
  const [tier, setTier] = useState<'tier1' | 'tier2' | 'tier3' | null>(null);
  const [collegeName, setCollegeName] = useState<string>("");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [completedFixes, setCompletedFixes] = useState<Record<number, boolean>>({});

  const handleUploadSuccess = (result: any) => {
    const institution = result.previewData?.education?.[0]?.institution;
    if (institution) {
      const detectedTier = detectCollegeTier(institution);
      if (detectedTier === 'tier2' || detectedTier === 'tier3') {
        setTier(detectedTier);
        setCollegeName(institution);
      }
    }
    setResumeId(result.resumeId);
    setAnalysis(result.analysis || null);
  };

  const toggleFix = (index: number) => {
    setCompletedFixes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // 1. Loading / Idle Screen
  if (!analysis) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6">
        <OnboardingProgress currentStep={1} />

        <div className="grid gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-muted">
            <UploadCloud className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">Start with your resume</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Uploading a resume lets CareerOS extract your profile and compare it with active hiring requirements in the Indian tech market.
          </p>
        </div>

        <Card variant="elevated" className="border-2 border-dashed border-border hover:border-primary/30 transition-colors">
          <CardHeader>
            <CardTitle className="text-xl">Upload PDF Resume</CardTitle>
            <CardDescription>We will parse your skills, roles, and project metrics in under 5 seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResumeDropZone onSuccess={handleUploadSuccess} />
          </CardContent>
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-muted/50 p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">
              SDE
            </div>
            <div className="grid gap-1">
              <p className="text-xs italic text-muted-foreground">
                "Saved me hours of applying. The Razorpay interview intel matched my Round 2 exactly."
              </p>
              <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">
                — Placed at Swiggy • Verified Profile
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted/50 p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs">
              L4
            </div>
            <div className="grid gap-1">
              <p className="text-xs italic text-muted-foreground">
                "The Resume Equalizer helped me bypass the Tier-1 college filter. Got 3 callbacks in a week."
              </p>
              <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">
                — Tier-3 Grad • Verified Placement
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between mt-2">
          <SkipOnboardingButton />
          <Link href="/onboarding/preferences">
            <Button size="lg" className="w-full sm:w-auto">
              Continue Without Resume
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Instant Profile Analysis Screen (90-Second Aha Moment)
  const isActionRequired = analysis.score < 80;
  const strokeDashoffset = 251.2 - (251.2 * analysis.score) / 100;

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <OnboardingProgress currentStep={1} />

      {/* Header Banner */}
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-emerald-600">Resume Parsed Successfully</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">Your CareerOS Profile Assessment</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          We analyzed your resume structure and skills against current hiring signals in India's top tech hubs (Bengaluru, NCR, Mumbai).
        </p>
      </div>

      {/* College Equalizer Banner (Tier 2/3 Target alert) */}
      {tier && (
        <div className="flex items-start gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-900 dark:text-amber-200">
          <Award className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="grid gap-1">
            <p className="text-sm font-semibold">Equalizer Flag Triggered ({collegeName})</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Graduates from non-IIT/NIT institutions face aggressive Automated Screening (ATS) filtering. We recommend using our **Resume Equalizer** (re-organizes skills & projects upwards) to increase recruiter visibility.
            </p>
          </div>
        </div>
      )}

      {/* Main Analysis Card Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Score & Strongest Skills Card */}
        <Card variant="elevated" className="flex flex-col items-center justify-center p-6 text-center gap-6 md:col-span-1 border border-border bg-gradient-to-b from-surface via-surface to-surface-muted">
          <div className="relative flex items-center justify-center h-32 w-32">
            {/* SVG Circular Progress Bar */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="40"
                className="stroke-muted"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="40"
                className={isActionRequired ? "stroke-amber-500" : "stroke-emerald-500"}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-foreground">{analysis.score}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">ATS Score</span>
            </div>
          </div>

          <div className="grid gap-1">
            <p className="text-sm font-semibold text-foreground">
              {isActionRequired ? "Optimization Recommended" : "Excellent Job-Ready Score"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isActionRequired ? "Fixing these 3 high-impact gaps increases interview chances by 47%." : "Your profile shows strong technical structure."}
            </p>
          </div>

          {/* Strongest Skills */}
          <div className="w-full border-t border-border pt-4 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Verified Strengths
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {analysis.strongSkills.map((skill, i) => (
                <Badge key={i} variant="primary" className="bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Gaps and Fixes Card */}
        <Card variant="elevated" className="md:col-span-2 p-6 flex flex-col justify-between border border-border">
          <div className="grid gap-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-accent" />
                3 Critical Profile Gaps to Fix
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Click to resolve or preview changes. You can automate these updates in our builder.
              </p>
            </div>

            {/* Checklist items */}
            <div className="grid gap-3.5">
              {analysis.fixes.map((fix, idx) => {
                const checked = !!completedFixes[idx];
                return (
                  <div
                    key={idx}
                    role="button"
                    onClick={() => toggleFix(idx)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      checked 
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
                        : "border-border hover:border-primary/20 bg-surface-muted"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      checked 
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border-strong bg-surface"
                    }`}>
                      {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div className="grid gap-0.5">
                      <span className={`text-sm leading-relaxed ${checked ? "line-through opacity-60" : ""}`}>
                        {fix}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weak Hiring Signals */}
            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Weakest Recruiter Signals Detected
              </h3>
              <ul className="grid gap-2 text-xs text-muted-foreground pl-1">
                {analysis.weakSignals.map((signal, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* CTA Control Panel */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-border pt-6 mt-4">
        <SkipOnboardingButton />
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto hover:bg-surface-muted"
            onClick={() => router.push("/onboarding/preferences")}
          >
            Skip to Job Matches
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            size="lg"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium shadow-md shadow-primary/20"
            onClick={() => router.push(`/builder?id=${resumeId}&optimize=true`)}
          >
            Fix Gaps Instantly in Builder
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
