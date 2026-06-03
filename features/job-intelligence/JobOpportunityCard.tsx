"use client";

import React, { useState, useEffect } from "react";

interface SalaryPrediction {
  min: number;
  max: number;
  currency: string;
  confidence: number;
}

interface SkillTrend {
  skill: string;
  trend: "up" | "down" | "stable";
}

interface JobIntelligence {
  opportunityScore: number;
  hiringVelocity: number;
  marketDemand: number;
  competitionScore: number;
  salaryPrediction: SalaryPrediction | null;
  layoffRisk: number;
  careerGrowth: number;
  skillDemandTrends: SkillTrend[] | null;
  companyMomentum: number;
  matchQuality: number;
  stabilityScore: number;
}

export function JobOpportunityCard({ jobId, role, company }: { jobId: string, role: string, company: string }) {
  const [intelligence, setIntelligence] = useState<JobIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIntelligence() {
      try {
        const res = await fetch(`/api/v1/jobs/${jobId}/intelligence`);
        if (res.ok) {
          const data = await res.json();
          setIntelligence(data.intelligence);
        }
      } catch (error) {
        console.error("Failed to load job intelligence", error);
      } finally {
        setLoading(false);
      }
    }
    loadIntelligence();
  }, [jobId]);

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={{ ...styles.pulse, width: "100%", height: 200, borderRadius: 12 }}></div>
      </div>
    );
  }

  if (!intelligence) {
    return null;
  }

  return (
    <div style={styles.card}>
      {/* Header section with final Opportunity Score */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{role}</h2>
          <p style={styles.company}>{company}</p>
        </div>
        <div style={styles.scoreCircle}>
          <span style={styles.scoreText}>{intelligence.opportunityScore}</span>
          <span style={styles.scoreLabel}>Opp Score</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div style={styles.metricsGrid}>
        <MetricBox label="Match Quality" value={intelligence.matchQuality} color="#a855f7" />
        <MetricBox label="Market Demand" value={intelligence.marketDemand} color="#06b6d4" />
        <MetricBox label="Career Growth" value={intelligence.careerGrowth} color="#10b981" />
        <MetricBox label="Stability" value={intelligence.stabilityScore} color="#f59e0b" />
      </div>

      {/* Secondary Intelligence Breakdown */}
      <div style={styles.breakdown}>
        <div style={styles.row}>
          <span style={styles.rowLabel}>Hiring Velocity</span>
          <ProgressBar value={intelligence.hiringVelocity} color="#6366f1" />
        </div>
        <div style={styles.row}>
          <span style={styles.rowLabel}>Competition</span>
          <ProgressBar value={intelligence.competitionScore} color="#ef4444" reverse />
        </div>
        <div style={styles.row}>
          <span style={styles.rowLabel}>Company Momentum</span>
          <ProgressBar value={intelligence.companyMomentum} color="#14b8a6" />
        </div>
        <div style={styles.row}>
          <span style={styles.rowLabel}>Layoff Risk</span>
          <ProgressBar value={intelligence.layoffRisk} color="#f43f5e" reverse />
        </div>
      </div>

      {/* Salary & Skills */}
      <div style={styles.footer}>
        {intelligence.salaryPrediction && (
          <div style={styles.salaryBox}>
            <span style={styles.footerLabel}>Predicted Salary</span>
            <span style={styles.salaryValue}>
              {formatCurrency(intelligence.salaryPrediction.min, intelligence.salaryPrediction.currency)} - {formatCurrency(intelligence.salaryPrediction.max, intelligence.salaryPrediction.currency)}
            </span>
          </div>
        )}
        
        {intelligence.skillDemandTrends && (
          <div style={styles.skillsBox}>
            <span style={styles.footerLabel}>Trending Skills</span>
            <div style={styles.skillTags}>
              {intelligence.skillDemandTrends.map((s, i) => (
                <span key={i} style={styles.skillTag}>
                  {s.skill} {s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "→"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div style={styles.metricBox}>
      <span style={{ ...styles.metricValue, color }}>{Math.round(value)}</span>
      <span style={styles.metricLabel}>{label}</span>
    </div>
  );
}

function ProgressBar({ value, color, reverse = false }: { value: number, color: string, reverse?: boolean }) {
  // If reverse is true, higher value means worse, so we might want to color it differently? 
  // Let's just use the provided color for the fill width based on value.
  return (
    <div style={styles.progressContainer}>
      <div style={{ ...styles.progressBar, width: `${value}%`, background: color }}></div>
    </div>
  );
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#0a0a0f",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 24,
    color: "#f3f4f6",
    fontFamily: "Inter, sans-serif",
    maxWidth: 600,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  pulse: {
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
    background: "#1f2937"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 4px 0",
    color: "#fff",
  },
  company: {
    fontSize: 14,
    color: "#9ca3af",
    margin: 0,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 20px rgba(168,85,247,0.4)",
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 800,
    color: "#fff",
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    fontWeight: 600,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 24,
  },
  metricBox: {
    background: "#11111a",
    border: "1px solid #1f2937",
    borderRadius: 10,
    padding: "12px 8px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  breakdown: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 24,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    alignItems: "center",
    gap: 16,
  },
  rowLabel: {
    fontSize: 13,
    color: "#d1d5db",
  },
  progressContainer: {
    height: 6,
    background: "#1f2937",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.5s ease-out",
  },
  footer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    paddingTop: 20,
    borderTop: "1px solid #1f2937",
  },
  salaryBox: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  skillsBox: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  footerLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  salaryValue: {
    fontSize: 15,
    fontWeight: 600,
    color: "#10b981",
  },
  skillTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  skillTag: {
    background: "rgba(168,85,247,0.1)",
    color: "#c084fc",
    border: "1px solid rgba(168,85,247,0.2)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 500,
  }
};
