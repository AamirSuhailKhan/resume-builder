"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

type AppState = "idle" | "loading" | "ready" | "mock" | "mock_result";
type Difficulty = "Easy" | "Medium" | "Hard";
type DifficultyFilter = "all" | "easy" | "medium" | "hard";
type SortMode = "difficulty" | "frequency" | "topic";

type Overview = {
  company: string;
  role: string;
  totalRounds: number;
  processDuration: string;
  difficulty: string;
  ctcRange: string;
  summary: string;
};

type Tip = {
  type: "process" | "culture" | "warning" | "salary" | string;
  text: string;
};

type Question = {
  id: string;
  storageId?: string;
  q: string;
  round: string;
  difficulty: Difficulty;
  frequency?: number;
  frequencyLabel?: string;
  topic?: string;
  bookmarked: boolean;
  practiced: boolean;
  answerVisible?: boolean;
  answerLoading?: boolean;
  answerText?: string;
  answerError?: string;
  timeComplexityHint?: string;
  category?: string;
};

type PrepData = {
  overview: Overview;
  repeated: Question[];
  technical: Question[];
  systemDesign: Question[];
  behavioral: Question[];
  tips: Tip[];
};

type FormValues = {
  company: string;
  role: string;
  experience: string;
  rounds: string[];
};

type LastSession = {
  company: string;
  role: string;
  experience?: string;
  rounds?: string[];
  timestamp: number;
};

type MockEvaluation = {
  score: number;
  scoreLabel: string;
  goodPoints: string[];
  missingPoints: string[];
  modelAnswer: string;
  nextTip: string;
};

type MockResult = MockEvaluation & {
  question: Question;
  answer: string;
};

type FinalReportData = {
  results: MockResult[];
  overallScore: number;
  strongestArea: string;
  weakestArea: string;
  improvements: string[];
};

const COMPANIES = [
  "Razorpay",
  "Swiggy",
  "Zomato",
  "CRED",
  "PhonePe",
  "Zepto",
  "Meesho",
  "Flipkart",
  "Google India",
  "Amazon India",
  "Microsoft India",
  "Juspay",
  "Groww",
  "Paytm",
  "Ola",
  "Byju's",
  "Freshworks",
  "Zoho",
  "Infosys",
  "TCS",
  "Wipro",
  "Accenture India",
  "Deloitte India",
];

const ROLES = [
  "SDE1",
  "SDE2",
  "SDE3",
  "Staff Engineer",
  "Principal Engineer",
  "Product Manager",
  "Senior PM",
  "Data Scientist",
  "ML Engineer",
  "Data Engineer",
  "DevOps/SRE",
  "Frontend Engineer",
  "Backend Engineer",
  "Fullstack Engineer",
  "Android Engineer",
  "iOS Engineer",
  "Business Analyst",
  "QA Engineer",
  "Scrum Master",
];

const EXPERIENCE_LEVELS = [
  "Fresher (0-1yr)",
  "Junior (1-3yr)",
  "Mid (3-6yr)",
  "Senior (6+yr)",
];

const ROUND_TYPES = [
  "DSA / Coding rounds",
  "System Design",
  "Behavioral / Non-technical",
  "HR round",
  "Case study / Product sense",
  "Manager round",
];

const TABS = [
  { key: "repeated", label: "Most Repeated", icon: "ti-flame" },
  { key: "technical", label: "Technical", icon: "ti-code" },
  { key: "systemDesign", label: "System Design", icon: "ti-target" },
  { key: "behavioral", label: "Behavioral + HR", icon: "ti-users" },
  { key: "tips", label: "Insider Tips", icon: "ti-bulb" },
] as const;

const LOADING_MESSAGES = [
  "Analyzing {company}'s interview patterns...",
  "{company} ke questions dhundh rahe hain...",
  "Most repeated questions identify ho rahe hain...",
  "Mock interview taiyaar ho raha hai...",
];

const BOOKMARK_KEY = "interviewai_bookmarks";
const PRACTICED_KEY = "interviewai_practiced";
const LAST_SESSION_KEY = "interviewai_last_session";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_MAX_TOKENS = 1000;

const shellStyle: CSSProperties = {
  ["--color-background-primary" as string]: "var(--background)",
  ["--color-card" as string]: "var(--surface)",
  ["--color-card-elevated" as string]: "var(--surface-elevated)",
  ["--color-card-muted" as string]: "var(--surface-muted)",
  ["--color-text-primary" as string]: "var(--foreground)",
  ["--color-text-muted" as string]: "var(--muted-foreground)",
  ["--color-line" as string]: "var(--border)",
  ["--color-line-strong" as string]: "var(--border-strong)",
  ["--color-accent-primary" as string]: "var(--accent)",
  ["--color-success-primary" as string]: "var(--success)",
  ["--color-warning-primary" as string]: "var(--warning)",
  ["--color-danger-primary" as string]: "var(--danger)",
  color: "var(--color-text-primary)",
};

