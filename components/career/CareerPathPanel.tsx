"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, AlertTriangle, ChevronDown, ChevronRight, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrajectoryPath {
  path: string;
  probability: number;
  avgTimeYears: number;
  nextRoles: string[];
  salaryGrowthPct: number;
  likelihood: "high" | "medium" | "low";
}

interface Simulation {
  id: string;
  currentRole: string;
  goalIn5Years: string;
  trajectoryPaths: TrajectoryPath[];
  careerAlignScore: number;
  alignRationale: string;
  riskFactors: string[];
  opportunities: string[];
  skillsGained: string[];
  skillsMissing: string[];
  verdict: "strong_yes" | "yes" | "sideways" | "risky" | "step_back";
}

const VERDICT_CONFIG = {
  strong_yes: { label: "🎯 Strong alignment with your 5-year goal", color: "bg-teal-50 border-teal-200 text-teal-800" },
  yes:        { label: "✓ Good alignment",                          color: "bg-green-50 border-green-200 text-green-800" },
  sideways:   { label: "↔ Lateral move — not toward your goal",     color: "bg-amber-50 border-amber-200 text-amber-800" },
  risky:      { label: "⚠ High risk move",                          color: "bg-orange-50 border-orange-200 text-orange-800" },
  step_back:  { label: "⬇ Step backward from your trajectory",      color: "bg-red-50 border-red-200 text-red-800" },
};

const LIKELIHOOD_BADGE = {
  high:   "bg-teal-100 text-teal-800",
  medium: "bg-amber-100 text-amber-800",
  low:    "bg-gray-100 text-gray-500",
};

interface CareerPathPanelProps {
  jobOpportunityId: string;
  jobTitle: string;
  company: string;
}

