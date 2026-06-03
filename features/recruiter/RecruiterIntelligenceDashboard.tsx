"use client";

import React, { useState, useEffect } from "react";

interface Interaction {
  id: string;
  type: string;
  date: string;
  status: string;
  responseTimeDays?: number;
  notes?: string;
}

interface Recruiter {
  id: string;
  name: string;
  email?: string;
  linkedinUrl?: string;
  companyName: string;
  title?: string;
  roleFamily: string;
  responseScore: number;
  ghostingRate: number;
  avgResponseDays: number;
  engagementScore: number;
  status: string;
  notes?: string;
  interactions: Interaction[];
}

interface MatchingResult {
  recruiter: Recruiter;
  matchScore: number;
}

const COLORS = {
  bg: "#0a0a0f",
  card: "#11111a",
  border: "#1f2937",
  primary: "#3b82f6",     // Blue
  secondary: "#10b981",   // Emerald Success
  warning: "#f59e0b",     // Amber
  danger: "#ef4444",      // Red
  purple: "#8b5cf6",      // Violet
  text: "#f3f4f6",
  muted: "#9ca3af"
};

export function RecruiterIntelligenceDashboard() {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"directory" | "matcher" | "analytics" | "predictor">("directory");

  // Form states for adding a Recruiter
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecruiter, setNewRecruiter] = useState({
    name: "",
    email: "",
    linkedinUrl: "",
    companyName: "",
    title: "",
    roleFamily: "Engineering",
    notes: ""
  });

  // Activity Log States
  const [activeRecruiter, setActiveRecruiter] = useState<Recruiter | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: "LINKEDIN_CONNECT",
    status: "SENT",
    responseTimeDays: "",
    notes: ""
  });

  // Matching tool states
  const [jobTitleQuery, setJobTitleQuery] = useState("");
  const [matchedResults, setMatchedResults] = useState<MatchingResult[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Engagement Predictor States
  const [predictForm, setPredictForm] = useState({
    roleFamily: "Engineering",
    outreachType: "LINKEDIN_CONNECT",
    historicalGhostRate: "0.3",
    companyTier: "Tier 1 (FAANG/Unicorn)",
    hasEmail: false,
    hasLinkedIn: true
  });
  const [predictedScore, setPredictedScore] = useState<number | null>(null);
  const [predictionFeedback, setPredictionFeedback] = useState<string[]>([]);

  useEffect(() => {
    fetchRecruiters();
  }, []);

  async function fetchRecruiters() {
    try {
      const res = await fetch("/api/v1/recruiter/contacts");
      if (res.ok) {
        const data = await res.json();
        setRecruiters(data.recruiters || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRecruiter(e: React.FormEvent) {
    e.preventDefault();
    if (!newRecruiter.name || !newRecruiter.companyName) return;

    try {
      const res = await fetch("/api/v1/recruiter/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecruiter)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewRecruiter({
          name: "",
          email: "",
          linkedinUrl: "",
          companyName: "",
          title: "",
          roleFamily: "Engineering",
          notes: ""
        });
        fetchRecruiters();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRecruiter) return;

    try {
      const res = await fetch("/api/v1/recruiter/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiterId: activeRecruiter.id,
          ...newActivity
        })
      });
      if (res.ok) {
        setShowActivityModal(false);
        setActiveRecruiter(null);
        setNewActivity({ type: "LINKEDIN_CONNECT", status: "SENT", responseTimeDays: "", notes: "" });
        fetchRecruiters();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMatchRecruiters() {
    if (!jobTitleQuery) return;
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/v1/recruiter/match?jobTitle=${encodeURIComponent(jobTitleQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setMatchedResults(data.matching || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatches(false);
    }
  }

  function handleCalculatePrediction() {
    let score = 50; // Baseline
    const feedback: string[] = [];

    // Role Family Weighting
    if (predictForm.roleFamily === "Engineering") {
      score += 10;
      feedback.push("➕ High market demand for engineering roles boosts response likelihood (+10%).");
    } else {
      score += 5;
    }

    // Channel type weighting
    if (predictForm.outreachType === "EMAIL" && predictForm.hasEmail) {
      score += 15;
      feedback.push("➕ Direct email outreach holds significantly higher response rates than generic platforms (+15%).");
    } else if (predictForm.outreachType === "INMAIL") {
      score += 8;
      feedback.push("➕ LinkedIn InMails have solid open rates, though lower reply guarantees (+8%).");
    } else {
      score -= 5;
      feedback.push("➖ LinkedIn Connection Requests without a premium note see lowest initial response rates (-5%).");
    }

    // Ghosting rate calculation
    const ghost = parseFloat(predictForm.historicalGhostRate);
    if (ghost > 0.5) {
      score -= 20;
      feedback.push("❌ Recruiter's firm has high historical ghosting rates above 50% (-20%).");
    } else if (ghost < 0.2) {
      score += 12;
      feedback.push("✅ Recruiter's firm displays strong candidate experience metrics (+12%).");
    }

    // Company tier weight
    if (predictForm.companyTier === "Tier 1 (FAANG/Unicorn)") {
      score -= 10;
      feedback.push("➖ High volume of applicants at Tier 1 companies increases filtering friction (-10%).");
    } else {
      score += 8;
      feedback.push("✅ Mid-size and Tier 2 firms showcase higher response velocity and interest (+8%).");
    }

    const finalScore = Math.max(5, Math.min(99, score));
    setPredictedScore(finalScore);
    setPredictionFeedback(feedback);
  }

  // Analytics Aggregation
  const totalRecruiters = recruiters.length;
  const activeCount = recruiters.filter(r => r.status === "ACTIVE").length;
  const ghostedCount = recruiters.filter(r => r.status === "GHOSTED").length;
  
  const totalInteractions = recruiters.reduce((sum, r) => sum + r.interactions.length, 0);
  const repliedInteractions = recruiters.reduce(
    (sum, r) => sum + r.interactions.filter(i => i.status === "REPLIED" || i.status === "INTERVIEW_SCHEDULED").length,
    0
  );
  
  const globalResponseRate = totalInteractions > 0 
    ? Math.round((repliedInteractions / totalInteractions) * 100)
    : 50;

  const avgDays = recruiters.filter(r => r.avgResponseDays > 0);
  const globalAvgDays = avgDays.length > 0 
    ? (avgDays.reduce((sum, r) => sum + r.avgResponseDays, 0) / avgDays.length).toFixed(1)
    : "3.0";

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Recruiter Intelligence Engine</h1>
          <p style={styles.subtitle}>
            Predict engagement, rank matching talent agents, and manage recruiter relations.
          </p>
        </div>
        <button style={styles.addButton} onClick={() => setShowAddModal(true)}>
          + Add Recruiter
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={activeTab === "directory" ? styles.activeTabBtn : styles.tabBtn}
          onClick={() => setActiveTab("directory")}
        >
          Recruiter Database
        </button>
        <button
          style={activeTab === "matcher" ? styles.activeTabBtn : styles.tabBtn}
          onClick={() => setActiveTab("matcher")}
        >
          Recruiter Matcher
        </button>
        <button
          style={activeTab === "predictor" ? styles.activeTabBtn : styles.tabBtn}
          onClick={() => setActiveTab("predictor")}
        >
          Engagement Predictor
        </button>
        <button
          style={activeTab === "analytics" ? styles.activeTabBtn : styles.tabBtn}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics & Response Tracking
        </button>
      </div>

      {/* Recruiter Directory */}
      {activeTab === "directory" && (
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Loading recruiters...</div>
          ) : recruiters.length === 0 ? (
            <div style={styles.emptyState}>No recruiters in database. Add one to initiate intelligence tracking.</div>
          ) : (
            <div style={styles.grid}>
              {recruiters.map(r => (
                <div key={r.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.recruiterName}>{r.name}</h3>
                      <p style={styles.recruiterTitle}>{r.title || "Talent Partner"} at <strong style={{color: COLORS.primary}}>{r.companyName}</strong></p>
                    </div>
                    <div style={styles.scoreGauge}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: r.engagementScore > 65 ? COLORS.secondary : r.engagementScore > 40 ? COLORS.warning : COLORS.danger }}>
                        {Math.round(r.engagementScore)}%
                      </span>
                      <span style={{ fontSize: 9, textTransform: "uppercase", color: COLORS.muted }}>Reply Prob</span>
                    </div>
                  </div>

                  <div style={styles.metaRow}>
                    <span style={{ ...styles.badge, background: "rgba(139, 92, 246, 0.15)", color: "#c084fc" }}>
                      🎯 {r.roleFamily}
                    </span>
                    <span style={{ 
                      ...styles.badge, 
                      background: r.status === "ACTIVE" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", 
                      color: r.status === "ACTIVE" ? "#34d399" : "#f87171" 
                    }}>
                      {r.status}
                    </span>
                  </div>

                  {/* Metrics Section */}
                  <div style={styles.statsSection}>
                    <div style={styles.miniStat}>
                      <span style={styles.miniLabel}>Response Score</span>
                      <div style={styles.progressContainer}>
                        <div style={{ ...styles.progressBar, width: `${r.responseScore}%`, background: COLORS.primary }}></div>
                      </div>
                      <span style={styles.miniVal}>{Math.round(r.responseScore)}/100</span>
                    </div>
                    <div style={styles.miniStat}>
                      <span style={styles.miniLabel}>Ghosting Rate</span>
                      <span style={{ ...styles.miniVal, color: r.ghostingRate > 0.4 ? COLORS.danger : COLORS.secondary }}>
                        {Math.round(r.ghostingRate * 100)}%
                      </span>
                    </div>
                    <div style={styles.miniStat}>
                      <span style={styles.miniLabel}>Avg Speed</span>
                      <span style={styles.miniVal}>{r.avgResponseDays.toFixed(1)} days</span>
                    </div>
                  </div>

                  {r.notes && <p style={styles.notesPreview}>📝 {r.notes}</p>}

                  {/* Actions */}
                  <div style={styles.cardActions}>
                    <button 
                      style={styles.actionBtn} 
                      onClick={() => {
                        setActiveRecruiter(r);
                        setShowActivityModal(true);
                      }}
                    >
                      ✉️ Log Outreach
                    </button>
                    {r.linkedinUrl && (
                      <a href={r.linkedinUrl} target="_blank" rel="noreferrer" style={styles.linkBtn}>
                        LinkedIn
                      </a>
                    )}
                  </div>

                  {/* Recent Interaction */}
                  {(() => {
                    const latest = r.interactions[0];
                    if (!latest) return null;
                    return (
                      <div style={styles.latestInteraction}>
                        <span style={styles.interactionHeader}>Last outreach:</span>
                        <p style={styles.interactionText}>
                          [{new Date(latest.date).toLocaleDateString()}] {latest.type.replace("_", " ")} &rarr;{" "}
                          <span style={{ 
                            fontWeight: 600, 
                            color: latest.status === "REPLIED" || latest.status === "INTERVIEW_SCHEDULED" ? COLORS.secondary : latest.status === "GHOSTED" ? COLORS.danger : COLORS.muted 
                          }}>
                            {latest.status}
                          </span>
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recruiter Matcher */}
      {activeTab === "matcher" && (
        <div style={styles.matcherContainer}>
          <div style={styles.searchRow}>
            <input
              type="text"
              placeholder="Enter Target Job Title (e.g. Senior Frontend Engineer, Product Manager)"
              value={jobTitleQuery}
              onChange={(e) => setJobTitleQuery(e.target.value)}
              style={styles.input}
            />
            <button style={styles.searchBtn} onClick={handleCalculatePrediction} onClickCapture={handleMatchRecruiters}>
              Match Recruiters
            </button>
          </div>

          {loadingMatches ? (
            <div style={styles.loading}>Searching recruiter connections...</div>
          ) : matchedResults.length === 0 ? (
            <div style={styles.emptyState}>
              No recruiter matches calculated yet. Type your targeted role to view scored alignment scores.
            </div>
          ) : (
            <div style={styles.matchesList}>
              {matchedResults.map((m, i) => (
                <div key={i} style={styles.matchRow}>
                  <div style={styles.matchProfile}>
                    <div style={styles.matchRank}>#{i + 1}</div>
                    <div>
                      <h4 style={styles.matchName}>{m.recruiter.name}</h4>
                      <p style={styles.matchTitle}>
                        {m.recruiter.title || "Talent Recruiter"} at <strong>{m.recruiter.companyName}</strong>
                      </p>
                    </div>
                  </div>
                  <div style={styles.matchMeta}>
                    <span style={{ ...styles.badge, background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                      Role Domain: {m.recruiter.roleFamily}
                    </span>
                    <div style={styles.matchScoreIndicator}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.secondary }}>
                        {Math.round(m.matchScore)}%
                      </span>
                      <span style={{ fontSize: 9, color: COLORS.muted }}>Match Match</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Engagement Predictor */}
      {activeTab === "predictor" && (
        <div style={styles.predictorContainer}>
          <div style={styles.predictorSplit}>
            <div style={styles.predictorFormCard}>
              <h3 style={styles.predictorTitle}>Predictive Response Modeling</h3>
              <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 20 }}>
                Tune outreach variables to calculate simulated reply probability from target recruiters.
              </p>

              <div style={styles.formGroup}>
                <label style={styles.label}>Role Domain / Family</label>
                <select
                  value={predictForm.roleFamily}
                  onChange={(e) => setPredictForm({ ...predictForm, roleFamily: e.target.value })}
                  style={styles.select}
                >
                  <option value="Engineering">Engineering & Development</option>
                  <option value="Product">Product Management</option>
                  <option value="Design">UX/UI Design</option>
                  <option value="Business">Business & Marketing</option>
                  <option value="Other">Other Admin</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Planned Outreach Channel</label>
                <select
                  value={predictForm.outreachType}
                  onChange={(e) => setPredictForm({ ...predictForm, outreachType: e.target.value })}
                  style={styles.select}
                >
                  <option value="LINKEDIN_CONNECT">LinkedIn Connection Invite</option>
                  <option value="INMAIL">LinkedIn Premium InMail</option>
                  <option value="EMAIL">Direct Cold Email</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Historical Company Ghosting Rate</label>
                <select
                  value={predictForm.historicalGhostRate}
                  onChange={(e) => setPredictForm({ ...predictForm, historicalGhostRate: e.target.value })}
                  style={styles.select}
                >
                  <option value="0.1">Low (&lt; 20%)</option>
                  <option value="0.3">Neutral (20% - 40%)</option>
                  <option value="0.6">High (&gt; 50%)</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Company Growth Tier</label>
                <select
                  value={predictForm.companyTier}
                  onChange={(e) => setPredictForm({ ...predictForm, companyTier: e.target.value })}
                  style={styles.select}
                >
                  <option value="Tier 1 (FAANG/Unicorn)">Tier 1 (FAANG / Hyper-growth Unicorns)</option>
                  <option value="Tier 2 (Mid-size)">Tier 2 (Mid-size Public / Series B/C)</option>
                  <option value="Tier 3 (Seed/Early)">Tier 3 (Seed & Early-stage Startups)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={predictForm.hasEmail}
                    onChange={(e) => setPredictForm({ ...predictForm, hasEmail: e.target.checked })}
                  />
                  Have Work Email
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={predictForm.hasLinkedIn}
                    onChange={(e) => setPredictForm({ ...predictForm, hasLinkedIn: e.target.checked })}
                  />
                  Has LinkedIn URL
                </label>
              </div>

              <button style={{ ...styles.addButton, width: "100%", marginTop: 24 }} onClick={handleCalculatePrediction}>
                Run Simulation Engine
              </button>
            </div>

            <div style={styles.predictorOutputCard}>
              <h3 style={styles.predictorTitle}>Simulation Outputs</h3>
              {predictedScore === null ? (
                <div style={styles.predictorEmpty}>
                  Configure variables on the left and run simulation to predict engagement probability.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
                  <div style={styles.predictionScoreSection}>
                    <div style={styles.scoreRing}>
                      <span style={styles.ringText}>{predictedScore}%</span>
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: 16 }}>Predicted Likelihood of Reply</h4>
                      <p style={{ margin: 0, fontSize: 12, color: COLORS.muted }}>
                        Calculated by mapping outreach channel viability and recruiter network latency patterns.
                      </p>
                    </div>
                  </div>

                  <div style={styles.predictionFeedbackBox}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: COLORS.muted, display: "block", marginBottom: 10 }}>
                      Heuristic Breakdown & Suggestions
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {predictionFeedback.map((f, i) => (
                        <p key={i} style={styles.feedbackItem}>{f}</p>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...styles.alert, margin: 0, background: "rgba(59, 130, 246, 0.08)", borderColor: "rgba(59, 130, 246, 0.15)", color: "#93c5fd" }}>
                    <strong>💡 Intelligence Maximizer:</strong> Switching outreach channel to cold email using a verified address increases expected response velocity by 1.8x.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Outreach Analytics */}
      {activeTab === "analytics" && (
        <div style={styles.analyticsContainer}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statVal}>{totalRecruiters}</span>
              <span style={styles.statLabel}>Recruiters Monitored</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statVal}>{activeCount}</span>
              <span style={styles.statLabel}>Active Recruiter Contacts</span>
            </div>
            <div style={styles.statCard}>
              <span style={{ ...styles.statVal, color: COLORS.primary }}>{globalResponseRate}%</span>
              <span style={styles.statLabel}>Global Reply Rate</span>
            </div>
            <div style={styles.statCard}>
              <span style={{ ...styles.statVal, color: COLORS.purple }}>{globalAvgDays}d</span>
              <span style={styles.statLabel}>Avg Latency Response</span>
            </div>
          </div>

          <div style={styles.analyticsGrid}>
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Historical Activity Breakdowns</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={styles.chartRow}>
                  <span style={styles.chartRowLabel}>Active/Replied</span>
                  <div style={styles.barContainer}>
                    <div style={{ ...styles.barFill, width: `${globalResponseRate}%`, background: COLORS.secondary }}></div>
                  </div>
                  <span style={styles.chartRowVal}>{repliedInteractions} interactions</span>
                </div>
                <div style={styles.chartRow}>
                  <span style={styles.chartRowLabel}>Ghosted / Unresponsive</span>
                  <div style={styles.barContainer}>
                    <div style={{ ...styles.barFill, width: `${recruiters.length > 0 ? Math.round((ghostedCount / recruiters.length) * 100) : 0}%`, background: COLORS.danger }}></div>
                  </div>
                  <span style={styles.chartRowVal}>{ghostedCount} recruiters</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Recruiter Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Add Recruiter Contact</h2>
            <form onSubmit={handleAddRecruiter} style={styles.form}>
              <input
                type="text"
                placeholder="Recruiter Name *"
                required
                value={newRecruiter.name}
                onChange={(e) => setNewRecruiter({ ...newRecruiter, name: e.target.value })}
                style={styles.modalInput}
              />
              <input
                type="text"
                placeholder="Company Name *"
                required
                value={newRecruiter.companyName}
                onChange={(e) => setNewRecruiter({ ...newRecruiter, companyName: e.target.value })}
                style={styles.modalInput}
              />
              <input
                type="text"
                placeholder="Recruiter Title (e.g. Senior Tech Recruiter)"
                value={newRecruiter.title}
                onChange={(e) => setNewRecruiter({ ...newRecruiter, title: e.target.value })}
                style={styles.modalInput}
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newRecruiter.email}
                onChange={(e) => setNewRecruiter({ ...newRecruiter, email: e.target.value })}
                style={styles.modalInput}
              />
              <input
                type="text"
                placeholder="LinkedIn URL"
                value={newRecruiter.linkedinUrl}
                onChange={(e) => setNewRecruiter({ ...newRecruiter, linkedinUrl: e.target.value })}
                style={styles.modalInput}
              />
              <select
                value={newRecruiter.roleFamily}
                onChange={(e) => setNewRecruiter({ ...newRecruiter, roleFamily: e.target.value })}
                style={styles.modalInput}
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </select>
              <textarea
                placeholder="Private interaction notes or target roles..."
                value={newRecruiter.notes}
                onChange={(e) => setNewRecruiter({ ...newRecruiter, notes: e.target.value })}
                style={{ ...styles.modalInput, height: 80, resize: "none" }}
              />

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showActivityModal && activeRecruiter && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Log Recruiter Outreach</h2>
            <form onSubmit={handleLogActivity} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Outreach Type</label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="LINKEDIN_CONNECT">LinkedIn Connection request</option>
                  <option value="INMAIL">LinkedIn InMail</option>
                  <option value="EMAIL">Direct Email</option>
                  <option value="PHONE_SCREEN">Phone Screen Interview</option>
                  <option value="INTERVIEW_SCHEDULED">Technical Interview Scheduled</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Interaction Status</label>
                <select
                  value={newActivity.status}
                  onChange={(e) => setNewActivity({ ...newActivity, status: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="SENT">Sent (No Reply Yet)</option>
                  <option value="REPLIED">Replied / Connected</option>
                  <option value="GHOSTED">Ghosted (Over 7 days)</option>
                  <option value="NO_INTEREST">No Match / Rejected</option>
                </select>
              </div>

              {newActivity.status === "REPLIED" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Response Time (in Days)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 2 days"
                    value={newActivity.responseTimeDays}
                    onChange={(e) => setNewActivity({ ...newActivity, responseTimeDays: e.target.value })}
                    style={styles.modalInput}
                  />
                </div>
              )}

              <textarea
                placeholder="Write specific notes on discussions, follow-ups..."
                value={newActivity.notes}
                onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                style={{ ...styles.modalInput, height: 80, resize: "none" }}
              />

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowActivityModal(false)}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Save Interaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "32px",
    background: COLORS.bg,
    minHeight: "100vh",
    color: COLORS.text,
    fontFamily: "Inter, sans-serif"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: "0 0 6px 0",
    background: "linear-gradient(135deg, #fff, #9ca3af)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    margin: 0
  },
  addButton: {
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(59,130,246,0.35)"
  },
  tabs: {
    display: "flex",
    gap: 8,
    borderBottom: `1px solid ${COLORS.border}`,
    marginBottom: 32
  },
  tabBtn: {
    background: "none",
    border: "none",
    padding: "12px 20px",
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    borderBottom: "2px solid transparent"
  },
  activeTabBtn: {
    background: "none",
    border: "none",
    padding: "12px 20px",
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    borderBottom: `2px solid ${COLORS.primary}`
  },
  content: {
    width: "100%"
  },
  loading: {
    textAlign: "center",
    color: COLORS.muted,
    padding: 40
  },
  emptyState: {
    textAlign: "center",
    color: COLORS.muted,
    padding: 48,
    border: `1px dashed ${COLORS.border}`,
    borderRadius: 16
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 24
  },
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  recruiterName: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0
  },
  recruiterTitle: {
    fontSize: 13,
    color: COLORS.muted,
    margin: "4px 0 0 0"
  },
  scoreGauge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  metaRow: {
    display: "flex",
    gap: 8
  },
  badge: {
    fontSize: 11,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 6
  },
  statsSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.01)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "12px 16px"
  },
  miniStat: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  miniLabel: {
    fontSize: 10,
    color: COLORS.muted,
    textTransform: "uppercase"
  },
  miniVal: {
    fontSize: 12,
    fontWeight: 700
  },
  progressContainer: {
    width: 60,
    height: 4,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    margin: "4px 0"
  },
  progressBar: {
    height: "100%"
  },
  notesPreview: {
    fontSize: 12,
    color: COLORS.muted,
    margin: 0,
    lineHeight: 1.4
  },
  cardActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 4
  },
  actionBtn: {
    background: COLORS.border,
    border: "none",
    borderRadius: 6,
    color: COLORS.text,
    padding: "8px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "center"
  },
  linkBtn: {
    background: "rgba(59, 130, 246, 0.1)",
    border: `1px solid rgba(59, 130, 246, 0.2)`,
    borderRadius: 6,
    color: "#60a5fa",
    padding: "8px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none"
  },
  latestInteraction: {
    background: "rgba(255,255,255,0.02)",
    borderRadius: 6,
    padding: 10,
    border: `1px solid ${COLORS.border}`
  },
  interactionHeader: {
    fontSize: 10,
    color: COLORS.muted,
    textTransform: "uppercase",
    fontWeight: 600
  },
  interactionText: {
    fontSize: 11,
    margin: "4px 0 0 0"
  },

  // Matcher Styles
  matcherContainer: {
    maxWidth: 800,
    margin: "0 auto"
  },
  searchRow: {
    display: "flex",
    gap: 12,
    marginBottom: 32
  },
  input: {
    flex: 1,
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "10px 16px",
    color: COLORS.text,
    fontSize: 14,
    outline: "none"
  },
  searchBtn: {
    background: COLORS.primary,
    border: "none",
    borderRadius: 8,
    color: "#fff",
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer"
  },
  matchesList: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  matchRow: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  matchProfile: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  matchRank: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: "rgba(59, 130, 246, 0.15)",
    color: COLORS.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14
  },
  matchName: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0
  },
  matchTitle: {
    fontSize: 13,
    color: COLORS.muted,
    margin: "2px 0 0 0"
  },
  matchMeta: {
    display: "flex",
    alignItems: "center",
    gap: 24
  },
  matchScoreIndicator: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },

  // Predictor Styles
  predictorContainer: {
    width: "100%"
  },
  predictorSplit: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32
  },
  predictorFormCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: 32
  },
  predictorTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 8px 0"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.muted,
    textTransform: "uppercase"
  },
  select: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "10px 14px",
    color: COLORS.text,
    outline: "none",
    fontSize: 14
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: COLORS.text,
    cursor: "pointer"
  },
  predictorOutputCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column"
  },
  predictorEmpty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 14,
    border: `1px dashed ${COLORS.border}`,
    borderRadius: 12,
    padding: 24
  },
  predictionScoreSection: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    background: "rgba(255,255,255,0.01)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 20
  },
  scoreRing: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    border: `4px solid ${COLORS.secondary}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 16px rgba(16,185,129,0.25)"
  },
  ringText: {
    fontSize: 16,
    fontWeight: 800,
    color: COLORS.secondary
  },
  predictionFeedbackBox: {
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 20
  },
  feedbackItem: {
    fontSize: 13,
    margin: 0,
    lineHeight: 1.4,
    color: COLORS.text
  },

  // Analytics Styles
  analyticsContainer: {
    width: "100%"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 24,
    marginBottom: 32
  },
  statCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8
  },
  statVal: {
    fontSize: 32,
    fontWeight: 800
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    textTransform: "uppercase"
  },
  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 24
  },
  chartCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: 24
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 20px 0"
  },
  chartRow: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  chartRowLabel: {
    width: 140,
    fontSize: 13,
    color: COLORS.muted
  },
  barContainer: {
    flex: 1,
    height: 10,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 5,
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    borderRadius: 5
  },
  chartRowVal: {
    width: 120,
    fontSize: 13,
    textAlign: "right",
    fontWeight: 600
  },

  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)"
  },
  modalContent: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: 32,
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 24px 0"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  modalInput: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "10px 14px",
    color: COLORS.text,
    fontSize: 14,
    outline: "none"
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8
  },
  cancelBtn: {
    background: "none",
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer"
  },
  saveBtn: {
    background: COLORS.primary,
    border: "none",
    color: "#fff",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer"
  },
  alert: {
    border: "1px solid",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13
  }
};