export default function InterviewAI() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [data, setData] = useState<PrepData | null>(null);
  const [lastForm, setLastForm] = useState<FormValues>({
    company: "Razorpay",
    role: "SDE2",
    experience: "Mid (3-6yr)",
    rounds: ["DSA / Coding rounds", "System Design", "Behavioral / Non-technical"],
  });
  const [restoreSession, setRestoreSession] = useState<LastSession | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("frequency");
  const [error, setError] = useState("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [mockQuestions, setMockQuestions] = useState<Question[]>([]);
  const [mockReport, setMockReport] = useState<FinalReportData | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const stored = readLastSession();
    if (stored) {
      window.setTimeout(() => setRestoreSession(stored), 0);
    }
  }, []);

  useEffect(() => {
    if (appState !== "loading") {
      return;
    }
    const timer = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [appState]);

  const updateQuestion = useCallback((storageId: string, patch: Partial<Question>) => {
    setData((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        repeated: patchQuestions(current.repeated, storageId, patch),
        technical: patchQuestions(current.technical, storageId, patch),
        systemDesign: patchQuestions(current.systemDesign, storageId, patch),
        behavioral: patchQuestions(current.behavioral, storageId, patch),
      };
    });
    setMockQuestions((current) => patchQuestions(current, storageId, patch));
  }, []);

  const handleGenerate = useCallback(async (values: FormValues) => {
    setLastForm(values);
    setAppState("loading");
    setError("");
    setCopyMessage("");
    setLoadingMessageIndex(0);

    if (!COMPANIES.some((company) => company.toLowerCase() === values.company.toLowerCase())) {
      setError(
        `${values.company} is not in the built-in company list, but InterviewAI will still use general India-market knowledge.`,
      );
    }

    try {
      const raw = await callAnthropicText(buildMainPrompt(values), buildMainSystem(values), false);
      const parsed = parsePrepData(raw, values);
      const hydrated = hydrateQuestions(parsed, values);
      setData(hydrated);
      setActiveTab(0);
      setAppState("ready");
      const session: LastSession = {
        company: values.company,
        role: values.role,
        experience: values.experience,
        rounds: values.rounds,
        timestamp: Date.now(),
      };
      localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
      setRestoreSession(session);
    } catch (caught) {
      setAppState(data ? "ready" : "idle");
      setError(formatError(caught));
    }
  }, [data]);

  const handleRetry = useCallback(() => {
    void handleGenerate(lastForm);
  }, [handleGenerate, lastForm]);

  const handleStartMock = useCallback((seedQuestion?: Question) => {
    if (!data) {
      return;
    }
    const pool = buildMockPool(data, seedQuestion);
    setMockQuestions(pool);
    setMockReport(null);
    setAppState("mock");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [data]);

  const handleMockComplete = useCallback((report: FinalReportData) => {
    setMockReport(report);
    setAppState("mock_result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleExportBookmarks = useCallback(async () => {
    if (!data) {
      return;
    }
    const bookmarked = getAllQuestions(data).filter((question) => question.bookmarked);
    const text = bookmarked
      .map((question, index) => {
        const answer = question.answerText ? `\nAnswer:\n${question.answerText}` : "";
        return `${index + 1}. [${question.round}] ${question.q}\nDifficulty: ${question.difficulty}\nTopic: ${question.topic ?? "General"}${answer}`;
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text || "No bookmarked questions yet.");
      setCopyMessage(text ? "Bookmarks copied to clipboard." : "No bookmarked questions yet.");
    } catch {
      setCopyMessage("Clipboard access failed. Try again from a secure browser context.");
    }
  }, [data]);

  const allQuestions = data ? getAllQuestions(data) : [];
  const progress = getProgress(allQuestions);
  const loadingMessage = (LOADING_MESSAGES[loadingMessageIndex] ?? LOADING_MESSAGES[0] ?? "Generating prep...").replace(
    "{company}",
    lastForm.company || "the company",
  );

  return (
    <div style={shellStyle}>
      <style>{`
        @keyframes interviewaiPulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.92; } }
        @keyframes interviewaiSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .interviewai-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={styles.container}>
        <Header />

        {appState !== "mock" && appState !== "mock_result" ? (
          <InputForm
            onGenerate={handleGenerate}
            loading={appState === "loading"}
            restoreSession={restoreSession}
            initialValues={lastForm}
          />
        ) : null}

        {error ? (
          <ErrorCard message={error} onRetry={handleRetry} />
        ) : null}

        {appState === "loading" ? (
          <LoadingSkeleton message={loadingMessage} />
        ) : null}

        {data && appState === "ready" ? (
          <Dashboard
            data={data}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            difficultyFilter={difficultyFilter}
            setDifficultyFilter={setDifficultyFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            debouncedSearch={debouncedSearch}
            showBookmarkedOnly={showBookmarkedOnly}
            setShowBookmarkedOnly={setShowBookmarkedOnly}
            sortMode={sortMode}
            setSortMode={setSortMode}
            progress={progress}
            company={lastForm.company}
            role={lastForm.role}
            experience={lastForm.experience}
            onQuestionPatch={updateQuestion}
            onStartMock={handleStartMock}
            onExportBookmarks={handleExportBookmarks}
            copyMessage={copyMessage}
          />
        ) : null}

        {data && appState === "mock" ? (
          <MockInterview
            questions={mockQuestions}
            company={lastForm.company}
            role={lastForm.role}
            experience={lastForm.experience}
            onExit={() => setAppState("ready")}
            onComplete={handleMockComplete}
          />
        ) : null}

        {mockReport && appState === "mock_result" ? (
          <FinalReport
            report={mockReport}
            onBack={() => setAppState("ready")}
            onRestart={() => handleStartMock()}
          />
        ) : null}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.logoMark} aria-hidden="true">
        <i className="ti ti-brain" />
        <i className="ti ti-target" style={styles.logoTarget} />
      </div>
      <div>
        <h1 style={styles.title}>InterviewAI</h1>
        <p style={styles.subtitle}>India&apos;s smartest interview prep</p>
      </div>
    </header>
  );
}

function InputForm({
  onGenerate,
  loading,
  restoreSession,
  initialValues,
}: {
  onGenerate: (values: FormValues) => void;
  loading: boolean;
  restoreSession: LastSession | null;
  initialValues: FormValues;
}) {
  const isNarrow = useIsNarrow(480);
  const [company, setCompany] = useState(initialValues.company);
  const [role, setRole] = useState(initialValues.role);
  const [experience, setExperience] = useState(initialValues.experience);
  const [rounds, setRounds] = useState<string[]>(initialValues.rounds);
  const [companyFocused, setCompanyFocused] = useState(false);
  const [roleFocused, setRoleFocused] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const submit = useCallback(() => {
    if (!company.trim() || !role.trim() || rounds.length === 0 || loading) {
      return;
    }
    setShowForm(false);
    onGenerate({
      company: company.trim(),
      role: role.trim(),
      experience,
      rounds,
    });
  }, [company, role, experience, rounds, loading, onGenerate]);

  const restore = useCallback(() => {
    if (!restoreSession) {
      return;
    }
    setCompany(restoreSession.company);
    setRole(restoreSession.role);
    setExperience(restoreSession.experience ?? "Mid (3-6yr)");
    setRounds(restoreSession.rounds?.length ? restoreSession.rounds : ROUND_TYPES.slice(0, 4));
    setShowForm(true);
  }, [restoreSession]);

  const toggleRound = useCallback((round: string) => {
    setRounds((current) =>
      current.includes(round)
        ? current.filter((item) => item !== round)
        : [...current, round],
    );
  }, []);

  const formGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
    gap: 12,
  };

  return (
    <section style={styles.formCard}>
      <div style={styles.formHeader}>
        <div>
          <p style={styles.eyebrow}>Company-specific prep engine</p>
          <h2 style={styles.sectionTitle}>Generate your interview map</h2>
        </div>
        <button
          type="button"
          aria-label={showForm ? "Collapse input form" : "Expand input form"}
          onClick={() => setShowForm((current) => !current)}
          style={styles.iconButton}
        >
          <i className={`ti ${showForm ? "ti-chevron-up" : "ti-chevron-down"}`} />
        </button>
      </div>

      {restoreSession ? (
        <div style={styles.restoreBox}>
          <span>
            Restore last session: <strong>{restoreSession.company}</strong> for{" "}
            <strong>{restoreSession.role}</strong>
          </span>
          <button
            type="button"
            aria-label="Restore last InterviewAI session"
            onClick={restore}
            style={styles.ghostButton}
          >
            <i className="ti ti-refresh" /> Restore
          </button>
        </div>
      ) : null}

      {showForm ? (
        <div style={styles.formBody}>
          <div style={formGridStyle}>
            <AutocompleteInput
              label="Company"
              value={company}
              onChange={setCompany}
              options={COMPANIES}
              focused={companyFocused}
              setFocused={setCompanyFocused}
              icon="ti-building-skyscraper"
            />
            <AutocompleteInput
              label="Role"
              value={role}
              onChange={setRole}
              options={ROLES}
              focused={roleFocused}
              setFocused={setRoleFocused}
              icon="ti-briefcase"
            />
          </div>

          <div style={formGridStyle}>
            <label style={styles.fieldLabel}>
              Experience level
              <select
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                style={styles.select}
                aria-label="Select experience level"
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <div style={styles.ctaSlot}>
              <button
                type="button"
                aria-label="Generate full prep"
                onClick={submit}
                disabled={loading || !company.trim() || !role.trim() || rounds.length === 0}
                style={{
                  ...styles.generateButton,
                  opacity: loading || !company.trim() || !role.trim() || rounds.length === 0 ? 0.62 : 1,
                }}
              >
                <i className={`ti ${loading ? "ti-refresh" : "ti-sparkles"}`} />
                {loading ? "Generating prep..." : "Generate full prep"}
              </button>
            </div>
          </div>

          <div>
            <p style={styles.smallLabel}>Interview rounds to prep</p>
            <div style={styles.roundWrap}>
              {ROUND_TYPES.map((round) => {
                const selected = rounds.includes(round);
                return (
                  <button
                    key={round}
                    type="button"
                    aria-label={`Toggle ${round}`}
                    onClick={() => toggleRound(round)}
                    style={{
                      ...styles.roundChip,
                      borderColor: selected ? "var(--color-accent-primary)" : "var(--color-line)",
                      background: selected
                        ? "color-mix(in srgb, var(--color-accent-primary) 16%, var(--color-card))"
                        : "var(--color-card)",
                      color: selected ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    }}
                  >
                    <span style={selected ? styles.checkboxSelected : styles.checkboxEmpty}>
                      {selected ? <i className="ti ti-check" /> : null}
                    </span>
                    {round}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AutocompleteInput({
  label,
  value,
  onChange,
  options,
  focused,
  setFocused,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  focused: boolean;
  setFocused: (value: boolean) => void;
  icon: string;
}) {
  const suggestions = options
    .filter((option) => option.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 7);

  return (
    <label style={{ ...styles.fieldLabel, position: "relative" }}>
      {label}
      <span style={styles.inputShell}>
        <i className={`ti ${icon}`} style={styles.inputIcon} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 140)}
          style={styles.input}
          aria-label={label}
          autoComplete="off"
        />
      </span>
      {focused && suggestions.length > 0 ? (
        <div style={styles.suggestionMenu}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              aria-label={`Select ${suggestion}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(suggestion);
                setFocused(false);
              }}
              style={styles.suggestionItem}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

function LoadingSkeleton({ message }: { message: string }) {
  return (
    <section style={styles.loadingWrap} aria-live="polite">
      <div style={styles.loadingMessage}>
        <i className="ti ti-sparkles" />
        <span>{message}</span>
        <span style={styles.dots}>...</span>
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} style={styles.skeletonCard}>
          <div style={{ ...styles.skeletonLine, width: "42%" }} />
          <div style={{ ...styles.skeletonLine, width: "88%" }} />
          <div style={{ ...styles.skeletonLine, width: "74%" }} />
          <div style={styles.skeletonFooter}>
            <span style={{ ...styles.skeletonPill, width: 76 }} />
            <span style={{ ...styles.skeletonPill, width: 112 }} />
            <span style={{ ...styles.skeletonPill, width: 44 }} />
          </div>
        </div>
      ))}
    </section>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isWarning = message.includes("not in the built-in company list");
  return (
    <div
      role="alert"
      style={{
        ...styles.errorCard,
        borderColor: isWarning ? "var(--color-warning-primary)" : "var(--color-danger-primary)",
      }}
    >
      <i className={`ti ${isWarning ? "ti-alert-triangle" : "ti-x"}`} />
      <span>{message}</span>
      {!isWarning ? (
        <button type="button" aria-label="Retry generation" onClick={onRetry} style={styles.retryButton}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function Dashboard({
  data,
  activeTab,
  setActiveTab,
  difficultyFilter,
  setDifficultyFilter,
  searchQuery,
  setSearchQuery,
  debouncedSearch,
  showBookmarkedOnly,
  setShowBookmarkedOnly,
  sortMode,
  setSortMode,
  progress,
  company,
  role,
  experience,
  onQuestionPatch,
  onStartMock,
  onExportBookmarks,
  copyMessage,
}: {
  data: PrepData;
  activeTab: number;
  setActiveTab: (tab: number) => void;
  difficultyFilter: DifficultyFilter;
  setDifficultyFilter: (filter: DifficultyFilter) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  debouncedSearch: string;
  showBookmarkedOnly: boolean;
  setShowBookmarkedOnly: (value: boolean) => void;
  sortMode: SortMode;
  setSortMode: (value: SortMode) => void;
  progress: { practiced: number; total: number; readyScore: number };
  company: string;
  role: string;
  experience: string;
  onQuestionPatch: (storageId: string, patch: Partial<Question>) => void;
  onStartMock: (question?: Question) => void;
  onExportBookmarks: () => void;
  copyMessage: string;
}) {
  const tabCounts = TABS.map((tab) => {
    if (tab.key === "tips") {
      return data.tips.length;
    }
    return filterAndSortQuestions(
      data[tab.key],
      difficultyFilter,
      debouncedSearch,
      showBookmarkedOnly,
      sortMode,
    ).length;
  });
  const activeTabItem = TABS[activeTab] ?? TABS[0];
  const activeKey = activeTabItem.key;
  const activeQuestions =
    activeKey === "tips"
      ? []
      : filterAndSortQuestions(
          data[activeKey],
          difficultyFilter,
          debouncedSearch,
          showBookmarkedOnly,
          sortMode,
        );

  return (
    <section style={styles.dashboard}>
      <OverviewCard data={data} progress={progress} onStartMock={() => onStartMock()} />

      <div style={styles.filterPanel}>
        <div style={styles.searchShell}>
          <i className="ti ti-search" style={styles.inputIcon} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search questions, topics, rounds..."
            style={styles.input}
            aria-label="Search questions"
          />
        </div>
        <div style={styles.filterRows}>
          <SegmentedControl
            value={difficultyFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Easy", value: "easy" },
              { label: "Medium", value: "medium" },
              { label: "Hard", value: "hard" },
            ]}
            onChange={(value) => setDifficultyFilter(value as DifficultyFilter)}
          />
          <label style={styles.sortLabel}>
            <i className="ti ti-filter" />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              style={styles.sortSelect}
              aria-label="Sort questions"
            >
              <option value="frequency">Sort by frequency</option>
              <option value="difficulty">Sort by difficulty</option>
              <option value="topic">Sort by topic</option>
            </select>
          </label>
          <button
            type="button"
            aria-label="Show bookmarked questions only"
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            style={{
              ...styles.filterButton,
              background: showBookmarkedOnly
                ? "color-mix(in srgb, var(--color-warning-primary) 18%, var(--color-card))"
                : "var(--color-card)",
              color: showBookmarkedOnly ? "var(--color-text-primary)" : "var(--color-text-muted)",
            }}
          >
            <i className="ti ti-star" /> My bookmarks
          </button>
          <button
            type="button"
            aria-label="Export bookmarked questions"
            onClick={onExportBookmarks}
            style={styles.filterButton}
          >
            <i className="ti ti-copy" /> Export
          </button>
        </div>
        {copyMessage ? <p style={styles.copyMessage}>{copyMessage}</p> : null}
      </div>

      <div style={styles.tabBar} className="interviewai-no-scrollbar" role="tablist">
        {TABS.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === index}
            aria-label={`Open ${tab.label} tab`}
            onClick={() => setActiveTab(index)}
            style={{
              ...styles.tabButton,
              color: activeTab === index ? "var(--color-text-primary)" : "var(--color-text-muted)",
              borderBottomColor:
                activeTab === index ? "var(--color-accent-primary)" : "transparent",
              fontWeight: activeTab === index ? 800 : 650,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
            <span style={styles.tabBadge}>{tabCounts[index]}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" style={styles.panel}>
        {activeKey === "tips" ? (
          <TipsPanel data={data} />
        ) : activeQuestions.length > 0 ? (
          activeQuestions.map((question, index) => (
            <QuestionCard
              key={question.storageId ?? question.id}
              question={question}
              index={index}
              company={company}
              role={role}
              experience={experience}
              onQuestionPatch={onQuestionPatch}
              onPractice={() => onStartMock(question)}
            />
          ))
        ) : (
          <EmptyState type={activeTabItem.label} />
        )}
      </div>
    </section>
  );
}

function OverviewCard({
  data,
  progress,
  onStartMock,
}: {
  data: PrepData;
  progress: { practiced: number; total: number; readyScore: number };
  onStartMock: () => void;
}) {
  return (
    <section style={styles.overviewCard}>
      <div style={styles.overviewTop}>
        <div>
          <p style={styles.eyebrow}>Prep package ready</p>
          <h2 style={styles.overviewTitle}>
            {data.overview.company} {data.overview.role}
          </h2>
          <p style={styles.overviewSummary}>{data.overview.summary}</p>
        </div>
        <button
          type="button"
          aria-label="Start mock interview"
          onClick={onStartMock}
          style={styles.mockButton}
        >
          <i className="ti ti-target" /> Start mock interview
        </button>
      </div>

      <div style={styles.statsGrid}>
        <StatCard icon="ti-clock" label="Process" value={data.overview.processDuration} />
        <StatCard icon="ti-chart-bar" label="Difficulty" value={data.overview.difficulty} />
        <StatCard icon="ti-briefcase" label="Rounds" value={`${data.overview.totalRounds}`} />
        <StatCard icon="ti-trophy" label="CTC range" value={data.overview.ctcRange} />
      </div>

      <div style={styles.progressShell}>
        <div style={styles.progressTextRow}>
          <span>{progress.practiced}/{progress.total} questions practiced</span>
          <strong>Ready score: {progress.readyScore}%</strong>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress.readyScore}%` }} />
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <i className={`ti ${icon}`} style={styles.statIcon} />
      <span style={styles.statLabel}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div style={styles.segmented}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={`Filter ${option.label}`}
          onClick={() => onChange(option.value)}
          style={{
            ...styles.segmentButton,
            background:
              value === option.value
                ? "var(--color-text-primary)"
                : "transparent",
            color:
              value === option.value
                ? "var(--color-background-primary)"
                : "var(--color-text-muted)",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  company,
  role,
  experience,
  onQuestionPatch,
  onPractice,
}: {
  question: Question;
  index: number;
  company: string;
  role: string;
  experience: string;
  onQuestionPatch: (storageId: string, patch: Partial<Question>) => void;
  onPractice: () => void;
}) {
  const storageId = question.storageId ?? question.id;
  const difficultyStyle = getDifficultyStyle(question.difficulty);
  const frequencyStyle = getFrequencyStyle(question.frequency ?? 0);

  const toggleBookmark = useCallback(() => {
    const next = !question.bookmarked;
    updateStoredSet(BOOKMARK_KEY, storageId, next);
    onQuestionPatch(storageId, { bookmarked: next });
  }, [question.bookmarked, storageId, onQuestionPatch]);

  const togglePracticed = useCallback(() => {
    const next = !question.practiced;
    updateStoredSet(PRACTICED_KEY, storageId, next);
    onQuestionPatch(storageId, { practiced: next });
  }, [question.practiced, storageId, onQuestionPatch]);

  const toggleAnswer = useCallback(async () => {
    const nextVisible = !question.answerVisible;
    onQuestionPatch(storageId, { answerVisible: nextVisible, answerError: "" });
    if (!nextVisible || question.answerText || question.answerLoading) {
      return;
    }
    onQuestionPatch(storageId, { answerLoading: true, answerText: "" });
    try {
      await streamModelAnswer({
        company,
        role,
        experience,
        question,
        onToken: (text) => {
          onQuestionPatch(storageId, { answerText: text, answerLoading: true });
        },
      });
      onQuestionPatch(storageId, { answerLoading: false });
    } catch (caught) {
      onQuestionPatch(storageId, {
        answerLoading: false,
        answerError: formatError(caught),
      });
    }
  }, [question, storageId, company, role, experience, onQuestionPatch]);

  return (
    <article
      style={{
        ...styles.questionCard,
        borderLeftColor: question.practiced
          ? "var(--color-success-primary)"
          : "var(--color-line)",
        background: question.practiced
          ? "color-mix(in srgb, var(--color-success-primary) 7%, var(--color-card))"
          : "var(--color-card)",
      }}
    >
      <div style={styles.cardTopRow}>
        <span style={styles.questionNumber}>Q{index + 1}</span>
        {question.frequencyLabel ? (
          <span style={{ ...styles.frequencyBadge, ...frequencyStyle }}>
            <i className="ti ti-flame" /> {question.frequencyLabel}
          </span>
        ) : null}
        <span style={styles.roundBadge}>{formatRound(question.round)}</span>
      </div>

      <p style={styles.questionText}>{question.q}</p>

      <div style={styles.cardMetaRow}>
        <span style={styles.topicTag}>{question.topic ?? question.category ?? "Interview"}</span>
        <span style={{ ...styles.difficultyPill, ...difficultyStyle }}>
          {question.difficulty}
        </span>
        {question.timeComplexityHint ? (
          <span style={styles.complexityHint}>{question.timeComplexityHint}</span>
        ) : null}
        <button
          type="button"
          aria-label={question.bookmarked ? "Remove bookmark" : "Bookmark question"}
          onClick={toggleBookmark}
          style={{
            ...styles.starButton,
            color: question.bookmarked ? "var(--color-warning-primary)" : "var(--color-text-muted)",
          }}
        >
          <i className="ti ti-star" />
        </button>
      </div>

      <div style={styles.cardActions}>
        <button
          type="button"
          aria-label="Reveal model answer"
          onClick={toggleAnswer}
          style={styles.answerToggle}
        >
          <i className={`ti ${question.answerVisible ? "ti-chevron-up" : "ti-chevron-down"}`} />
          {question.answerVisible ? "Hide model answer" : "See model answer"}
        </button>
        <button
          type="button"
          aria-label="Practice this question"
          onClick={onPractice}
          style={styles.practiceButton}
        >
          Practice this <span aria-hidden="true">-&gt;</span>
        </button>
      </div>

      {question.answerVisible ? (
        <div style={styles.answerBox}>
          {question.answerLoading && !question.answerText ? (
            <div style={styles.answerLoading}>
              <span style={{ ...styles.skeletonLine, width: "86%" }} />
              <span style={{ ...styles.skeletonLine, width: "71%" }} />
              <span style={{ ...styles.skeletonLine, width: "92%" }} />
            </div>
          ) : null}
          {question.answerText ? (
            <div style={styles.answerText}>{question.answerText}</div>
          ) : null}
          {question.answerLoading ? <p style={styles.streamingNote}>Streaming answer...</p> : null}
          {question.answerError ? (
            <p role="alert" style={styles.answerError}>
              {question.answerError}
            </p>
          ) : null}
        </div>
      ) : null}

      <label style={styles.practicedLabel}>
        <input
          type="checkbox"
          checked={question.practiced}
          onChange={togglePracticed}
          style={styles.checkboxInput}
          aria-label="Mark practiced"
        />
        I&apos;ve practiced this
      </label>
    </article>
  );
}

function TipsPanel({ data }: { data: PrepData }) {
  const processTips = data.tips.filter((tip) => tip.type === "process");
  const cultureTips = data.tips.filter((tip) => tip.type === "culture");
  const warningTips = data.tips.filter((tip) => tip.type === "warning");
  const salaryTips = data.tips.filter((tip) => tip.type === "salary");
  const otherTips = data.tips.filter(
    (tip) => !["process", "culture", "warning", "salary"].includes(tip.type),
  );

  return (
    <div style={styles.tipsGrid}>
      <TipBlock
        icon="ti-info-circle"
        title="Process overview"
        items={processTips.length ? processTips : [{ type: "process", text: data.overview.summary }]}
      />
      <TipBlock
        icon="ti-users"
        title="Culture signals"
        items={cultureTips.length ? cultureTips : otherTips.slice(0, 2)}
      />
      <TipBlock
        icon="ti-alert-triangle"
        title="What NOT to do"
        items={warningTips}
        danger
      />
      <TipBlock
        icon="ti-trophy"
        title="Salary range"
        items={
          salaryTips.length
            ? salaryTips
            : [{ type: "salary", text: `Expected India 2026 CTC: ${data.overview.ctcRange}` }]
        }
      />
    </div>
  );
}

function TipBlock({
  icon,
  title,
  items,
  danger,
}: {
  icon: string;
  title: string;
  items: Tip[];
  danger?: boolean;
}) {
  return (
    <section
      style={{
        ...styles.tipBlock,
        borderColor: danger ? "var(--color-danger-primary)" : "var(--color-line)",
      }}
    >
      <h3 style={styles.tipTitle}>
        <i className={`ti ${icon}`} /> {title}
      </h3>
      {items.length ? (
        <ul style={styles.tipList}>
          {items.map((tip, index) => (
            <li key={`${tip.type}-${index}`} style={styles.tipItem}>
              {tip.text}
            </li>
          ))}
        </ul>
      ) : (
        <p style={styles.emptyText}>No specific tips for this section.</p>
      )}
    </section>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div style={styles.emptyState}>
      <i className="ti ti-search" />
      <p>No {type} questions for this selection.</p>
    </div>
  );
}

function MockInterview({
  questions,
  company,
  role,
  experience,
  onExit,
  onComplete,
}: {
  questions: Question[];
  company: string;
  role: string;
  experience: string;
  onExit: () => void;
  onComplete: (report: FinalReportData) => void;
}) {
  const [roundFilter, setRoundFilter] = useState("All rounds");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<MockEvaluation | null>(null);
  const [results, setResults] = useState<MockResult[]>([]);
  const [error, setError] = useState("");
  const [animatedScore, setAnimatedScore] = useState(0);

  const rounds = ["All rounds", ...Array.from(new Set(questions.map((question) => formatRound(question.round))))];
  const activeQuestions =
    roundFilter === "All rounds"
      ? questions
      : questions.filter((question) => formatRound(question.round) === roundFilter);
  const currentQuestion = activeQuestions[currentIndex] ?? activeQuestions[0];
  const progress = activeQuestions.length
    ? Math.round(((currentIndex + (evaluation ? 1 : 0)) / activeQuestions.length) * 100)
    : 0;

  useEffect(() => {
    if (!evaluation) {
      return;
    }
    let frame = 0;
    const target = Math.max(0, Math.min(10, Number(evaluation.score) || 0));
    const timer = window.setInterval(() => {
      frame += 1;
      setAnimatedScore(Math.min(target, Math.round((target * frame) / 12)));
      if (frame >= 12) {
        window.clearInterval(timer);
      }
    }, 26);
    return () => window.clearInterval(timer);
  }, [evaluation]);

  const submitAnswer = useCallback(async () => {
    if (!currentQuestion || !answer.trim() || evaluating) {
      return;
    }
    setEvaluating(true);
    setError("");
    try {
      const raw = await callAnthropicText(
        buildEvaluationPrompt(company, role, currentQuestion.q, answer),
        `You are a strict but fair interview evaluator at ${company} hiring for ${role}.`,
        false,
      );
      const parsed = parseEvaluation(raw);
      setEvaluation(parsed);
      setResults((existing) => [
        ...existing,
        { ...parsed, question: currentQuestion, answer },
      ]);
    } catch (caught) {
      setError(formatError(caught));
    } finally {
      setEvaluating(false);
    }
  }, [company, role, currentQuestion, answer, evaluating]);

  const nextQuestion = useCallback(() => {
    if (currentIndex >= activeQuestions.length - 1) {
      onComplete(buildFinalReport(results));
      return;
    }
    setCurrentIndex((current) => current + 1);
    setAnswer("");
    setEvaluation(null);
    setError("");
    setAnimatedScore(0);
  }, [currentIndex, activeQuestions.length, results, onComplete]);

  if (!currentQuestion) {
    return (
      <section style={styles.mockShell}>
        <EmptyState type="mock interview" />
        <button type="button" aria-label="Back to dashboard" onClick={onExit} style={styles.ghostButton}>
          Back to dashboard
        </button>
      </section>
    );
  }

  return (
    <section style={styles.mockShell}>
      <div style={styles.mockHeader}>
        <div>
          <p style={styles.eyebrow}>Mock interview mode</p>
          <h2 style={styles.sectionTitle}>{company} {role}</h2>
          <p style={styles.overviewSummary}>{experience}</p>
        </div>
        <button type="button" aria-label="Exit mock interview" onClick={onExit} style={styles.iconButton}>
          <i className="ti ti-x" />
        </button>
      </div>

      <div style={styles.roundSelectorRow}>
        {rounds.map((round) => (
          <button
            key={round}
            type="button"
            aria-label={`Mock ${round}`}
            onClick={() => {
              setRoundFilter(round);
              setCurrentIndex(0);
              setAnswer("");
              setEvaluation(null);
              setResults([]);
              setError("");
              setAnimatedScore(0);
            }}
            style={{
              ...styles.roundChip,
              borderColor: roundFilter === round ? "var(--color-accent-primary)" : "var(--color-line)",
              minHeight: 44,
            }}
          >
            {round}
          </button>
        ))}
      </div>

      <div style={styles.mockProgressText}>
        Question {Math.min(currentIndex + 1, activeQuestions.length)} of {activeQuestions.length}
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      <article style={styles.mockQuestionCard}>
        <p style={styles.mockQuestionText}>{currentQuestion.q}</p>
        <div style={styles.cardMetaRow}>
          <span style={styles.roundBadge}>{formatRound(currentQuestion.round)}</span>
          <span style={{ ...styles.difficultyPill, ...getDifficultyStyle(currentQuestion.difficulty) }}>
            {currentQuestion.difficulty}
          </span>
        </div>
      </article>

      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Type your answer as if you are speaking to the interviewer..."
        style={styles.answerTextarea}
        aria-label="Candidate answer"
      />

      {error ? <ErrorCard message={error} onRetry={submitAnswer} /> : null}

      <button
        type="button"
        aria-label="Submit answer for evaluation"
        onClick={submitAnswer}
        disabled={evaluating || !answer.trim() || Boolean(evaluation)}
        style={{
          ...styles.generateButton,
          opacity: evaluating || !answer.trim() || evaluation ? 0.62 : 1,
        }}
      >
        <i className={`ti ${evaluating ? "ti-refresh" : "ti-check"}`} />
        {evaluating ? "Evaluating answer..." : "Submit answer"}
      </button>

      {evaluation ? (
        <section style={styles.evaluationCard}>
          <div style={styles.scoreRow}>
            <div style={styles.scoreDonut}>
              <strong>{animatedScore}</strong>
              <span>/10</span>
            </div>
            <div>
              <h3 style={styles.evaluationTitle}>{evaluation.scoreLabel}</h3>
              <p style={styles.overviewSummary}>{evaluation.nextTip}</p>
            </div>
          </div>
          <EvaluationList title="What was good" items={evaluation.goodPoints} tone="good" />
          <EvaluationList title="What was missing" items={evaluation.missingPoints} tone="missing" />
          <div style={styles.answerBox}>
            <strong>Model answer comparison</strong>
            <p style={styles.answerText}>{evaluation.modelAnswer}</p>
          </div>
          <button type="button" aria-label="Next question" onClick={nextQuestion} style={styles.mockButton}>
            {currentIndex >= activeQuestions.length - 1 ? "Finish report" : "Next question ->"}
          </button>
        </section>
      ) : null}
    </section>
  );
}

function EvaluationList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "missing";
}) {
  return (
    <div
      style={{
        ...styles.evaluationList,
        background:
          tone === "good"
            ? "color-mix(in srgb, var(--color-success-primary) 10%, var(--color-card))"
            : "color-mix(in srgb, var(--color-warning-primary) 10%, var(--color-card))",
      }}
    >
      <strong>{title}</strong>
      <ul style={styles.tipList}>
        {items.map((item, index) => (
          <li key={`${title}-${index}`} style={styles.tipItem}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FinalReport({
  report,
  onBack,
  onRestart,
}: {
  report: FinalReportData;
  onBack: () => void;
  onRestart: () => void;
}) {
  return (
    <section style={styles.mockShell}>
      <div style={styles.finalHero}>
        <i className="ti ti-trophy" style={styles.finalIcon} />
        <p style={styles.eyebrow}>Mock interview complete</p>
        <h2 style={styles.finalScore}>{report.overallScore}/10</h2>
        <p style={styles.overviewSummary}>Overall score across {report.results.length} answers</p>
      </div>

      <div style={styles.statsGrid}>
        <StatCard icon="ti-check" label="Strongest area" value={report.strongestArea} />
        <StatCard icon="ti-alert-triangle" label="Weakest area" value={report.weakestArea} />
      </div>

      <section style={styles.tipBlock}>
        <h3 style={styles.tipTitle}>
          <i className="ti ti-bulb" /> Top 3 things to improve
        </h3>
        <ul style={styles.tipList}>
          {report.improvements.map((item, index) => (
            <li key={index} style={styles.tipItem}>{item}</li>
          ))}
        </ul>
      </section>

      <div style={styles.reportList}>
        {report.results.map((result, index) => (
          <article key={`${result.question.id}-${index}`} style={styles.questionCard}>
            <div style={styles.cardTopRow}>
              <span style={styles.questionNumber}>Q{index + 1}</span>
              <span style={styles.roundBadge}>{formatRound(result.question.round)}</span>
              <span style={styles.scorePill}>{result.score}/10</span>
            </div>
            <p style={styles.questionText}>{result.question.q}</p>
            <p style={styles.overviewSummary}>{result.nextTip}</p>
          </article>
        ))}
      </div>

      <div style={styles.finalActions}>
        <button type="button" aria-label="Back to dashboard" onClick={onBack} style={styles.ghostButton}>
          Back to dashboard
        </button>
        <button type="button" aria-label="Restart mock interview" onClick={onRestart} style={styles.mockButton}>
          <i className="ti ti-refresh" /> Restart mock
        </button>
      </div>
    </section>
  );
}

function useIsNarrow(width: number) {
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const update = () => setIsNarrow(window.innerWidth <= width);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width]);
  return isNarrow;
}

async function callAnthropicText(prompt: string, system: string, stream: boolean) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  const platformKey = getPlatformAnthropicKey();
  if (platformKey) {
    headers["x-api-key"] = platformKey;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system,
      stream,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API failed with ${response.status}.`);
  }

  if (stream) {
    return readAnthropicStream(response, () => undefined);
  }

  const json = await response.json();
  const content = Array.isArray(json.content) ? json.content : [];
  return content
    .map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text ?? "" : ""))
    .join("");
}

