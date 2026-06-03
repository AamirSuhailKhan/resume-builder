"use client";

import React, { useState, useEffect } from "react";
import type { CareerRoadmap, AgentExecutionReport, WeeklyAdaptationReport } from "@/lib/agent/types";

// ─── Theme Colors ─────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#050508",
  panel: "rgba(15,15,25,0.95)",
  border: "#1f2937",
  primary: "#a855f7", // purple
  primaryGlow: "rgba(168,85,247,0.15)",
  accent: "#06b6d4", // cyan
  accentGlow: "rgba(6,182,212,0.15)",
  success: "#10b981", // green
  warning: "#f59e0b", // amber
  muted: "#6b7280",
  text: "#f3f4f6",
};

export function AutonomousAgentDashboard() {
  const [goalInput, setGoalInput] = useState("");
  const [activeRoadmap, setActiveRoadmap] = useState<CareerRoadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [execReport, setExecReport] = useState<AgentExecutionReport | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [adapting, setAdapting] = useState(false);
  const [adaptReport, setAdaptReport] = useState<WeeklyAdaptationReport | null>(null);

  // Fetch active roadmap on mount
  useEffect(() => {
    async function loadRoadmap() {
      try {
        const res = await fetch("/api/v1/agent/roadmap");
        if (res.ok) {
          const data = await res.json();
          if (data.activeRoadmap) {
            setActiveRoadmap(data.activeRoadmap);
          }
        }
      } catch (err) {
        console.error("Failed to load roadmap:", err);
      }
    }
    loadRoadmap();
  }, []);

  const handleActivateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;

    setLoading(true);
    setExecReport(null);
    try {
      const res = await fetch("/api/v1/agent/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setExecReport(data.report);
        if (data.report?.workingMemory?.roadmap) {
          setActiveRoadmap(data.report.workingMemory.roadmap);
        } else {
          // reload active plan
          const planRes = await fetch("/api/v1/agent/roadmap");
          const planData = await planRes.json();
          setActiveRoadmap(planData.activeRoadmap);
        }
      }
    } catch (err) {
      console.error("Goal activation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (roadmapId: string, taskId: string) => {
    try {
      const res = await fetch("/api/v1/agent/task/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmapId, taskId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRoadmap(data.roadmap);
      }
    } catch (err) {
      console.error("Task toggle failed:", err);
    }
  };

  const handleAdaptRoadmap = async () => {
    setAdapting(true);
    setAdaptReport(null);
    try {
      const res = await fetch("/api/v1/agent/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentWeekNumber: currentWeek }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdaptReport(data.report);
        // reload active plan
        const planRes = await fetch("/api/v1/agent/roadmap");
        const planData = await planRes.json();
        setActiveRoadmap(planData.activeRoadmap);
        setCurrentWeek((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Adaptation trigger failed:", err);
    } finally {
      setAdapting(false);
    }
  };

  const totalTasks = activeRoadmap?.phases?.flatMap((p) => p.weeklyPlans?.flatMap((w) => w.actionItems) ?? [])?.length ?? 0;
  const completedTasks = activeRoadmap?.phases?.flatMap((p) => p.weeklyPlans?.flatMap((w) => w.actionItems?.filter((t) => t.completed) ?? []) ?? [])?.length ?? 0;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Autonomous Career Agent</h1>
          <p style={styles.subtitle}>Let the agent orchestrate your skill-ups, job applications, and milestones autonomously.</p>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={styles.grid}>
        {/* Left Column: Command & Logs */}
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Set Target Career Goal</h2>
            <form onSubmit={handleActivateAgent} style={styles.form}>
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. I want a Backend Engineer job at Google in 6 months"
                style={styles.input}
                disabled={loading}
              />
              <button type="submit" style={styles.btn} disabled={loading}>
                {loading ? "Orchestrating..." : "Launch Agent"}
              </button>
            </form>
          </div>

          {/* Terminal Logs / Execution Steps */}
          {execReport && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Planner Log</h2>
              <div style={styles.terminal}>
                <div style={styles.terminalHeader}>
                  <span style={styles.dotRed}></span>
                  <span style={styles.dotYellow}></span>
                  <span style={styles.dotGreen}></span>
                  <span style={{ marginLeft: 8, fontSize: 10, color: COLORS.muted }}>career-agent-planner.sh</span>
                </div>
                <div style={styles.terminalContent}>
                  {execReport.steps.map((step) => (
                    <div key={step.stepNumber} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: COLORS.accent, fontWeight: 600, fontSize: 12 }}>
                          Step {step.stepNumber}: {step.toolToExecute}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: step.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                            color: step.status === "completed" ? COLORS.success : COLORS.warning,
                          }}
                        >
                          {step.status}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0 0", color: "#d1d5db", fontSize: 12 }}>{step.reasoning}</p>
                      {step.result && step.toolToExecute === "analyze_missing_skills" && (
                        <div style={styles.nestedJson}>
                          <span style={{ color: COLORS.warning }}>Gaps Identified:</span>{" "}
                          {step.result.gapSkills?.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ color: COLORS.success, fontSize: 12, marginTop: 10 }}>✓ Plan execution completed. Roadmap successfully initialized.</div>
                </div>
              </div>
            </div>
          )}

          {/* Adaptation Report Panel */}
          {adaptReport && (
            <div style={{ ...styles.card, border: `1px solid ${COLORS.accent}44`, boxShadow: `0 0 15px ${COLORS.accentGlow}` }}>
              <h2 style={{ ...styles.cardTitle, color: COLORS.accent }}>Adaptation Summary (Week {adaptReport.originalWeekNumber} → {adaptReport.adaptationWeekNumber})</h2>
              <div style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6 }}>
                <p><strong>Reasoning:</strong> {adaptReport.reasonsForChange.join(", ")}</p>
                <div style={{ marginTop: 10 }}>
                  <strong>Adjustments Executed:</strong>
                  <ul style={{ margin: "5px 0 0 0", paddingLeft: 20 }}>
                    {adaptReport.adjustmentsMade.map((a, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <span style={{ color: COLORS.warning, fontWeight: 600 }}>{a.type.replace("_", " ")}</span>: {a.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Roadmap & Progress */}
        <div style={styles.rightCol}>
          {activeRoadmap ? (
            <>
              {/* Progress Bar Card */}
              <div style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h2 style={styles.cardTitle}>Roadmap Execution</h2>
                  <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary }}>{progressPct}% Done</span>
                </div>
                <div style={styles.progressBg}>
                  <div style={{ ...styles.progressFill, width: `${progressPct}%` }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>Target: {activeRoadmap.targetRole} {activeRoadmap.targetCompany ? `@ ${activeRoadmap.targetCompany}` : ""}</span>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>Timeline: {activeRoadmap.timelineWeeks} Weeks</span>
                </div>
              </div>

              {/* Phased Roadmap Viewer */}
              {activeRoadmap.phases?.map((phase) => (
                <div key={phase.phaseNumber} style={{ ...styles.card, position: "relative" }}>
                  <div style={styles.phaseHeader}>
                    <span style={styles.phaseBadge}>Phase {phase.phaseNumber}</span>
                    <h3 style={styles.phaseTitle}>{phase.title}</h3>
                  </div>
                  <p style={{ fontSize: 12, color: COLORS.muted, margin: "4px 0 16px 0" }}>{phase.focus}</p>

                  {/* Weekly list */}
                  {phase.weeklyPlans?.map((week) => (
                    <div key={week.weekNumber} style={styles.weekSection}>
                      <h4 style={styles.weekTitle}>Week {week.weekNumber}: {week.focus}</h4>
                      <div style={styles.taskList}>
                        {week.actionItems?.map((task) => (
                          <div key={task.id} style={styles.taskItem}>
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleTask(activeRoadmap.id, task.id)}
                              style={styles.checkbox}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ ...styles.taskLabel, textDecoration: task.completed ? "line-through" : "none", color: task.completed ? COLORS.muted : COLORS.text }}>
                                  {task.title}
                                </span>
                                <span style={{ ...styles.typeTag, borderColor: getTypeColor(task.type), color: getTypeColor(task.type) }}>
                                  {task.type.replace("_", " ")}
                                </span>
                              </div>
                              <p style={{ fontSize: 11, color: COLORS.muted, margin: "2px 0 0 0" }}>{task.description}</p>
                            </div>
                            <span style={{ fontSize: 11, color: COLORS.muted, flexShrink: 0 }}>{task.estimatedHours} hrs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Adapt Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 40 }}>
                <button onClick={handleAdaptRoadmap} disabled={adapting} style={styles.adaptBtn}>
                  {adapting ? "Adapting Roadmap..." : "↻ Run End-of-Week Adaptation"}
                </button>
              </div>
            </>
          ) : (
            <div style={styles.emptyCard}>
              <span style={{ fontSize: 40, marginBottom: 12 }}>🤖</span>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>No Active Goal</h3>
              <p style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", maxWidth: 280, marginTop: 4 }}>
                Enter your target career goal in the left input box and launch the agent.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case "skill_acquisition": return COLORS.primary;
    case "project_build": return COLORS.accent;
    case "certification": return COLORS.warning;
    case "networking": return "#3b82f6";
    case "application": return COLORS.success;
    case "interview_prep": return "#ec4899";
    default: return COLORS.muted;
  }
}

// ─── Inline Styles ─────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "24px 28px",
    background: COLORS.bg,
    minHeight: "100vh",
    fontFamily: "Inter, sans-serif",
    color: COLORS.text,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    background: "linear-gradient(135deg, #fff, #a855f7)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr",
    gap: 24,
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  rightCol: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    margin: "0 0 16px 0",
    color: "#e5e7eb",
    letterSpacing: "0.02em",
  },
  form: {
    display: "flex",
    gap: 12,
  },
  input: {
    flex: 1,
    background: "#0c0c16",
    border: "1px solid #374151",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#fff",
    outline: "none",
  },
  btn: {
    background: `linear-gradient(135deg, ${COLORS.primary}, #7c3aed)`,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  terminal: {
    background: "#09090e",
    border: "1px solid #1e1e2f",
    borderRadius: 10,
    overflow: "hidden",
  },
  terminalHeader: {
    background: "#161623",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid #1e1e2f",
  },
  dotRed: { width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" },
  dotYellow: { width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block", marginLeft: 4 },
  dotGreen: { width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", marginLeft: 4 },
  terminalContent: {
    padding: 16,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.5,
    maxHeight: 380,
    overflowY: "auto",
  },
  nestedJson: {
    background: "#11111d",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 11,
    marginTop: 6,
    borderLeft: `2px solid ${COLORS.warning}`,
  },
  progressBg: {
    background: "#1f2937",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
    height: "100%",
    borderRadius: 4,
    transition: "width 0.4s ease-out",
  },
  phaseHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  phaseBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: COLORS.primaryGlow,
    color: COLORS.primary,
    border: `1px solid ${COLORS.primary}44`,
    padding: "2px 8px",
    borderRadius: 12,
    textTransform: "uppercase",
  },
  phaseTitle: {
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
  },
  weekSection: {
    borderTop: "1px solid #1f2937",
    paddingTop: 14,
    marginTop: 14,
  },
  weekTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.accent,
    margin: "0 0 10px 0",
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  taskItem: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "#0a0a0f",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #11111d",
  },
  checkbox: {
    marginTop: 3,
    cursor: "pointer",
  },
  taskLabel: {
    fontSize: 12,
    fontWeight: 500,
  },
  typeTag: {
    fontSize: 9,
    fontWeight: 700,
    border: "1px solid",
    padding: "1px 6px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },
  adaptBtn: {
    background: "transparent",
    border: `1px solid ${COLORS.accent}`,
    color: COLORS.accent,
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: `0 0 10px ${COLORS.accentGlow}`,
  },
  emptyCard: {
    background: COLORS.panel,
    border: `1px dashed ${COLORS.border}`,
    borderRadius: 14,
    padding: "80px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
};