export function CareerPathPanel({ jobOpportunityId, jobTitle, company }: CareerPathPanelProps) {
  const [status, setStatus] = useState<"idle" | "goal_prompt" | "loading" | "success" | "error">("idle");
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [openPath, setOpenPath] = useState(0);
  const [cached, setCached] = useState(false);

  const runSimulation = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/career-path/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole: jobTitle, targetCompany: company, jobOpportunityId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? `API error ${res.status}`);
      setSimulation(json.data);
      setCached(Boolean(json.cached));
      setStatus("success");
    } catch (err) {
      console.error("[CareerPathPanel]", err);
      setStatus("error");
    }
  };

  // On mount: check if 5-year goal is set, then kick off simulation
  useEffect(() => {
    const checkGoal = async () => {
      try {
        const res = await fetch("/api/v1/career-profile");
        const json = await res.json();
        const goals = json.data?.goals as any;
        if (!goals?.targetIn5Years) {
          setStatus("goal_prompt");
        } else {
          runSimulation();
        }
      } catch {
        runSimulation(); // gracefully continue even if profile fetch fails
      }
    };
    checkGoal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveGoal = async () => {
    if (!goalInput.trim()) return;
    setSavingGoal(true);
    try {
      await fetch("/api/v1/career-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: { targetIn5Years: goalInput.trim() } }),
      });
      runSimulation();
    } catch {
      runSimulation();
    } finally {
      setSavingGoal(false);
    }
  };

  // ── Goal Prompt ────────────────────────────────────────────────────────────
  if (status === "goal_prompt") {
    return (
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Target className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900">Set your 5-year goal</h4>
            <p className="text-xs text-gray-500">To simulate career alignment, we need to know your direction.</p>
          </div>
        </div>
        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="e.g., Senior Engineering Manager at a startup, or Staff Engineer at a FAANG"
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveGoal()}
        />
        <div className="flex gap-2">
          <Button onClick={saveGoal} disabled={savingGoal || !goalInput.trim()} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-xl">
            {savingGoal ? "Saving..." : "Save & Simulate"}
          </Button>
          <Button onClick={runSimulation} variant="outline" className="h-10 rounded-xl text-sm font-medium">
            Skip
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 animate-pulse">Simulating career trajectories...</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-rose-800 mb-3">Simulation failed. Try again.</p>
        <Button onClick={runSimulation} variant="outline" className="h-9 text-sm font-bold rounded-xl border-rose-200">
          Retry
        </Button>
      </div>
    );
  }

  if (!simulation) return null;

  const verdictConfig = VERDICT_CONFIG[simulation.verdict] ?? VERDICT_CONFIG.sideways;
  const hasGoal = simulation.goalIn5Years !== "Not specified";

  return (
    <div className="space-y-5 p-1">
      {/* Cached badge */}
      {cached && (
        <p className="text-[10px] text-gray-400 font-medium text-right">Cached simulation · {new Date().toLocaleDateString()}</p>
      )}

      {/* Verdict Banner */}
      <div className={`p-4 rounded-2xl border font-semibold text-sm ${verdictConfig.color}`}>
        {verdictConfig.label}
      </div>

      {/* Align Score */}
      {hasGoal ? (
        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl font-black text-gray-900">{Math.round(simulation.careerAlignScore)}</span>
            <span className="text-sm text-gray-500 font-medium mb-1">/ 100 career alignment</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-700"
              style={{ width: `${simulation.careerAlignScore}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{simulation.alignRationale}</p>
        </div>
      ) : (
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-700 font-medium">
          Set your 5-year goal above to see your alignment score.
        </div>
      )}

      {/* Trajectory Paths */}
      <div>
        <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Career Trajectories</h4>
        <div className="space-y-2">
          {simulation.trajectoryPaths.map((path, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenPath(openPath === idx ? -1 : idx)}
                className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold capitalize text-gray-800">{path.path}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${LIKELIHOOD_BADGE[path.likelihood] ?? LIKELIHOOD_BADGE.low}`}>
                    {path.likelihood}
                  </span>
                  <span className="text-xs text-gray-400">{Math.round(path.probability * 100)}% probability</span>
                </div>
                {openPath === idx ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
              </button>

              {openPath === idx && (
                <div className="px-4 pb-4 pt-3 bg-white">
                  {/* Role Pill Timeline */}
                  <div className="flex items-center gap-1 flex-wrap mb-4">
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-full">
                      {simulation.currentRole}
                    </span>
                    {path.nextRoles.slice(0, 4).map((role, ri) => (
                      <span key={ri} className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">→</span>
                        <span className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                          {role}
                        </span>
                      </span>
                    ))}
                    {hasGoal && (
                      <span className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">→</span>
                        <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1.5 rounded-full border border-teal-200">
                          🎯 {simulation.goalIn5Years.slice(0, 30)}{simulation.goalIn5Years.length > 30 ? "..." : ""}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>⏱ ~{path.avgTimeYears} years</span>
                    <span>💰 Salary growth: +{path.salaryGrowthPct}% over 4 years</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2">Skills you'll gain</h4>
          <div className="flex flex-wrap gap-1.5">
            {simulation.skillsGained.slice(0, 8).map((s, i) => (
              <span key={i} className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium px-2 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Won't develop</h4>
          <div className="flex flex-wrap gap-1.5">
            {simulation.skillsMissing.slice(0, 8).map((s, i) => (
              <span key={i} className="bg-gray-50 text-gray-500 border border-gray-200 text-xs font-medium px-2 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Risk & Opportunities */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Risk Factors
          </h4>
          <ul className="space-y-1">
            {simulation.riskFactors.slice(0, 5).map((r, i) => (
              <li key={i} className="text-xs text-rose-700 flex gap-1.5">
                <span className="text-rose-300 mt-0.5">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Opportunities
          </h4>
          <ul className="space-y-1">
            {simulation.opportunities.slice(0, 5).map((o, i) => (
              <li key={i} className="text-xs text-teal-700 flex gap-1.5">
                <span className="text-teal-400 mt-0.5">•</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