async function streamModelAnswer({
  company,
  role,
  experience,
  question,
  onToken,
}: {
  company: string;
  role: string;
  experience: string;
  question: Question;
  onToken: (text: string) => void;
}) {
  const prompt = buildModelAnswerPrompt(company, role, experience, question);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  const platformKey = getPlatformAnthropicKey();
  if (platformKey) {
    headers["x-api-key"] = platformKey;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: "You are an expert India interview coach. Be concise, practical, and specific.",
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Model answer failed with ${response.status}.`);
  }

  return readAnthropicStream(response, onToken);
}

async function readAnthropicStream(response: Response, onToken: (text: string) => void) {
  if (!response.body) {
    const json = await response.json();
    const fallback = Array.isArray(json.content)
      ? json.content.map((part: { text?: string }) => part.text ?? "").join("")
      : "";
    onToken(fallback);
    return fallback;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }
      try {
        const event = JSON.parse(payload);
        const text = event?.delta?.text ?? "";
        if (text) {
          fullText += text;
          onToken(fullText);
        }
      } catch {
        continue;
      }
    }
  }

  return fullText;
}

function buildMainSystem(values: FormValues) {
  return `You are an expert India tech interview coach with deep insider knowledge of how ${values.company} interviews for ${values.role}. You know the exact questions they ask, their difficulty, frequency, and what interviewers are really looking for.`;
}

function buildMainPrompt(values: FormValues) {
  return `You are an expert India tech interview coach who has helped 10,000+ engineers get offers at top India tech companies. You have deep insider knowledge of exactly what questions ${values.company} asks for ${values.role} at ${values.experience} level.

Generate a comprehensive interview prep package for selected rounds: ${values.rounds.join(", ")}. Return ONLY valid JSON matching this structure exactly - no markdown, no explanation:

{
  "overview": {
    "company": "",
    "role": "",
    "totalRounds": 4,
    "processDuration": "3-4 weeks",
    "difficulty": "High",
    "ctcRange": "₹28L - ₹45L",
    "summary": "2-3 sentence overview of interview process"
  },
  "repeated": [
    {
      "id": "r1",
      "q": "question text",
      "round": "DSA|SystemDesign|HR|Behavioral",
      "difficulty": "Easy|Medium|Hard",
      "frequency": 85,
      "frequencyLabel": "Asked in 85% of interviews",
      "topic": "topic tag",
      "bookmarked": false,
      "practiced": false
    }
  ],
  "technical": [
    {
      "id": "t1",
      "q": "question text",
      "round": "DSA|Technical",
      "difficulty": "Easy|Medium|Hard",
      "frequency": 60,
      "frequencyLabel": "Asked in 60% of interviews",
      "topic": "Arrays|DP|Trees|Graphs|OS|DBMS|Networks|Concurrency",
      "timeComplexityHint": "Expected O(n log n)",
      "category": "LeetCode-style category",
      "bookmarked": false,
      "practiced": false
    }
  ],
  "systemDesign": [
    {
      "id": "s1",
      "q": "question text",
      "round": "SystemDesign",
      "difficulty": "Easy|Medium|Hard",
      "frequency": 55,
      "frequencyLabel": "Asked in 55% of interviews",
      "topic": "domain topic",
      "category": "Scale hint and framework tip",
      "bookmarked": false,
      "practiced": false
    }
  ],
  "behavioral": [
    {
      "id": "b1",
      "q": "question text",
      "round": "Behavioral|HR|Manager",
      "difficulty": "Easy|Medium|Hard",
      "frequency": 50,
      "frequencyLabel": "Asked in 50% of interviews",
      "topic": "STAR|Culture|Ownership|Conflict|Salary",
      "category": "What interviewer assesses and red flags",
      "bookmarked": false,
      "practiced": false
    }
  ],
  "tips": [
    {
      "type": "process|culture|warning|salary",
      "text": "tip text"
    }
  ]
}

Requirements:
- technical: exactly 12 questions, realistic for ${values.company} + ${values.role}
- systemDesign: 6 questions relevant to ${values.company}'s actual product domain (Razorpay=payments, Swiggy=logistics, CRED=fintech, Zepto=dark stores)
- behavioral: 8 questions reflecting ${values.company}'s actual culture, including Behavioral and HR
- repeated: 6 questions actually known to repeat at ${values.company}
- tips: 7 specific tips with process, culture, warning, and salary entries
- frequency values must be realistic and varied, not all 90%
- ctcRange must be accurate India 2026 market rate
- All questions appropriate for ${values.experience} experience level
- Keep text compact enough to fit within the token budget while remaining specific.`;
}

function buildModelAnswerPrompt(company: string, role: string, experience: string, question: Question) {
  return `You are an expert interview coach. Give a high-quality model answer for this interview question.

Company: ${company}
Role: ${role}
Experience: ${experience}
Question type: ${formatRound(question.round)}
Question: ${question.q}

For DSA questions: give approach, key insight, pseudocode, time+space complexity.
For System Design: give component breakdown, key design decisions, trade-offs, scale numbers.
For Behavioral: give a complete STAR-format answer (150-200 words), specific and non-generic.
For HR: give a genuine, company-culture-aware answer (100-150 words).

Be specific to ${company}'s context. Do not be generic.`;
}

function buildEvaluationPrompt(company: string, role: string, question: string, answer: string) {
  return `You are a strict but fair interview evaluator at ${company} hiring for ${role}.

Question: ${question}
Candidate's answer: ${answer}

Evaluate this answer. Return ONLY valid JSON:
{
  "score": 7,
  "scoreLabel": "Good - would likely proceed",
  "goodPoints": ["point 1", "point 2", "point 3"],
  "missingPoints": ["what was missing 1", "what was missing 2"],
  "modelAnswer": "What an ideal answer would include...",
  "nextTip": "One specific thing to do better next time"
}

Score guide: 1-3=poor, 4-5=average, 6-7=good, 8-9=excellent, 10=perfect`;
}

function parsePrepData(raw: string, values: FormValues): PrepData {
  try {
    const parsed = JSON.parse(stripJsonFences(raw));
    return normalizePrepData(parsed, values);
  } catch {
    const salvaged = salvagePartialPrep(stripJsonFences(raw), values);
    if (getAllQuestions(salvaged).length > 0 || salvaged.tips.length > 0) {
      return salvaged;
    }
    throw new Error("Claude returned incomplete JSON. Please retry generation.");
  }
}

function parseEvaluation(raw: string): MockEvaluation {
  const parsed = JSON.parse(stripJsonFences(raw).replace(/'/g, "\""));
  return {
    score: clampScore(parsed.score),
    scoreLabel: String(parsed.scoreLabel ?? "Needs review"),
    goodPoints: toStringArray(parsed.goodPoints).slice(0, 4),
    missingPoints: toStringArray(parsed.missingPoints).slice(0, 4),
    modelAnswer: String(parsed.modelAnswer ?? ""),
    nextTip: String(parsed.nextTip ?? "Be more specific and structured next time."),
  };
}

function normalizePrepData(parsed: unknown, values: FormValues): PrepData {
  const source = parsed as Partial<PrepData>;
  return {
    overview: {
      company: source.overview?.company || values.company,
      role: source.overview?.role || values.role,
      totalRounds: Number(source.overview?.totalRounds ?? 4),
      processDuration: source.overview?.processDuration || "3-4 weeks",
      difficulty: source.overview?.difficulty || "High",
      ctcRange: source.overview?.ctcRange || "India 2026 market range varies by level",
      summary: source.overview?.summary || "Interview process generated from India-market company and role signals.",
    },
    repeated: normalizeQuestions(source.repeated, "r", values),
    technical: normalizeQuestions(source.technical, "t", values),
    systemDesign: normalizeQuestions(source.systemDesign, "s", values),
    behavioral: normalizeQuestions(source.behavioral, "b", values),
    tips: Array.isArray(source.tips)
      ? source.tips.map((tip) => ({
          type: String(tip.type ?? "process"),
          text: String(tip.text ?? ""),
        })).filter((tip) => tip.text)
      : [],
  };
}

function normalizeQuestions(items: unknown, prefix: string, values: FormValues): Question[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item, index) => {
      const source = item as Partial<Question>;
      const id = source.id ? String(source.id) : `${prefix}${index + 1}`;
      const frequency = Number(source.frequency ?? 45 + ((index * 7) % 42));
      const question: Question = {
        id,
        storageId: buildStorageId(values, id),
        q: String(source.q ?? ""),
        round: String(source.round ?? inferRound(prefix)),
        difficulty: normalizeDifficulty(source.difficulty),
        frequency,
        frequencyLabel: source.frequencyLabel
          ? String(source.frequencyLabel)
          : `Asked in ${frequency}% of interviews`,
        topic: source.topic ? String(source.topic) : inferRound(prefix),
        bookmarked: Boolean(source.bookmarked),
        practiced: Boolean(source.practiced),
        answerVisible: false,
        answerLoading: false,
        answerText: "",
      };
      if (source.category) {
        question.category = String(source.category);
      }
      if (source.timeComplexityHint) {
        question.timeComplexityHint = String(source.timeComplexityHint);
      }
      return question;
    })
    .filter((question) => question.q.trim().length > 0);
}

function salvagePartialPrep(raw: string, values: FormValues): PrepData {
  const base = normalizePrepData({}, values);
  const overviewRaw = extractJsonMember(raw, "overview");
  const tipsRaw = extractJsonMember(raw, "tips");
  const repeatedRaw = extractJsonMember(raw, "repeated");
  const technicalRaw = extractJsonMember(raw, "technical");
  const systemRaw = extractJsonMember(raw, "systemDesign");
  const behavioralRaw = extractJsonMember(raw, "behavioral");

  return {
    overview: overviewRaw ? normalizePrepData({ overview: safeJson(overviewRaw) }, values).overview : base.overview,
    repeated: normalizeQuestions(safeJson(repeatedRaw), "r", values),
    technical: normalizeQuestions(safeJson(technicalRaw), "t", values),
    systemDesign: normalizeQuestions(safeJson(systemRaw), "s", values),
    behavioral: normalizeQuestions(safeJson(behavioralRaw), "b", values),
    tips: Array.isArray(safeJson(tipsRaw))
      ? (safeJson(tipsRaw) as Tip[]).map((tip) => ({
          type: String(tip.type ?? "process"),
          text: String(tip.text ?? ""),
        })).filter((tip) => tip.text)
      : [],
  };
}

function extractJsonMember(raw: string, key: string) {
  const keyIndex = raw.indexOf(`"${key}"`);
  if (keyIndex < 0) {
    return "";
  }
  const colon = raw.indexOf(":", keyIndex);
  if (colon < 0) {
    return "";
  }
  const start = raw.slice(colon + 1).search(/[\[{]/);
  if (start < 0) {
    return "";
  }
  const absoluteStart = colon + 1 + start;
  const open = raw[absoluteStart];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = absoluteStart; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === open) {
      depth += 1;
    }
    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(absoluteStart, index + 1);
      }
    }
  }
  return raw.slice(absoluteStart);
}

