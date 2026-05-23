"use client";

import React, { useState } from "react";
import styles from "./ContributionWizard.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// ContributionWizard
// 5-step guided contribution flow for interview experiences, questions,
// salary data, and recruiter patterns.
// ─────────────────────────────────────────────────────────────────────────────

type ContributionType = "experience" | "question" | "salary" | "recruiter_pattern" | "correction";

interface WizardStep {
  id: number;
  label: string;
  description: string;
}

const STEPS: WizardStep[] = [
  { id: 1, label: "Company & Role", description: "Tell us where you interviewed" },
  { id: 2, label: "Type",           description: "What are you sharing?" },
  { id: 3, label: "Details",        description: "The actual intelligence" },
  { id: 4, label: "Verify",         description: "Optional: boost trust score" },
  { id: 5, label: "Submit",         description: "Review and submit" },
];

const TYPE_OPTIONS: { value: ContributionType; label: string; icon: string; description: string; points: number }[] = [
  { value: "experience",        label: "Interview Experience", icon: "📝", description: "Full round-by-round breakdown of your recent interview", points: 100 },
  { value: "question",          label: "Interview Question",   icon: "🧩", description: "A specific question you were asked in any round", points: 50 },
  { value: "salary",            label: "Salary / CTC",        icon: "💰", description: "Anonymized offer data: base, ESOPs, joining bonus", points: 75 },
  { value: "recruiter_pattern", label: "Recruiter Pattern",   icon: "🎯", description: "Response rate, ghosting, timeline from a specific recruiter", points: 60 },
  { value: "correction",        label: "Data Correction",     icon: "✏️",  description: "Fix incorrect information already on CareerOS", points: 30 },
];

const INDIA_COMPANIES_QUICK = [
  "Razorpay", "PhonePe", "Flipkart", "Swiggy", "Zomato",
  "Meesho", "Amazon India", "Groww", "CRED", "Microsoft India",
  "Google India", "Paytm", "Urban Company", "Zepto", "BrowserStack",
  "Freshworks", "Zoho", "InMobi", "Ola", "Unacademy",
];

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard", "expert"];
const ROUND_TYPES = ["Online Assessment", "Machine Coding", "DSA / Problem Solving", "System Design", "Behavioral / HR", "Hiring Manager", "Bar Raiser", "Founders Round"];
const OUTCOMES = ["selected", "rejected", "waitlisted", "withdrew", "pending"];
const LEVELS = ["Fresher / SDE 1", "SDE 2 (2-5 yrs)", "SDE 3 / Senior", "Staff / Principal"];

interface FormState {
  // Step 1
  companyName: string;
  companyCustom: string;
  roleTitle: string;
  level: string;
  location: string;
  occurredAt: string;
  // Step 2
  type: ContributionType | "";
  // Step 3
  // — experience
  outcome: string;
  totalRounds: number;
  timelineDays: number;
  rounds: Array<{ type: string; difficulty: string; duration: number; notes: string }>;
  overallDifficulty: string;
  // — question
  questionText: string;
  questionType: string;
  questionDifficulty: string;
  questionRound: string;
  // — salary
  salaryBase: string;
  salaryTotal: string;
  salaryEsop: string;
  salaryBonus: string;
  salaryCurrency: string;
  // — recruiter
  recruiterName: string;
  recruiterResponseRate: string;
  recruiterDays: string;
  recruiterGhosted: boolean;
  recruiterNotes: string;
}

const DEFAULT_FORM: FormState = {
  companyName: "", companyCustom: "", roleTitle: "", level: "", location: "Bengaluru, India", occurredAt: "",
  type: "",
  outcome: "", totalRounds: 4, timelineDays: 0,
  rounds: [{ type: "Online Assessment", difficulty: "medium", duration: 60, notes: "" }],
  overallDifficulty: "medium",
  questionText: "", questionType: "dsa", questionDifficulty: "medium", questionRound: "Technical",
  salaryBase: "", salaryTotal: "", salaryEsop: "", salaryBonus: "", salaryCurrency: "INR",
  recruiterName: "", recruiterResponseRate: "50", recruiterDays: "7", recruiterGhosted: false, recruiterNotes: "",
};

