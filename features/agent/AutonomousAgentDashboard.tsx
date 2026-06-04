"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Brain, Send, RefreshCw, Target, Activity, Award, Compass, Clock, CheckCircle2, AlertTriangle, Lightbulb, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import type { CareerRoadmap, AgentExecutionReport, WeeklyAdaptationReport } from "@/lib/agent/types";
import { AgentAnalysisPanel, type AnalysisData } from "./AgentAnalysisPanel";

type Tab = "roadmap" | "analysis" | "memory" | "log";
type PlanFilter = "all" | "skill_acquisition" | "project_build" | "certification" | "networking" | "application" | "interview_prep";

const BADGE: Record<string, string> = {
  skill_acquisition: "bg-purple-950/60 text-purple-300 border-purple-800/30",
  project_build: "bg-cyan-950/60 text-cyan-300 border-cyan-800/30",
  certification: "bg-amber-950/60 text-amber-300 border-amber-800/30",
  networking: "bg-blue-950/60 text-blue-300 border-blue-800/30",
  application: "bg-emerald-950/60 text-emerald-300 border-emerald-800/30",
  interview_prep: "bg-pink-950/60 text-pink-300 border-pink-800/30",
};

export function AutonomousAgentDashboard() {
  const [tab, setTab] = useState<Tab>("roadmap");
  const [goalInput, setGoalInput] = useState("");
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [execReport, setExecReport] = useState<AgentExecutionReport | null>(null);
  const [adapting, setAdapting] = useState(false);
  const [adaptReport, setAdaptReport] = useState<WeeklyAdaptationReport | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [progress, setProgress] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<PlanFilter>("all");
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1]));
  const [primaryGoal, setPrimaryGoal] = useState<any>(null);

  const refresh = useCallback(async () => {
    try {
      const [statusRes, memRes] = await Promise.all([
        fetch("/api/v1/agent/status"),
        fetch("/api/v1/agent/memory"),
      ]);
      if (statusRes.ok) {
        const d = await statusRes.json();
        if (d.status?.roadmap) setRoadmap(d.status.roadmap);
        if (d.status?.progress) setProgress(d.status.progress);
        if (d.status?.primaryGoal) setPrimaryGoal(d.status.primaryGoal);
        if (d.status?.currentWeek) setCurrentWeek(d.status.currentWeek);
      }
      if (memRes.ok) {
        const d = await memRes.json();
        if (d.memories) setMemories(d.memories);
      }
    } catch {}
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    setLoading(true);
    setExecReport(null);
    try {
      const res = await fetch("/api/v1/agent/goal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalInput }),
      });
      if (res.ok) {
        const d = await res.json();
        setExecReport(d.report);
        await refresh();
        setTab("roadmap");
      }
    } catch {}
    setLoading(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/v1/agent/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: primaryGoal?.targetRole ?? roadmap?.targetRole ?? "Software Engineer",
          targetCompany: primaryGoal?.targetCompany ?? roadmap?.targetCompany,
          timelineMonths: primaryGoal ? Math.ceil((primaryGoal.timelineWeeks ?? 48) / 4) : 12,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setAnalysis(d.analysis);
        setTab("analysis");
      }
    } catch {}
    setAnalyzing(false);
  };

  const handleToggle = async (taskId: string) => {
    if (!roadmap) return;
    const res = await fetch("/api/v1/agent/task/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roadmapId: roadmap.id, taskId }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.roadmap) setRoadmap(d.roadmap);
      await refresh();
    }
  };

  const handleAdapt = async () => {
    setAdapting(true);
    const res = await fetch("/api/v1/agent/adapt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentWeekNumber: currentWeek }),
    });
    if (res.ok) {
      const d = await res.json();
      setAdaptReport(d.report);
      await refresh();
    }
    setAdapting(false);
  };

  const togglePhase = (n: number) => {
    setExpandedPhases(prev => {
      const s = new Set(prev);
      s.has(n) ? s.delete(n) : s.add(n);
      return s;
    });
  };

  const allTasks = roadmap?.phases.flatMap(p => p.weeklyPlans.flatMap(w => w.actionItems.map(t => ({ ...t, weekNumber: w.weekNumber, phaseTitle: p.title })))) ?? [];
  const filteredTasks = filter === "all" ? allTasks : allTasks.filter(t => t.type === filter);
  const total = allTasks.length;
  const done = allTasks.filter(t => t.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const renderTabBtn = (id: Tab, label: string) => (
    <button onClick={() => setTab(id)}
      className={`px-4 py-2 text-xs font-extrabold rounded-xl border transition-all ${tab === id ? "bg-purple-950/60 text-purple-200 border-purple-500/40" : "bg-transparent text-slate-400 border-transparent hover:text-white"}`}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#030307] text-slate-100 font-sans p-6 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-950/30 px-3 py-1 text-xs font-semibold text-purple-300">
            <Brain className="h-3.5 w-3.5 animate-pulse" /> Autonomous Intelligence Suite
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            AI Career Manager
          </h1>
          <p className="text-slate-400 text-sm">Persistent AI that analyzes, plans, and tracks your career path autonomously.</p>
        </div>
        {roadmap && (
          <button onClick={handleAnalyze} disabled={analyzing}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl shadow-lg transition-all">
            <Activity className={`h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analyzing..." : "Run Deep Analysis"}
          </button>
        )}
      </div>

      {/* GOAL ACTIVATION */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" /> Career Goal
            </h2>
            {primaryGoal && (
              <p className="text-xs text-purple-300 mt-1 font-medium">
                Active: {primaryGoal.targetRole}{primaryGoal.targetCompany ? ` @ ${primaryGoal.targetCompany}` : ""} · {Math.ceil((primaryGoal.timelineWeeks ?? 48) / 4)}mo
              </p>
            )}
          </div>
          {progress && (
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-[10px] text-slate-500 font-black uppercase">Streak</div>
                <div className="text-lg font-black text-white">{progress.activeStreak}<span className="text-xs text-slate-400 ml-1">days</span></div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-black uppercase">Readiness</div>
                <div className="text-lg font-black text-emerald-400">{Math.round(progress.readinessScore)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-black uppercase">Progress</div>
                <div className="text-lg font-black text-purple-400">{pct}%</div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleGoal} className="flex gap-3">
          <input value={goalInput} onChange={e => setGoalInput(e.target.value)} disabled={loading}
            placeholder="e.g. I want a Backend Engineer role at Google within 12 months"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors" />
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase px-5 py-3 rounded-xl transition-all whitespace-nowrap">
            {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Running...</> : <><Send className="h-4 w-4" /> Deploy Agent</>}
          </button>
        </form>

        {roadmap && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase">
              <span>Overall Completion</span><span>{done}/{total} tasks · {pct}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      {!roadmap && !loading ? (
        <div className="bg-slate-950 border border-dashed border-slate-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Compass className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-white">No Active Goal</h3>
          <p className="text-xs text-slate-500 max-w-sm">Enter your career target above and deploy the agent to generate your personalized roadmap.</p>
        </div>
      ) : roadmap ? (
        <div className="space-y-6">
          {/* TAB BAR */}
          <div className="flex flex-wrap items-center gap-2">
            {renderTabBtn("roadmap", "Weekly Roadmap")}
            {renderTabBtn("analysis", "Deep Analysis")}
            {renderTabBtn("memory", "Memory Vault")}
            {renderTabBtn("log", "Agent Log")}
          </div>

          {/* ROADMAP TAB */}
          {tab === "roadmap" && (
            <div className="space-y-6">
              {/* Plan Filters */}
              <div className="flex flex-wrap gap-2">
                {(["all","skill_acquisition","project_build","certification","networking","application","interview_prep"] as PlanFilter[]).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all ${filter === f ? "bg-slate-800 text-white border-slate-700" : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"}`}>
                    {f === "all" ? "All Tasks" : f.replace("_", " ")}
                  </button>
                ))}
              </div>

              {filter === "all" ? (
                /* Phase view */
                roadmap.phases.map(phase => (
                  <div key={phase.phaseNumber} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <button onClick={() => togglePhase(phase.phaseNumber)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-900/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase bg-purple-950/60 text-purple-300 border border-purple-800/30 px-2 py-0.5 rounded-full">Phase {phase.phaseNumber}</span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{phase.title}</h3>
                          <p className="text-[11px] text-slate-400">{phase.focus}</p>
                        </div>
                      </div>
                      {expandedPhases.has(phase.phaseNumber) ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                    </button>
                    {expandedPhases.has(phase.phaseNumber) && (
                      <div className="px-5 pb-5 space-y-4 border-t border-slate-900">
                        {phase.weeklyPlans.map(week => (
                          <div key={week.weekNumber} className="pt-4">
                            <h4 className={`text-xs font-extrabold mb-3 flex items-center justify-between ${week.weekNumber === currentWeek ? "text-purple-400" : "text-slate-400"}`}>
                              <span>Week {week.weekNumber}: {week.focus}</span>
                              {week.weekNumber === currentWeek && <span className="text-[9px] bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded-full animate-pulse">Active</span>}
                            </h4>
                            <div className="space-y-2">
                              {week.actionItems.map(task => (
                                <div key={task.id} className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-900 hover:border-slate-800 transition-all">
                                  <input type="checkbox" checked={task.completed} onChange={() => handleToggle(task.id)}
                                    className="mt-0.5 cursor-pointer accent-purple-500 h-4 w-4 flex-shrink-0" />
                                  <div className="flex-grow space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${BADGE[task.type] ?? "bg-slate-900 text-slate-400 border-slate-800"}`}>
                                        {task.type.replace("_"," ")}
                                      </span>
                                      <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{task.estimatedHours}h</span>
                                    </div>
                                    <p className={`text-xs font-semibold leading-snug ${task.completed ? "line-through text-slate-500" : "text-white"}`}>{task.title}</p>
                                    <p className="text-[10px] text-slate-400 leading-normal">{task.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Filtered flat view */
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white capitalize">{filter.replace(/_/g," ")} Plan</h3>
                  {filteredTasks.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No tasks in this category.</p>
                  ) : filteredTasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-900">
                      <input type="checkbox" checked={task.completed} onChange={() => handleToggle(task.id)}
                        className="mt-0.5 cursor-pointer accent-purple-500 h-4 w-4 flex-shrink-0" />
                      <div className="flex-grow space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${BADGE[task.type] ?? "bg-slate-900 text-slate-400 border-slate-800"}`}>
                            {task.type.replace("_"," ")}
                          </span>
                          <span className="text-[10px] text-slate-500">Week {task.weekNumber} · {task.phaseTitle}</span>
                        </div>
                        <p className={`text-xs font-semibold ${task.completed ? "line-through text-slate-500" : "text-white"}`}>{task.title}</p>
                        <p className="text-[10px] text-slate-400">{task.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Adapt Controls */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <div>
                  <p className="text-xs font-bold text-white">Week {currentWeek} Sync</p>
                  <p className="text-[10px] text-slate-500">Adapt roadmap based on this week's activity</p>
                </div>
                <button onClick={handleAdapt} disabled={adapting}
                  className="flex items-center gap-2 border border-purple-500/40 text-purple-400 hover:bg-purple-950/20 font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all">
                  <RefreshCw className={`h-3.5 w-3.5 ${adapting ? "animate-spin" : ""}`} />
                  {adapting ? "Syncing..." : "Run Adaptation"}
                </button>
              </div>

              {adaptReport && (
                <div className="bg-slate-950 border border-purple-500/20 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" /> Adaptation Report · Week {adaptReport.originalWeekNumber}→{adaptReport.adaptationWeekNumber}
                  </h3>
                  <p className="text-xs text-slate-300">{adaptReport.reasonsForChange.join(" ")}</p>
                  <div className="space-y-2">
                    {adaptReport.adjustmentsMade.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-xl text-xs">
                        <span className="bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0">{a.type.replace("_"," ")}</span>
                        <span className="text-slate-300">{a.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANALYSIS TAB */}
          {tab === "analysis" && (
            <div>
              {analysis ? (
                <AgentAnalysisPanel analysis={analysis} />
              ) : (
                <div className="bg-slate-950 border border-dashed border-slate-800 rounded-2xl p-16 flex flex-col items-center text-center space-y-4">
                  <Activity className="h-10 w-10 text-slate-600" />
                  <h3 className="text-base font-bold text-white">No Analysis Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm">Click "Run Deep Analysis" in the header to generate a 6-dimensional intelligence report.</p>
                  <button onClick={handleAnalyze} disabled={analyzing}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl">
                    {analyzing ? "Analyzing..." : "Run Deep Analysis"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MEMORY TAB */}
          {tab === "memory" && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" /> Permanent Memory Vault
              </h3>
              {memories.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">Memory vault is empty. Activate goals to build permanent context.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {memories.map(m => (
                    <div key={m.id} className="bg-slate-900/30 border border-slate-900 hover:border-slate-800 p-4 rounded-2xl space-y-2 transition-colors">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                          {String(m.type).replace("_"," ")}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold">
                          {new Date(m.createdAt).toLocaleDateString(undefined, { month:"short", day:"numeric" })}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{m.title}</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LOG TAB */}
          {tab === "log" && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-300">Orchestrator Run Log</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
              </div>
              {execReport ? (
                <div className="p-4 font-mono text-[11px] leading-relaxed text-[#c7c9d3] bg-black/90 max-h-[600px] overflow-y-auto space-y-4">
                  {execReport.steps.map(step => (
                    <div key={step.stepNumber} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-purple-400 font-bold">&gt; [{step.toolToExecute.toUpperCase()}]</span>
                        <span className={step.status === "completed" ? "text-emerald-400" : "text-amber-400"}>{step.status}</span>
                      </div>
                      <p className="text-slate-500 pl-2">{step.reasoning}</p>
                      {step.result && step.toolToExecute === "analyze_missing_skills" && (
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded font-sans text-xs text-slate-300 pl-2">
                          <span className="text-amber-400 font-bold">Gaps: </span>
                          {step.result.gapSkills?.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="text-emerald-400 font-bold pt-2">&gt;&gt; COMPLETE: Roadmap initialized. Memory persisted.</div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">No agent run logs yet. Deploy a goal to see orchestration logs.</div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