function safeJson(raw?: string) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hydrateQuestions(parsed: PrepData, values: FormValues): PrepData {
  const bookmarks = readStoredSet(BOOKMARK_KEY);
  const practiced = readStoredSet(PRACTICED_KEY);
  const hydrate = (questions: Question[]) =>
    questions.map((question) => {
      const storageId = question.storageId ?? buildStorageId(values, question.id);
      return {
        ...question,
        storageId,
        bookmarked: bookmarks.has(storageId),
        practiced: practiced.has(storageId),
      };
    });

  return {
    ...parsed,
    repeated: hydrate(parsed.repeated),
    technical: hydrate(parsed.technical),
    systemDesign: hydrate(parsed.systemDesign),
    behavioral: hydrate(parsed.behavioral),
  };
}

function filterAndSortQuestions(
  questions: Question[],
  difficultyFilter: DifficultyFilter,
  search: string,
  showBookmarkedOnly: boolean,
  sortMode: SortMode,
) {
  const normalizedSearch = search.trim().toLowerCase();
  return [...questions]
    .filter((question) => {
      const difficultyMatch =
        difficultyFilter === "all" || question.difficulty.toLowerCase() === difficultyFilter;
      const bookmarkMatch = !showBookmarkedOnly || question.bookmarked;
      const searchMatch =
        !normalizedSearch ||
        [question.q, question.topic, question.round, question.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      return difficultyMatch && bookmarkMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortMode === "difficulty") {
        return difficultyRank(b.difficulty) - difficultyRank(a.difficulty);
      }
      if (sortMode === "topic") {
        return String(a.topic ?? "").localeCompare(String(b.topic ?? ""));
      }
      return Number(b.frequency ?? 0) - Number(a.frequency ?? 0);
    });
}