interface ContributionWizardProps {
  onSuccess?: (contribution: { id: string; type: string; status: string; points: number }) => void;
  onClose?: () => void;
  initialCompany?: string;
}

export function ContributionWizard({ onSuccess, onClose, initialCompany }: ContributionWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM, companyName: initialCompany ?? "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyEmail, setVerifyEmail] = useState(false);

  const effectiveCompany = form.companyName === "__custom__" ? form.companyCustom : form.companyName;
  const selectedType = TYPE_OPTIONS.find((t) => t.value === form.type);
  const canProceed = stepValid(step, form, effectiveCompany);

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function updateRound(index: number, patch: Partial<{ type: string; difficulty: string; duration: number; notes: string }>) {
    const rounds = [...form.rounds];
    rounds[index] = { ...rounds[index]!, ...patch };
    update({ rounds });
  }

  function addRound() {
    update({ rounds: [...form.rounds, { type: "Technical", difficulty: "medium", duration: 60, notes: "" }] });
  }

  function removeRound(index: number) {
    update({ rounds: form.rounds.filter((_, i) => i !== index) });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload(form, effectiveCompany);
      const res = await fetch("/api/v1/interview-intelligence/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed. Please try again.");
      }
      const data = await res.json();
      onSuccess?.({
        id: data.data?.id,
        type: form.type,
        status: data.data?.status,
        points: selectedType?.points ?? 50,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wizard}>
      {/* Progress */}
      <div className={styles.progress}>
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`${styles.stepDot} ${step === s.id ? styles.stepActive : ""} ${step > s.id ? styles.stepDone : ""}`}
          >
            {step > s.id ? "✓" : s.id}
          </div>
        ))}
        <div className={styles.progressBar} style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
      </div>

      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>{STEPS[step - 1]?.label}</h2>
        <p className={styles.stepSubtitle}>{STEPS[step - 1]?.description}</p>
      </div>

      {/* Step content */}
      <div className={styles.stepContent}>

        {/* ── STEP 1: Company & Role ── */}
        {step === 1 && (
          <div className={styles.fields}>
            <label className={styles.label}>Company *</label>
            <div className={styles.quickPicks}>
              {INDIA_COMPANIES_QUICK.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.quickPick} ${form.companyName === c ? styles.quickPickActive : ""}`}
                  onClick={() => update({ companyName: c })}
                >
                  {c}
                </button>
              ))}
              <button
                type="button"
                className={`${styles.quickPick} ${form.companyName === "__custom__" ? styles.quickPickActive : ""}`}
                onClick={() => update({ companyName: "__custom__" })}
              >
                Other…
              </button>
            </div>
            {form.companyName === "__custom__" && (
              <input
                className={styles.input}
                placeholder="Company name"
                value={form.companyCustom}
                onChange={(e) => update({ companyCustom: e.target.value })}
              />
            )}

            <label className={styles.label}>Role / Position *</label>
            <input
              className={styles.input}
              placeholder="e.g. Software Development Engineer 2"
              value={form.roleTitle}
              onChange={(e) => update({ roleTitle: e.target.value })}
            />

            <label className={styles.label}>Level</label>
            <select className={styles.select} value={form.level} onChange={(e) => update({ level: e.target.value })}>
              <option value="">Select level</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>

            <label className={styles.label}>Interview date (approx.)</label>
            <input
              type="month"
              className={styles.input}
              value={form.occurredAt}
              onChange={(e) => update({ occurredAt: e.target.value })}
            />
          </div>
        )}

        {/* ── STEP 2: Type ── */}
        {step === 2 && (
          <div className={styles.typeGrid}>
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`${styles.typeCard} ${form.type === t.value ? styles.typeCardActive : ""}`}
                onClick={() => update({ type: t.value })}
              >
                <span className={styles.typeIcon}>{t.icon}</span>
                <div>
                  <div className={styles.typeLabel}>{t.label}</div>
                  <div className={styles.typeDesc}>{t.description}</div>
                </div>
                <div className={styles.typePoints}>+{t.points} pts</div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 3: Details ── */}
        {step === 3 && form.type === "experience" && (
          <div className={styles.fields}>
            <label className={styles.label}>Outcome *</label>
            <div className={styles.quickPicks}>
              {OUTCOMES.map((o) => (
                <button key={o} type="button"
                  className={`${styles.quickPick} ${form.outcome === o ? styles.quickPickActive : ""}`}
                  onClick={() => update({ outcome: o })}
                >
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>

            <label className={styles.label}>Overall difficulty</label>
            <div className={styles.quickPicks}>
              {DIFFICULTY_OPTIONS.map((d) => (
                <button key={d} type="button"
                  className={`${styles.quickPick} ${form.overallDifficulty === d ? styles.quickPickActive : ""}`}
                  onClick={() => update({ overallDifficulty: d })}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            <label className={styles.label}>Timeline (days from apply to offer/reject)</label>
            <input type="number" className={styles.input} min={1} max={365}
              value={form.timelineDays || ""}
              placeholder="e.g. 21"
              onChange={(e) => update({ timelineDays: parseInt(e.target.value) || 0 })}
            />

            <label className={styles.label}>Rounds breakdown</label>
            {form.rounds.map((r, i) => (
              <div key={i} className={styles.roundRow}>
                <span className={styles.roundIndex}>R{i + 1}</span>
                <select className={styles.selectSm} value={r.type}
                  onChange={(e) => updateRound(i, { type: e.target.value })}>
                  {ROUND_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
                </select>
                <select className={styles.selectSm} value={r.difficulty}
                  onChange={(e) => updateRound(i, { difficulty: e.target.value })}>
                  {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="number" className={styles.inputSm} placeholder="min" min={15} max={360}
                  value={r.duration || ""}
                  onChange={(e) => updateRound(i, { duration: parseInt(e.target.value) || 60 })}
                />
                <button type="button" className={styles.removeRound} onClick={() => removeRound(i)}>×</button>
              </div>
            ))}
            <button type="button" className={styles.addRoundBtn} onClick={addRound}>
              + Add round
            </button>
          </div>
        )}

        {step === 3 && form.type === "question" && (
          <div className={styles.fields}>
            <label className={styles.label}>Question text *</label>
            <textarea
              className={styles.textarea}
              placeholder="Paste the exact question or describe it in detail. e.g. 'Design a distributed rate limiter for Razorpay's payment API handling 10M RPM.'"
              rows={4}
              value={form.questionText}
              onChange={(e) => update({ questionText: e.target.value })}
            />

            <label className={styles.label}>Question type</label>
            <div className={styles.quickPicks}>
              {["dsa", "system_design", "machine_coding", "behavioral", "lld", "aptitude"].map((qt) => (
                <button key={qt} type="button"
                  className={`${styles.quickPick} ${form.questionType === qt ? styles.quickPickActive : ""}`}
                  onClick={() => update({ questionType: qt })}
                >
                  {qt.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>

            <label className={styles.label}>Difficulty</label>
            <div className={styles.quickPicks}>
              {DIFFICULTY_OPTIONS.map((d) => (
                <button key={d} type="button"
                  className={`${styles.quickPick} ${form.questionDifficulty === d ? styles.quickPickActive : ""}`}
                  onClick={() => update({ questionDifficulty: d })}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            <label className={styles.label}>Which round was this asked in?</label>
            <select className={styles.select} value={form.questionRound}
              onChange={(e) => update({ questionRound: e.target.value })}>
              {ROUND_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
            </select>
          </div>
        )}

        {step === 3 && form.type === "salary" && (
          <div className={styles.fields}>
            <div className={styles.salaryNote}>
              🔒 All salary data is fully anonymized. Only percentiles are displayed publicly.
            </div>
            <label className={styles.label}>Base salary (₹/year) *</label>
            <input className={styles.input} type="number" placeholder="e.g. 2400000"
              value={form.salaryBase} onChange={(e) => update({ salaryBase: e.target.value })} />

            <label className={styles.label}>Total CTC (₹/year) *</label>
            <input className={styles.input} type="number" placeholder="e.g. 3500000"
              value={form.salaryTotal} onChange={(e) => update({ salaryTotal: e.target.value })} />

            <label className={styles.label}>ESOP / RSU value (₹ over 4 years)</label>
            <input className={styles.input} type="number" placeholder="e.g. 5000000"
              value={form.salaryEsop} onChange={(e) => update({ salaryEsop: e.target.value })} />

            <label className={styles.label}>Joining bonus (₹)</label>
            <input className={styles.input} type="number" placeholder="e.g. 200000"
              value={form.salaryBonus} onChange={(e) => update({ salaryBonus: e.target.value })} />
          </div>
        )}

        {step === 3 && form.type === "recruiter_pattern" && (
          <div className={styles.fields}>
            <label className={styles.label}>Recruiter name (optional, not displayed publicly)</label>
            <input className={styles.input} placeholder="First name only, e.g. Priya"
              value={form.recruiterName} onChange={(e) => update({ recruiterName: e.target.value })} />

            <label className={styles.label}>Response rate (estimate)</label>
            <input className={styles.input} type="range" min={0} max={100}
              value={form.recruiterResponseRate}
              onChange={(e) => update({ recruiterResponseRate: e.target.value })} />
            <span className={styles.rangeLabel}>{form.recruiterResponseRate}%</span>

            <label className={styles.label}>Avg days to respond</label>
            <input className={styles.input} type="number" min={0} max={90} placeholder="e.g. 5"
              value={form.recruiterDays} onChange={(e) => update({ recruiterDays: e.target.value })} />

            <label className={styles.label}>
              <input type="checkbox" checked={form.recruiterGhosted}
                onChange={(e) => update({ recruiterGhosted: e.target.checked })}
              />{" "}
              Ghosted after final round
            </label>

            <label className={styles.label}>Notes (optional)</label>
            <textarea className={styles.textarea} rows={3} placeholder="Any other observations about the recruiter / process"
              value={form.recruiterNotes} onChange={(e) => update({ recruiterNotes: e.target.value })} />
          </div>
        )}

        {/* ── STEP 4: Verify ── */}
        {step === 4 && (
          <div className={styles.fields}>
            <div className={styles.verifyHero}>
              <span className={styles.verifyEmoji}>🔐</span>
              <h3 className={styles.verifyTitle}>Boost your contribution's trust score</h3>
              <p className={styles.verifySubtitle}>
                Verified contributions are weighted 2× in our ranking system and receive a gold badge.
                This is optional — your contribution will still be accepted without verification.
              </p>
            </div>

            <div className={styles.verifyOptions}>
              <button
                type="button"
                className={`${styles.verifyOption} ${verifyEmail ? styles.verifyOptionActive : ""}`}
                onClick={() => setVerifyEmail(!verifyEmail)}
              >
                <span className={styles.verifyOptionIcon}>📧</span>
                <div>
                  <div className={styles.verifyOptionLabel}>Verify via company email</div>
                  <div className={styles.verifyOptionDesc}>
                    If you have access to your @{effectiveCompany.toLowerCase().replace(/[^a-z]/g, "")}.com email,
                    we can instantly verify your insider status.
                  </div>
                </div>
                <span className={styles.verifyBadge}>+Tier 1</span>
              </button>

              <div className={`${styles.verifyOption} ${styles.verifyOptionDisabled}`}>
                <span className={styles.verifyOptionIcon}>📄</span>
                <div>
                  <div className={styles.verifyOptionLabel}>Verify via offer letter</div>
                  <div className={styles.verifyOptionDesc}>
                    Upload a hash of your offer letter (document never stored). Coming soon.
                  </div>
                </div>
                <span className={styles.verifyBadgeSoon}>Soon</span>
              </div>
            </div>

            <div className={styles.skipNote}>
              Skipping verification is fine — community voting will still validate your contribution over time.
            </div>
          </div>
        )}

        {/* ── STEP 5: Review & Submit ── */}
        {step === 5 && (
          <div className={styles.review}>
            <div className={styles.reviewCard}>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Company</span>
                <span className={styles.reviewValue}>{effectiveCompany}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Role</span>
                <span className={styles.reviewValue}>{form.roleTitle}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Type</span>
                <span className={styles.reviewValue}>{selectedType?.icon} {selectedType?.label}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Points earned</span>
                <span className={styles.reviewPoints}>+{selectedType?.points ?? 50} pts</span>
              </div>
            </div>

            <div className={styles.communityNote}>
              <span>🤝</span>
              <p>
                By submitting, you agree to CareerOS's community contribution guidelines.
                Your data helps thousands of India engineers navigate hiring better.
              </p>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={styles.nav}>
        {step > 1 && (
          <button type="button" className={styles.btnBack} onClick={() => setStep((s) => s - 1)}>
            ← Back
          </button>
        )}
        <div className={styles.navRight}>
          {onClose && (
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Cancel
            </button>
          )}
          {step < STEPS.length ? (
            <button
              type="button"
              className={styles.btnNext}
              disabled={!canProceed}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnSubmit}
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? "Submitting…" : "🚀 Submit Contribution"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function stepValid(step: number, form: FormState, company: string): boolean {
  if (step === 1) return company.trim().length > 0 && form.roleTitle.trim().length > 0;
  if (step === 2) return form.type !== "";
  if (step === 3) {
    if (form.type === "experience") return form.outcome !== "";
    if (form.type === "question") return form.questionText.trim().length >= 20;
    if (form.type === "salary") return form.salaryBase !== "" && form.salaryTotal !== "";
    return true;
  }
  return true;
}

function buildPayload(form: FormState, company: string) {
  const base = {
    type: form.type,
    companyName: company,
    roleTitle: form.roleTitle || undefined,
  };

  if (form.type === "experience") {
    return {
      ...base,
      payload: {
        outcome: form.outcome,
        overallDifficulty: form.overallDifficulty,
        timelineDays: form.timelineDays || undefined,
        level: form.level || undefined,
        occurredAt: form.occurredAt || undefined,
        rounds: form.rounds,
      },
    };
  }

  if (form.type === "question") {
    return {
      ...base,
      payload: {
        question: form.questionText,
        type: form.questionType,
        difficulty: form.questionDifficulty,
        round: form.questionRound,
      },
    };
  }

  if (form.type === "salary") {
    return {
      ...base,
      payload: {
        baseAnnual: parseInt(form.salaryBase) || undefined,
        totalCtc: parseInt(form.salaryTotal) || undefined,
        esop4yr: form.salaryEsop ? parseInt(form.salaryEsop) : undefined,
        joiningBonus: form.salaryBonus ? parseInt(form.salaryBonus) : undefined,
        currency: "INR",
        level: form.level || undefined,
        occurredAt: form.occurredAt || undefined,
      },
    };
  }

  if (form.type === "recruiter_pattern") {
    return {
      ...base,
      payload: {
        recruiterName: form.recruiterName || undefined,
        responseRatePct: parseInt(form.recruiterResponseRate),
        avgResponseDays: parseInt(form.recruiterDays) || undefined,
        ghostedAfterFinalRound: form.recruiterGhosted,
        notes: form.recruiterNotes || undefined,
      },
    };
  }

  return { ...base, payload: {} };
}
