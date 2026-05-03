"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { FileText, ArrowRight, Zap } from "lucide-react";
import { JDInput } from "@/components/job-intelligence/JDInput";
import { ProgressIndicator } from "@/components/job-intelligence/ProgressIndicator";
import { ResultsSection } from "@/components/job-intelligence/ResultsSection";
import { MarketOverview, MarketOverviewSkeleton } from "@/components/job-intelligence/MarketOverview";
import { MatchScoreCard, MatchScoreCardSkeleton } from "@/components/job-intelligence/MatchScoreCard";
import { MissingSkills, MissingSkillsSkeleton } from "@/components/job-intelligence/MissingSkills";
import { InsightBanner, InsightBannerSkeleton } from "@/components/job-intelligence/InsightBanner";
import { SalaryCard, SalaryCardSkeleton } from "@/components/job-intelligence/SalaryCard";
import { ActionLayer } from "@/components/job-intelligence/ActionLayer";
import { JobIntelligenceOutput } from "@/lib/job-intelligence/types";
import { analyzeJobDescriptions, getJobInsights } from "@/lib/job-intelligence/client";
import { useResumeStore, selectActiveResume, selectIsHydrated, selectHydrate } from "@/store/useResumeStore";
import { formatDistanceToNow } from "date-fns";

export default function JobIntelligencePage() {
  const [insights, setInsights] = useState<JobIntelligenceOutput | null>(null);
  const [step, setStep] = useState<"idle" | "parsing" | "analyzing" | "computing" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [jobCount, setJobCount] = useState<number>(0);

  // Resume data
  const isHydrated = useResumeStore(selectIsHydrated);
  const hydrate = useResumeStore(selectHydrate);
  const activeResume = useResumeStore(selectActiveResume);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate();
  }, [hydrate]);

  // Try to load cached insights on mount
  useEffect(() => {
    const cached = localStorage.getItem("job_insights_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.data) {
          setInsights(parsed.data);
          setLastUpdated(parsed.timestamp);
          setJobCount(parsed.jobCount || 0);
          setStep("success");
        } else {
          // Backward compatibility
          setInsights(parsed);
          setStep("success");
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleAnalyze = useCallback(async (jds: string[]) => {
    if (!activeResume) {
      setError("Please create and select a resume in the Builder first.");
      return;
    }

    setStep("parsing");
    setError(null);

    try {
      // 1. Analyze JDs (persists to backend/in-memory)
      await new Promise(r => setTimeout(r, 600)); // smooth UI transition
      setStep("analyzing");
      await analyzeJobDescriptions(jds);

      // 2. Fetch personalized insights
      setStep("computing");
      await new Promise(r => setTimeout(r, 600)); // smooth UI transition
      const data = await getJobInsights(activeResume, { forceRefresh: true });
      
      const now = Date.now();
      setInsights(data);
      setLastUpdated(now);
      setJobCount(jds.length);
      localStorage.setItem("job_insights_cache", JSON.stringify({
        data,
        timestamp: now,
        jobCount: jds.length
      }));
      setStep("success");
      
      // Scroll to insights
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      setError(err.message || "Failed to analyze jobs. Please try again.");
      setStep("idle");
    }
  }, [activeResume]);

  if (!isHydrated) {
    return <div className="p-8 text-gray-500">Loading workspace...</div>;
  }

  const hasData = !!insights;
  const isLoading = step === "parsing" || step === "analyzing" || step === "computing";

  // Convert demand_frequency map to sorted array for MarketOverview
  const topSkills = hasData 
    ? insights.top_skills.map(s => ({ skill: s, percentage: insights.demand_frequency[s] || 0 }))
    : [];
    
  const topTools = hasData
    ? insights.top_tools.map(s => ({ skill: s, percentage: insights.demand_frequency[s] || 0 }))
    : [];

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-12 animate-in fade-in duration-500 pb-24">
      
      {/* Header with Resume Integration */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Job Intelligence</h1>
          <p className="text-gray-500 mt-1">AI-powered market analysis and skill gap detection.</p>
        </div>

        {activeResume && (
          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Resume</span>
                <span className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                  {activeResume.title || "Untitled Resume"}
                </span>
              </div>
            </div>
            <Link href="/dashboard" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              Change <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-600 border border-rose-100">
          {error}
        </div>
      )}

      {/* 1. JD Input */}
      <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 relative z-10">
        <JDInput onAnalyze={handleAnalyze} step={step} />
      </div>

      {/* Progress Feedback */}
      <ProgressIndicator step={step} />

      {/* Empty State UX */}
      {!hasData && !isLoading && step === "idle" && (
        <div className="py-20 text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-indigo-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Analyze</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Paste job descriptions above and click Analyze Market to reveal top skills, salary ranges, and your missing gaps.
          </p>
        </div>
      )}

      {/* Results Section */}
      {(hasData || isLoading) && (
        <ResultsSection>
          
          {/* F. METADATA ROW */}
          {!isLoading && lastUpdated && (
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                Last analyzed: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
              <span className={`px-2.5 py-1 rounded-md ${jobCount >= 5 ? 'bg-emerald-100 text-emerald-700' : jobCount >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                Confidence: {jobCount >= 5 ? 'High' : jobCount >= 3 ? 'Medium' : 'Low'}
              </span>
            </div>
          )}

          {/* 5. Insight Banner (Hero) */}
          {isLoading ? <InsightBannerSkeleton /> : <InsightBanner insight={insights!.market_insight} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Market Overview (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 px-1">Market Overview</h2>
              {isLoading ? (
                <MarketOverviewSkeleton />
              ) : (
                <MarketOverview 
                  topSkills={topSkills} 
                  topTools={topTools} 
                  totalJobs={(insights as any)?._meta?.totalJobs || 0} 
                />
              )}
            </div>

            {/* Right Column: Score, Gaps, Salary (1/3 width) */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 px-1">Your Profile</h2>
              
              {/* 3. Match Score */}
              {isLoading ? (
                <MatchScoreCardSkeleton />
              ) : (
                <MatchScoreCard 
                  score={insights!.user_match_score} 
                  matchedSkills={Object.keys(insights!.demand_frequency).filter(s => !insights!.missing_skills.includes(s))}
                />
              )}

              {/* 4. Missing Skills */}
              {isLoading ? (
                <MissingSkillsSkeleton />
              ) : (
                <MissingSkills skills={insights!.missing_skills} />
              )}

              {/* 6. Salary Card */}
              {isLoading ? (
                <SalaryCardSkeleton />
              ) : (
                <SalaryCard salary={insights!.salary_estimate} />
              )}
            </div>

          </div>

          {/* 3. ACTION LAYER */}
          {!isLoading && activeResume && <ActionLayer activeResumeId={activeResume.id} />}

        </ResultsSection>
      )}

    </div>
  );
}