function buildMockPool(data: PrepData, seedQuestion?: Question) {
  const pool = [
    ...data.repeated.slice(0, 4),
    ...data.technical.slice(0, 4),
    ...data.systemDesign.slice(0, 3),
    ...data.behavioral.slice(0, 4),
  ];
  const unique = uniqueQuestions(pool);
  if (!seedQuestion) {
    return unique.slice(0, 8);
  }
  return uniqueQuestions([seedQuestion, ...unique]).slice(0, 8);
}

function buildFinalReport(results: MockResult[]): FinalReportData {
  const scores = results.map((result) => clampScore(result.score));
  const overallScore = scores.length
    ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
    : 0;
  const best = [...results].sort((a, b) => b.score - a.score)[0];
  const weakest = [...results].sort((a, b) => a.score - b.score)[0];
  const missing = results.flatMap((result) => result.missingPoints).filter(Boolean);
  return {
    results,
    overallScore,
    strongestArea: best ? best.question.topic ?? formatRound(best.question.round) : "Clarity",
    weakestArea: weakest ? weakest.question.topic ?? formatRound(weakest.question.round) : "Depth",
    improvements: [
      missing[0] ?? "Use a tighter structure before adding details.",
      missing[1] ?? "Add concrete numbers, trade-offs, and examples.",
      missing[2] ?? "Close answers with impact and interviewer-facing clarity.",
    ],
  };
}

