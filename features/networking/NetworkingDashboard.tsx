"use client";

import React, { useState, useEffect } from "react";

interface Activity {
  id: string;
  type: string;
  date: string;
  description: string;
  outcome?: string;
}

interface NetworkContact {
  id: string;
  name: string;
  title?: string;
  company?: string;
  school?: string;
  graduationYear?: number;
  linkedinUrl?: string;
  email?: string;
  isAlumni: boolean;
  isRecruiter: boolean;
  isReferralPartner: boolean;
  connectionStrength: number;
  status: string;
  notes?: string;
  activities: Activity[];
}

interface IntroSuggestion {
  contact: NetworkContact;
  type: string;
  template: string;
}

const COLORS = {
  bg: "#0a0a0f",
  card: "#11111a",
  border: "#1f2937",
  primary: "#6366f1",
  secondary: "#a855f7",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  text: "#f3f4f6",
  muted: "#9ca3af"
};

export function NetworkingDashboard() {
  const [contacts, setContacts] = useState<NetworkContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"crm" | "alumni" | "intros" | "analytics">("crm");
  
  // CRM Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    title: "",
    company: "",
    school: "",
    graduationYear: "",
    linkedinUrl: "",
    email: "",
    isAlumni: false,
    isRecruiter: false,
    isReferralPartner: false,
    notes: ""
  });

  // Log Activity States
  const [activeContact, setActiveContact] = useState<NetworkContact | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: "EMAIL",
    description: "",
    outcome: ""
  });

  // Warm Intro States
  const [targetCompany, setTargetCompany] = useState("");
  const [introSuggestions, setIntroSuggestions] = useState<IntroSuggestion[]>([]);
  const [loadingIntros, setLoadingIntros] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    try {
      const res = await fetch("/api/v1/networking/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!newContact.name) return;

    try {
      const res = await fetch("/api/v1/networking/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewContact({
          name: "",
          title: "",
          company: "",
          school: "",
          graduationYear: "",
          linkedinUrl: "",
          email: "",
          isAlumni: false,
          isRecruiter: false,
          isReferralPartner: false,
          notes: ""
        });
        fetchContacts();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStatusChange(contactId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/v1/networking/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchContacts();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activeContact || !newActivity.description) return;

    try {
      const res = await fetch("/api/v1/networking/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: activeContact.id,
          ...newActivity
        })
      });
      if (res.ok) {
        setShowActivityModal(false);
        setActiveContact(null);
        setNewActivity({ type: "EMAIL", description: "", outcome: "" });
        fetchContacts();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSearchIntros() {
    if (!targetCompany) return;
    setLoadingIntros(true);
    try {
      const res = await fetch(`/api/v1/networking/intros?company=${encodeURIComponent(targetCompany)}`);
      if (res.ok) {
        const data = await res.json();
        setIntroSuggestions(data.suggestions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIntros(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "DISCOVERED": return COLORS.muted;
      case "OUTREACHED": return COLORS.warning;
      case "CONNECTED": return COLORS.primary;
      case "COFFEE_CHAT": return COLORS.secondary;
      case "REFERRAL_REQUESTED": return "#c084fc";
      case "REFERRAL_SECURED": return COLORS.success;
      default: return COLORS.text;
    }
  }

  // Analytics Helpers
  const totalAlumni = contacts.filter(c => c.isAlumni).length;
  const totalRecruiters = contacts.filter(c => c.isRecruiter).length;
  const totalReferralPartners = contacts.filter(c => c.isReferralPartner).length;
  
  const statusCounts = contacts.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Networking Intelligence CRM</h1>
          <p style={styles.subtitle}>Supercharge your professional circles, track outreach pipeline, and leverage warm intros.</p>
        </div>
        <button style={styles.addButton} onClick={() => setShowAddModal(true)}>
          + Add Contact
        </button>
      </div>

      {/* Quick Alerts/Reminders */}
      {contacts.some(c => c.connectionStrength < 25 && c.status !== "DISCOVERED") && (
        <div style={styles.alert}>
          <span style={{ fontWeight: 600 }}>⚠️ Stagnant Connections:</span> Some of your networking contacts are cooling down. Log a coffee chat or send an email to rebuild your strength scores!
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={activeTab === "crm" ? styles.activeTabBtn : styles.tabBtn} onClick={() => setActiveTab("crm")}>CRM Pipeline</button>
        <button style={activeTab === "alumni" ? styles.activeTabBtn : styles.tabBtn} onClick={() => setActiveTab("alumni")}>Alumni Directory</button>
        <button style={activeTab === "intros" ? styles.activeTabBtn : styles.tabBtn} onClick={() => setActiveTab("intros")}>Warm Intro Suggestions</button>
        <button style={activeTab === "analytics" ? styles.activeTabBtn : styles.tabBtn} onClick={() => setActiveTab("analytics")}>Analytics</button>
      </div>

      {/* CRM Pipeline */}
      {activeTab === "crm" && (
        <div style={styles.crmContainer}>
          {loading ? (
            <div style={styles.loading}>Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div style={styles.emptyState}>No contacts in CRM. Click Add Contact to begin.</div>
          ) : (
            <div style={styles.contactList}>
              {contacts.map(c => (
                <div key={c.id} style={styles.contactCard}>
                  <div style={styles.contactHeader}>
                    <div>
                      <h3 style={styles.contactName}>{c.name}</h3>
                      <p style={styles.contactTitle}>{c.title || "No Title"} {c.company ? `at ${c.company}` : ""}</p>
                    </div>
                    <div style={styles.strengthBadge}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: c.connectionStrength > 50 ? COLORS.success : COLORS.warning }}>
                        {c.connectionStrength}
                      </span>
                      <span style={{ fontSize: 9, textTransform: "uppercase", color: COLORS.muted }}>Strength</span>
                    </div>
                  </div>

                  <div style={styles.tagsContainer}>
                    {c.isAlumni && <span style={{ ...styles.badge, background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>Alumni</span>}
                    {c.isRecruiter && <span style={{ ...styles.badge, background: "rgba(244,63,94,0.15)", color: "#fb7185" }}>Recruiter</span>}
                    {c.isReferralPartner && <span style={{ ...styles.badge, background: "rgba(16,185,129,0.15)", color: "#34d399" }}>Referral Partner</span>}
                  </div>

                  {c.school && (
                    <p style={styles.alumniText}>🎓 {c.school} {c.graduationYear ? `Class of '${c.graduationYear}` : ""}</p>
                  )}

                  <div style={styles.statusRow}>
                    <span style={styles.statusLabel}>Status:</span>
                    <select 
                      value={c.status} 
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      style={{ ...styles.select, color: getStatusColor(c.status) }}
                    >
                      <option value="DISCOVERED">Discovered</option>
                      <option value="OUTREACHED">Outreached</option>
                      <option value="CONNECTED">Connected</option>
                      <option value="COFFEE_CHAT">Coffee Chat</option>
                      <option value="REFERRAL_REQUESTED">Referral Requested</option>
                      <option value="REFERRAL_SECURED">Referral Secured</option>
                    </select>
                  </div>

                  <div style={styles.contactActions}>
                    <button 
                      style={styles.actionBtn} 
                      onClick={() => {
                        setActiveContact(c);
                        setShowActivityModal(true);
                      }}
                    >
                      📝 Log Activity
                    </button>
                    {c.linkedinUrl && (
                      <a href={c.linkedinUrl} target="_blank" rel="noreferrer" style={styles.actionBtnLink}>
                        🔗 LinkedIn
                      </a>
                    )}
                  </div>

                  {(() => {
                    const latest = c.activities[0];
                    if (!latest) return null;
                    return (
                      <div style={styles.recentActivity}>
                        <span style={styles.recentActivityTitle}>Latest Activity:</span>
                        <p style={styles.recentActivityDesc}>
                          [{new Date(latest.date).toLocaleDateString()}] {latest.type} - {latest.description}
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

      {/* Alumni Tab */}
      {activeTab === "alumni" && (
        <div style={styles.crmContainer}>
          <div style={styles.contactList}>
            {contacts.filter(c => c.isAlumni).map(c => (
              <div key={c.id} style={styles.contactCard}>
                <h3 style={styles.contactName}>{c.name}</h3>
                <p style={styles.contactTitle}>{c.title} at {c.company}</p>
                <p style={styles.alumniText}>🎓 {c.school} {c.graduationYear ? `(Class of ${c.graduationYear})` : ""}</p>
                <button 
                  style={{ ...styles.addButton, marginTop: 12, width: "100%" }}
                  onClick={() => {
                    setActiveTab("intros");
                    setTargetCompany(c.company || "");
                  }}
                >
                  Request Coffee Chat
                </button>
              </div>
            ))}
            {contacts.filter(c => c.isAlumni).length === 0 && (
              <div style={styles.emptyState}>No Alumni contacts registered in your CRM. Add one to see them here.</div>
            )}
          </div>
        </div>
      )}

      {/* Warm Intro Tab */}
      {activeTab === "intros" && (
        <div style={styles.introsContainer}>
          <div style={styles.searchRow}>
            <input 
              type="text" 
              placeholder="Enter Target Company (e.g. Google, Amazon)" 
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              style={styles.input}
            />
            <button style={styles.addButton} onClick={handleSearchIntros}>
              Search Connections
            </button>
          </div>

          {loadingIntros ? (
            <div style={styles.loading}>Searching contacts...</div>
          ) : (
            <div style={styles.suggestionsList}>
              {introSuggestions.map((s, i) => (
                <div key={i} style={styles.suggestionCard}>
                  <div style={styles.suggestionHeader}>
                    <div>
                      <h4 style={styles.suggestionName}>{s.contact.name}</h4>
                      <p style={styles.suggestionTitle}>{s.contact.title} at {s.contact.company}</p>
                    </div>
                    <span style={styles.suggestionTypeBadge}>{s.type}</span>
                  </div>
                  
                  <div style={styles.templateBox}>
                    <pre style={styles.templateContent}>{s.template}</pre>
                    <button 
                      style={styles.copyBtn}
                      onClick={() => {
                        navigator.clipboard.writeText(s.template);
                        alert("Template copied to clipboard!");
                      }}
                    >
                      Copy Template
                    </button>
                  </div>
                </div>
              ))}
              {targetCompany && introSuggestions.length === 0 && (
                <div style={styles.emptyState}>No warm connection paths or alumni found at {targetCompany}. Try adding contacts from this company first.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div style={styles.analyticsContainer}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statVal}>{contacts.length}</span>
              <span style={styles.statLabel}>Total Contacts</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statVal}>{totalAlumni}</span>
              <span style={styles.statLabel}>Alumni</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statVal}>{totalRecruiters}</span>
              <span style={styles.statLabel}>Recruiters</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statVal}>{totalReferralPartners}</span>
              <span style={styles.statLabel}>Referral Partners</span>
            </div>
          </div>

          {/* Status Breakdown Charts */}
          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Outreach Pipeline Status</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const pct = Math.round((count / contacts.length) * 100);
                  return (
                    <div key={status} style={styles.chartRow}>
                      <span style={styles.chartRowLabel}>{status}</span>
                      <div style={styles.barContainer}>
                        <div style={{ ...styles.barFill, width: `${pct}%`, background: getStatusColor(status) }}></div>
                      </div>
                      <span style={styles.chartRowVal}>{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Add Networking Contact</h2>
            <form onSubmit={handleAddContact} style={styles.form}>
              <input 
                type="text" 
                placeholder="Name *" 
                required 
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                style={styles.modalInput}
              />
              <input 
                type="text" 
                placeholder="Title (e.g. Software Engineer)" 
                value={newContact.title}
                onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                style={styles.modalInput}
              />
              <input 
                type="text" 
                placeholder="Company (e.g. Stripe)" 
                value={newContact.company}
                onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                style={styles.modalInput}
              />
              <input 
                type="text" 
                placeholder="School / Alma Mater" 
                value={newContact.school}
                onChange={(e) => setNewContact({ ...newContact, school: e.target.value })}
                style={styles.modalInput}
              />
              <input 
                type="number" 
                placeholder="Graduation Year" 
                value={newContact.graduationYear}
                onChange={(e) => setNewContact({ ...newContact, graduationYear: e.target.value })}
                style={styles.modalInput}
              />
              <input 
                type="text" 
                placeholder="LinkedIn URL" 
                value={newContact.linkedinUrl}
                onChange={(e) => setNewContact({ ...newContact, linkedinUrl: e.target.value })}
                style={styles.modalInput}
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                style={styles.modalInput}
              />
              <textarea 
                placeholder="Private Notes" 
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                style={{ ...styles.modalInput, height: 80, resize: "none" }}
              />

              <div style={styles.checkboxes}>
                <label style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={newContact.isAlumni} 
                    onChange={(e) => setNewContact({ ...newContact, isAlumni: e.target.checked })}
                  />
                  School Alumni
                </label>
                <label style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={newContact.isRecruiter} 
                    onChange={(e) => setNewContact({ ...newContact, isRecruiter: e.target.checked })}
                  />
                  Recruiter
                </label>
                <label style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={newContact.isReferralPartner} 
                    onChange={(e) => setNewContact({ ...newContact, isReferralPartner: e.target.checked })}
                  />
                  Referral Partner
                </label>
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Save Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showActivityModal && activeContact && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Log Activity with {activeContact.name}</h2>
            <form onSubmit={handleLogActivity} style={styles.form}>
              <select 
                value={newActivity.type} 
                onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                style={styles.modalInput}
              >
                <option value="EMAIL">Email Outreach</option>
                <option value="LINKEDIN_MESSAGE">LinkedIn Message</option>
                <option value="COFFEE_CHAT">Coffee Chat / Informational</option>
                <option value="PHONE_CALL">Phone Call</option>
                <option value="OTHER">Other Activity</option>
              </select>
              <textarea 
                placeholder="What did you discuss? *" 
                required
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                style={{ ...styles.modalInput, height: 100, resize: "none" }}
              />
              <input 
                type="text" 
                placeholder="Outcome (e.g. Scheduled follow-up)" 
                value={newActivity.outcome}
                onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                style={styles.modalInput}
              />

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowActivityModal(false)}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Log Activity</button>
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
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(99,102,241,0.4)"
  },
  alert: {
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: 8,
    padding: "12px 16px",
    color: "#fbbf24",
    fontSize: 13,
    marginBottom: 24
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
  crmContainer: {
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
  contactList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 24
  },
  contactCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  contactHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  contactName: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0
  },
  contactTitle: {
    fontSize: 13,
    color: COLORS.muted,
    margin: "4px 0 0 0"
  },
  strengthBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  tagsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },
  badge: {
    fontSize: 11,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 6
  },
  alumniText: {
    fontSize: 12,
    color: COLORS.muted,
    margin: 0
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 12
  },
  statusLabel: {
    fontSize: 13,
    color: COLORS.muted
  },
  select: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 13,
    fontWeight: 600,
    outline: "none"
  },
  contactActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginTop: 8
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
  actionBtnLink: {
    background: COLORS.border,
    borderRadius: 6,
    color: COLORS.text,
    padding: "8px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none"
  },
  recentActivity: {
    background: "rgba(255,255,255,0.02)",
    borderRadius: 6,
    padding: 10,
    border: `1px solid ${COLORS.border}`
  },
  recentActivityTitle: {
    fontSize: 11,
    color: COLORS.muted,
    textTransform: "uppercase",
    fontWeight: 600
  },
  recentActivityDesc: {
    fontSize: 11,
    margin: "4px 0 0 0",
    color: COLORS.text
  },
  // Intros Styling
  introsContainer: {
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
    padding: "12px 16px",
    color: COLORS.text,
    fontSize: 14,
    outline: "none"
  },
  suggestionsList: {
    display: "flex",
    flexDirection: "column",
    gap: 20
  },
  suggestionCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 20
  },
  suggestionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0
  },
  suggestionTitle: {
    fontSize: 13,
    color: COLORS.muted,
    margin: "4px 0 0 0"
  },
  suggestionTypeBadge: {
    background: "rgba(168,85,247,0.15)",
    color: "#d8b4fe",
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 8
  },
  templateBox: {
    position: "relative",
    background: "#08080c",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 16
  },
  templateContent: {
    margin: 0,
    fontSize: 13,
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    color: "#d1d5db"
  },
  copyBtn: {
    marginTop: 12,
    background: COLORS.border,
    border: "none",
    borderRadius: 6,
    color: COLORS.text,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer"
  },
  // Analytics Styling
  analyticsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 32
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20
  },
  statCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 24,
    textAlign: "center"
  },
  statVal: {
    fontSize: 32,
    fontWeight: 800,
    color: COLORS.primary,
    display: "block"
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    textTransform: "uppercase",
    marginTop: 4,
    display: "block"
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 24
  },
  chartCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 24
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 20
  },
  chartRow: {
    display: "grid",
    gridTemplateColumns: "160px 1fr 100px",
    alignItems: "center",
    gap: 16
  },
  chartRowLabel: {
    fontSize: 13,
    color: COLORS.muted
  },
  barContainer: {
    height: 8,
    background: COLORS.border,
    borderRadius: 4,
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    borderRadius: 4
  },
  chartRowVal: {
    fontSize: 13,
    textAlign: "right"
  },
  // Modal Styling
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  modalContent: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: 28,
    width: "100%",
    maxWidth: 500,
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 20,
    color: "#fff"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12
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
  checkboxes: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    margin: "8px 0"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: COLORS.text,
    cursor: "pointer"
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16
  },
  cancelBtn: {
    background: "none",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.muted,
    padding: "10px 18px",
    fontSize: 14,
    cursor: "pointer"
  },
  saveBtn: {
    background: COLORS.primary,
    border: "none",
    borderRadius: 8,
    color: "#fff",
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer"
  }
};