function uniqueQuestions(questions: Question[]) {
  const seen = new Set<string>();
  return questions.filter((question) => {
    const key = question.storageId ?? question.id;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getAllQuestions(data: PrepData) {
  return uniqueQuestions([
    ...data.repeated,
    ...data.technical,
    ...data.systemDesign,
    ...data.behavioral,
  ]);
}

function patchQuestions(questions: Question[], storageId: string, patch: Partial<Question>) {
  return questions.map((question) =>
    (question.storageId ?? question.id) === storageId ? { ...question, ...patch } : question,
  );
}

function getProgress(questions: Question[]) {
  const total = questions.length;
  const practiced = questions.filter((question) => question.practiced).length;
  return {
    total,
    practiced,
    readyScore: total ? Math.round((practiced / total) * 100) : 0,
  };
}

function buildStorageId(values: FormValues, id: string) {
  return `${slugify(values.company)}:${slugify(values.role)}:${slugify(values.experience)}:${id}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function readStoredSet(key: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function updateStoredSet(key: string, id: string, enabled: boolean) {
  const set = readStoredSet(key);
  if (enabled) {
    set.add(id);
  } else {
    set.delete(id);
  }
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

function readLastSession() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_SESSION_KEY) ?? "null");
    if (parsed?.company && parsed?.role && parsed?.timestamp) {
      return parsed as LastSession;
    }
    return null;
  } catch {
    return null;
  }
}

function stripJsonFences(raw: string) {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const first = withoutFence.indexOf("{");
  const last = withoutFence.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return withoutFence.slice(first, last + 1);
  }
  return withoutFence;
}

function normalizeDifficulty(value: unknown): Difficulty {
  const normalized = String(value ?? "Medium").toLowerCase();
  if (normalized.includes("easy")) {
    return "Easy";
  }
  if (normalized.includes("hard")) {
    return "Hard";
  }
  return "Medium";
}

function inferRound(prefix: string) {
  if (prefix === "s") {
    return "SystemDesign";
  }
  if (prefix === "b") {
    return "Behavioral";
  }
  if (prefix === "t") {
    return "DSA";
  }
  return "Interview";
}

function difficultyRank(difficulty: Difficulty) {
  if (difficulty === "Hard") {
    return 3;
  }
  if (difficulty === "Medium") {
    return 2;
  }
  return 1;
}

function getDifficultyStyle(difficulty: Difficulty): CSSProperties {
  if (difficulty === "Easy") {
    return {
      background: "color-mix(in srgb, var(--color-success-primary) 18%, var(--color-card))",
      color: "var(--color-success-primary)",
    };
  }
  if (difficulty === "Hard") {
    return {
      background: "color-mix(in srgb, var(--color-danger-primary) 18%, var(--color-card))",
      color: "var(--color-danger-primary)",
    };
  }
  return {
    background: "color-mix(in srgb, var(--color-warning-primary) 18%, var(--color-card))",
    color: "var(--color-warning-primary)",
  };
}

function getFrequencyStyle(frequency: number): CSSProperties {
  if (frequency > 75) {
    return {
      background: "color-mix(in srgb, var(--color-danger-primary) 16%, var(--color-card))",
      color: "var(--color-danger-primary)",
    };
  }
  if (frequency >= 50) {
    return {
      background: "color-mix(in srgb, var(--color-warning-primary) 16%, var(--color-card))",
      color: "var(--color-warning-primary)",
    };
  }
  return {
    background: "var(--color-card-muted)",
    color: "var(--color-text-muted)",
  };
}

function formatRound(round: string) {
  return String(round)
    .replace("SystemDesign", "System Design")
    .replace("DSA", "DSA")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function clampScore(value: unknown) {
  const score = Number(value);
  if (Number.isNaN(score)) {
    return 0;
  }
  return Math.max(0, Math.min(10, score));
}

function formatError(caught: unknown) {
  if (caught instanceof Error) {
    return caught.message;
  }
  return "Something went wrong. Please retry.";
}

function getPlatformAnthropicKey() {
  if (typeof window === "undefined") {
    return "";
  }
  const candidate = window as Window & {
    __ANTHROPIC_API_KEY__?: string;
    ANTHROPIC_API_KEY?: string;
  };
  return candidate.__ANTHROPIC_API_KEY__ || candidate.ANTHROPIC_API_KEY || "";
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: "100%",
    maxWidth: 780,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 22,
  },
  logoMark: {
    width: 54,
    height: 54,
    minWidth: 54,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    position: "relative",
    background: "color-mix(in srgb, var(--color-accent-primary) 18%, var(--color-card))",
    color: "var(--color-accent-primary)",
    border: "0.5px solid var(--color-line-strong)",
    fontSize: 26,
  },
  logoTarget: {
    position: "absolute",
    right: 8,
    bottom: 7,
    fontSize: 15,
    color: "var(--color-warning-primary)",
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: 0,
  },
  subtitle: {
    margin: "5px 0 0",
    color: "var(--color-text-muted)",
    fontSize: 14,
    lineHeight: 1.45,
  },
  formCard: {
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    borderRadius: 12,
    padding: 16,
    boxShadow: "var(--shadow-card)",
    marginBottom: 14,
  },
  formHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.4,
    textTransform: "uppercase",
    letterSpacing: 0,
    color: "var(--color-accent-primary)",
    fontWeight: 800,
  },
  sectionTitle: {
    margin: "3px 0 0",
    fontSize: 19,
    lineHeight: 1.25,
    fontWeight: 850,
    letterSpacing: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card-elevated)",
    color: "var(--color-text-primary)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    transition: "150ms ease",
  },
  restoreBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card-muted)",
    color: "var(--color-text-muted)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 13,
    lineHeight: 1.45,
  },
  formBody: {
    display: "grid",
    gap: 14,
    marginTop: 16,
    animation: "interviewaiSlide 180ms ease both",
  },
  fieldLabel: {
    display: "grid",
    gap: 7,
    color: "var(--color-text-muted)",
    fontSize: 12,
    fontWeight: 800,
  },
  inputShell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    padding: "0 12px",
  },
  searchShell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    padding: "0 12px",
    flex: "1 1 220px",
  },
  inputIcon: {
    color: "var(--color-text-muted)",
    fontSize: 17,
  },
  input: {
    width: "100%",
    minWidth: 0,
    border: 0,
    outline: 0,
    background: "transparent",
    color: "var(--color-text-primary)",
    fontSize: 14,
    lineHeight: 1.4,
    fontFamily: "inherit",
  },
  select: {
    minHeight: 46,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    color: "var(--color-text-primary)",
    padding: "0 12px",
    fontSize: 14,
    fontFamily: "inherit",
  },
  ctaSlot: {
    display: "flex",
    alignItems: "end",
  },
  generateButton: {
    width: "100%",
    minHeight: 46,
    border: 0,
    borderRadius: 10,
    background: "var(--color-accent-primary)",
    color: "var(--color-background-primary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    transition: "160ms ease",
    fontFamily: "inherit",
  },
  smallLabel: {
    margin: "0 0 8px",
    color: "var(--color-text-muted)",
    fontSize: 12,
    fontWeight: 800,
  },
  roundWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  roundSelectorRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  roundChip: {
    minHeight: 44,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    color: "var(--color-text-muted)",
    padding: "0 11px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 750,
    fontFamily: "inherit",
  },
  checkboxSelected: {
    width: 18,
    height: 18,
    borderRadius: 5,
    background: "var(--color-accent-primary)",
    color: "var(--color-background-primary)",
    display: "grid",
    placeItems: "center",
    fontSize: 12,
  },
  checkboxEmpty: {
    width: 18,
    height: 18,
    borderRadius: 5,
    border: "0.5px solid var(--color-line-strong)",
    background: "var(--color-background-primary)",
  },
  suggestionMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 20,
    marginTop: 6,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card-elevated)",
    boxShadow: "var(--shadow-card)",
    overflow: "hidden",
  },
  suggestionItem: {
    width: "100%",
    minHeight: 42,
    border: 0,
    background: "transparent",
    color: "var(--color-text-primary)",
    textAlign: "left",
    padding: "0 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
  },
  loadingWrap: {
    display: "grid",
    gap: 12,
    marginTop: 14,
  },
  loadingMessage: {
    minHeight: 46,
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "0 14px",
    color: "var(--color-text-primary)",
    fontSize: 13,
    fontWeight: 750,
  },
  dots: {
    color: "var(--color-accent-primary)",
  },
  skeletonCard: {
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    padding: 16,
    display: "grid",
    gap: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 99,
    background: "var(--color-card-muted)",
    animation: "interviewaiPulse 1200ms ease-in-out infinite",
    display: "block",
  },
  skeletonFooter: {
    display: "flex",
    gap: 8,
    marginTop: 4,
  },
  skeletonPill: {
    height: 24,
    borderRadius: 99,
    background: "var(--color-card-muted)",
    animation: "interviewaiPulse 1200ms ease-in-out infinite",
    display: "block",
  },
  errorCard: {
    marginBottom: 14,
    borderRadius: 12,
    border: "0.5px solid var(--color-danger-primary)",
    background: "color-mix(in srgb, var(--color-danger-primary) 10%, var(--color-card))",
    color: "var(--color-text-primary)",
    padding: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    lineHeight: 1.45,
  },
  retryButton: {
    marginLeft: "auto",
    minHeight: 36,
    borderRadius: 8,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    color: "var(--color-text-primary)",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 800,
    fontFamily: "inherit",
  },
  dashboard: {
    display: "grid",
    gap: 14,
    animation: "interviewaiSlide 180ms ease both",
  },
  overviewCard: {
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    padding: 16,
    boxShadow: "var(--shadow-card)",
  },
  overviewTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  overviewTitle: {
    margin: "3px 0 0",
    fontSize: 23,
    lineHeight: 1.2,
    letterSpacing: 0,
    fontWeight: 900,
  },
  overviewSummary: {
    margin: "7px 0 0",
    color: "var(--color-text-muted)",
    fontSize: 13,
    lineHeight: 1.6,
  },
  mockButton: {
    minHeight: 44,
    border: 0,
    borderRadius: 10,
    background: "var(--color-text-primary)",
    color: "var(--color-background-primary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0 14px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    fontFamily: "inherit",
  },
  ghostButton: {
    minHeight: 38,
    border: "0.5px solid var(--color-line)",
    borderRadius: 9,
    background: "var(--color-card)",
    color: "var(--color-text-primary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    fontFamily: "inherit",
  },
  statsGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10,
  },
  statCard: {
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    padding: 12,
    display: "grid",
    gap: 4,
  },
  statIcon: {
    color: "var(--color-accent-primary)",
    fontSize: 18,
  },
  statLabel: {
    color: "var(--color-text-muted)",
    fontSize: 11,
    fontWeight: 800,
  },
  statValue: {
    color: "var(--color-text-primary)",
    fontSize: 14,
    lineHeight: 1.35,
  },
  progressShell: {
    marginTop: 14,
  },
  progressTextRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "var(--color-text-muted)",
    fontSize: 12,
    lineHeight: 1.4,
  },
  progressTrack: {
    marginTop: 8,
    height: 9,
    borderRadius: 99,
    background: "var(--color-card-muted)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    background: "var(--color-accent-primary)",
    transition: "width 180ms ease",
  },
  filterPanel: {
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    padding: 12,
    display: "grid",
    gap: 10,
  },
  filterRows: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  segmented: {
    minHeight: 44,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    padding: 4,
    display: "flex",
    gap: 4,
    overflowX: "auto",
  },
  segmentButton: {
    minHeight: 34,
    border: 0,
    borderRadius: 8,
    padding: "0 11px",
    fontSize: 12,
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  sortLabel: {
    minHeight: 44,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "0 10px",
    color: "var(--color-text-muted)",
  },
  sortSelect: {
    border: 0,
    outline: 0,
    background: "transparent",
    color: "var(--color-text-primary)",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 800,
  },
  filterButton: {
    minHeight: 44,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    color: "var(--color-text-muted)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
    fontFamily: "inherit",
  },
  copyMessage: {
    margin: 0,
    fontSize: 12,
    color: "var(--color-accent-primary)",
    fontWeight: 800,
  },
  tabBar: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    borderBottom: "0.5px solid var(--color-line)",
  },
  tabButton: {
    minHeight: 48,
    border: 0,
    borderBottom: "2px solid transparent",
    background: "transparent",
    color: "var(--color-text-muted)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "0 10px",
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 99,
    display: "grid",
    placeItems: "center",
    background: "var(--color-card-muted)",
    color: "var(--color-text-primary)",
    fontSize: 11,
    fontWeight: 900,
  },
  panel: {
    display: "grid",
    gap: 12,
  },
  questionCard: {
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    borderLeft: "4px solid var(--color-line)",
    background: "var(--color-card)",
    padding: 14,
    boxShadow: "var(--shadow-card)",
    animation: "interviewaiSlide 170ms ease both",
  },
  cardTopRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  questionNumber: {
    minWidth: 34,
    height: 26,
    borderRadius: 99,
    display: "grid",
    placeItems: "center",
    background: "var(--color-card-muted)",
    color: "var(--color-text-primary)",
    fontSize: 11,
    fontWeight: 900,
  },
  frequencyBadge: {
    minHeight: 26,
    borderRadius: 99,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "0 9px",
    fontSize: 11,
    fontWeight: 850,
  },
  roundBadge: {
    minHeight: 26,
    borderRadius: 99,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 9px",
    background: "color-mix(in srgb, var(--color-accent-primary) 12%, var(--color-card))",
    color: "var(--color-accent-primary)",
    fontSize: 11,
    fontWeight: 850,
  },
  questionText: {
    margin: "12px 0",
    color: "var(--color-text-primary)",
    fontSize: 14,
    lineHeight: 1.65,
    fontWeight: 720,
  },
  cardMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  topicTag: {
    minHeight: 26,
    borderRadius: 99,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 9px",
    background: "var(--color-card-muted)",
    color: "var(--color-text-muted)",
    fontSize: 11,
    fontWeight: 850,
  },
  difficultyPill: {
    minHeight: 26,
    borderRadius: 99,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 9px",
    fontSize: 11,
    fontWeight: 900,
  },
  complexityHint: {
    minHeight: 26,
    borderRadius: 99,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 9px",
    background: "var(--color-background-primary)",
    color: "var(--color-text-muted)",
    border: "0.5px solid var(--color-line)",
    fontSize: 11,
    fontWeight: 800,
  },
  starButton: {
    marginLeft: "auto",
    width: 44,
    height: 44,
    border: "0.5px solid var(--color-line)",
    borderRadius: 10,
    background: "var(--color-background-primary)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    fontSize: 18,
  },
  cardActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
    paddingTop: 12,
    borderTop: "0.5px solid var(--color-line)",
  },
  answerToggle: {
    minHeight: 44,
    border: "0.5px solid var(--color-line)",
    borderRadius: 10,
    background: "var(--color-background-primary)",
    color: "var(--color-text-primary)",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
    fontFamily: "inherit",
  },
  practiceButton: {
    minHeight: 44,
    border: 0,
    borderRadius: 10,
    background: "color-mix(in srgb, var(--color-accent-primary) 16%, var(--color-card))",
    color: "var(--color-accent-primary)",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    fontFamily: "inherit",
  },
  answerBox: {
    marginTop: 12,
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    padding: 12,
  },
  answerLoading: {
    display: "grid",
    gap: 10,
  },
  answerText: {
    margin: "6px 0 0",
    whiteSpace: "pre-wrap",
    color: "var(--color-text-primary)",
    fontSize: 13,
    lineHeight: 1.65,
  },
  streamingNote: {
    margin: "8px 0 0",
    color: "var(--color-accent-primary)",
    fontSize: 12,
    fontWeight: 800,
  },
  answerError: {
    margin: "8px 0 0",
    color: "var(--color-danger-primary)",
    fontSize: 12,
    lineHeight: 1.45,
  },
  practicedLabel: {
    marginTop: 12,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    color: "var(--color-text-muted)",
    fontSize: 12,
    fontWeight: 800,
  },
  checkboxInput: {
    width: 18,
    height: 18,
    accentColor: "var(--color-accent-primary)",
  },
  tipsGrid: {
    display: "grid",
    gap: 12,
  },
  tipBlock: {
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    padding: 14,
    boxShadow: "var(--shadow-card)",
  },
  tipTitle: {
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 15,
    lineHeight: 1.35,
    fontWeight: 900,
  },
  tipList: {
    margin: "10px 0 0",
    paddingLeft: 18,
    color: "var(--color-text-muted)",
    fontSize: 13,
    lineHeight: 1.65,
  },
  tipItem: {
    marginBottom: 7,
  },
  emptyText: {
    margin: "10px 0 0",
    color: "var(--color-text-muted)",
    fontSize: 13,
  },
  emptyState: {
    minHeight: 160,
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    color: "var(--color-text-muted)",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 18,
    fontSize: 14,
  },
  mockShell: {
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-card)",
    padding: 16,
    boxShadow: "var(--shadow-card)",
    display: "grid",
    gap: 14,
    animation: "interviewaiSlide 180ms ease both",
  },
  mockHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  mockProgressText: {
    color: "var(--color-text-muted)",
    fontSize: 12,
    fontWeight: 850,
  },
  mockQuestionCard: {
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    padding: 16,
    textAlign: "center",
  },
  mockQuestionText: {
    margin: "0 0 12px",
    color: "var(--color-text-primary)",
    fontSize: 18,
    lineHeight: 1.55,
    fontWeight: 850,
  },
  answerTextarea: {
    width: "100%",
    minHeight: 130,
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    color: "var(--color-text-primary)",
    padding: 12,
    outline: 0,
    resize: "vertical",
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  evaluationCard: {
    borderRadius: 12,
    border: "0.5px solid var(--color-line)",
    background: "var(--color-background-primary)",
    padding: 14,
    display: "grid",
    gap: 12,
    animation: "interviewaiSlide 180ms ease both",
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 13,
  },
  scoreDonut: {
    width: 78,
    height: 78,
    minWidth: 78,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "color-mix(in srgb, var(--color-accent-primary) 18%, var(--color-card))",
    color: "var(--color-accent-primary)",
    border: "4px solid var(--color-accent-primary)",
  },
  evaluationTitle: {
    margin: 0,
    fontSize: 17,
    lineHeight: 1.35,
    fontWeight: 900,
  },
  evaluationList: {
    borderRadius: 10,
    border: "0.5px solid var(--color-line)",
    padding: 12,
  },
  finalHero: {
    textAlign: "center",
    display: "grid",
    justifyItems: "center",
    gap: 5,
    padding: "12px 0",
  },
  finalIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    color: "var(--color-warning-primary)",
    fontSize: 34,
  },
  finalScore: {
    margin: 0,
    fontSize: 46,
    lineHeight: 1,
    fontWeight: 950,
  },
  reportList: {
    display: "grid",
    gap: 10,
  },
  scorePill: {
    minHeight: 26,
    borderRadius: 99,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 9px",
    background: "color-mix(in srgb, var(--color-accent-primary) 16%, var(--color-card))",
    color: "var(--color-accent-primary)",
    fontSize: 11,
    fontWeight: 900,
  },
  finalActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
};
