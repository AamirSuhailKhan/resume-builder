"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type AppState = "idle" | "loading" | "ready" | "mock";
type SourceStatus = "idle" | "loading" | "done" | "error";
type Difficulty = "All" | "Easy" | "Medium" | "Hard" | "Expert" | "Unknown";
type SourceKey = "company" | "leetcode" | "codeforces" | "gfg" | "interviewBit" | "systemDesign" | "behavioral" | "hr";
type QuestionKind = "DSA" | "Competitive Programming" | "CS Theory" | "System Design" | "Behavioral" | "HR";

type FormState = {
  company: string;
  role: string;
  experience: string;
  language: string;
};

type FilterState = {
  search: string;
  difficulty: Difficulty;
  topic: string;
  source: "all" | SourceKey;
  onlyFree: boolean;
  bookmarkedOnly: boolean;
  hidePracticed: boolean;
  lcCompany: string;
  lcStatus: "all" | "free" | "premium";
  lcSort: "frequency" | "difficulty" | "acceptance" | "number";
  cfMinRating: number;
  cfMaxRating: number;
  cfTags: string[];
  cfSort: "solved" | "rating" | "contest";
};

type UniversalQuestion = {
  id: string;
  sourceKey: SourceKey;
  source: string;
  sourceIcon: string;
  title: string;
  question: string;
  kind: QuestionKind;
  difficulty: Difficulty;
  topic: string;
  topics: string[];
  tags: string[];
  companies: string[];
  url?: string;
  problemId?: string;
  number?: number;
  slug?: string;
  rating?: number;
  solvedCount?: number;
  acceptanceRate?: number;
  isPaid?: boolean;
  frequency?: number;
  frequencyLabel?: string;
  round?: string;
  year?: string;
  subject?: string;
  sourceNote?: string;
  keyAreas?: string[];
  scaleHint?: string;
  subtype?: string;
  approach?: string;
  constraints?: string;
  example?: string;
  timeComplexityTarget?: string;
  modelAnswerType?: "dsa" | "system" | "behavioral" | "hr" | "cs";
};

type SourceBucket = {
  status: SourceStatus;
  items: UniversalQuestion[];
  total: number;
  error?: string;
  note?: string;
};

type SourcesState = Record<SourceKey, SourceBucket>;

type Hint = {
  hint: string;
  keyInsight: string;
  timeComplexity: string;
  approach: string;
};

type Answer = {
  summary: string;
  sections: Array<{ title: string; body: string | string[] }>;
};

type MockConfig = {
  leetcodePercent: number;
  codeforcesPercent: number;
  aiPercent: number;
  totalQuestions: number;
  timeLimit: number;
  difficulty: "Easy" | "Mixed" | "Hard";
};

type MockState = {
  phase: "config" | "running" | "report";
  config: MockConfig;
  questions: UniversalQuestion[];
  index: number;
  answers: Record<string, string>;
  skipped: Set<string>;
  startedAt: number;
  score: number;
  feedback: string[];
};

const CLAUDE_PROXY_URL = "/api/interview/claude";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const LEETCODE_SOURCES = [
  "https://raw.githubusercontent.com/Ykk2/leetcode-questions-api/main/all_questions.json",
  "https://raw.githubusercontent.com/hejrobin/leetcode-problem-list/master/data/problems.json",
];

const STORAGE = {
  bookmarks: "iai_bookmarks",
  practiced: "iai_practiced",
  hintCache: "iai_hint_cache",
  answerCache: "iai_answer_cache",
  filters: "iai_filters",
  lastSession: "iai_last_session",
  sourceCache: "iai_source_cache",
};

const COMPANIES = [
  "Razorpay",
  "PhonePe",
  "CRED",
  "Zepto",
  "Meesho",
  "Groww",
  "Juspay",
  "Slice",
  "BrowserStack",
  "Postman",
  "Chargebee",
  "Freshworks",
  "Swiggy",
  "Zomato",
  "Ola",
  "Rapido",
  "Dunzo",
  "Paytm",
  "Policybazaar",
  "Lendingkart",
  "KreditBee",
  "Jupiter",
  "Fi Money",
  "Niyo",
  "Stashfin",
  "Byju's",
  "Unacademy",
  "upGrad",
  "Vedantu",
  "Physics Wallah",
  "Flipkart",
  "Myntra",
  "Nykaa",
  "Purplle",
  "Mamaearth",
  "Google India",
  "Microsoft India",
  "Amazon India",
  "Meta India",
  "Apple India",
  "Infosys",
  "TCS",
  "Wipro",
  "HCL",
  "Tech Mahindra",
  "Cognizant",
  "Capgemini",
  "Accenture India",
  "IBM India",
  "ShareChat",
  "InMobi",
  "CleverTap",
  "MoEngage",
  "LeadSquared",
  "Darwinbox",
  "Zoho",
  "HashedIn",
  "Thoughtworks India",
  "Dream11",
  "MPL",
  "CoinDCX",
  "CoinSwitch",
  "Pine Labs",
  "Mobikwik",
  "MakeMyTrip",
  "Goibibo",
  "Urban Company",
  "Licious",
  "Cars24",
  "Spinny",
  "Udaan",
  "Delhivery",
  "Blinkit",
  "NoBroker",
  "OYO",
  "InMobi Glance",
];

const ROLES = [
  "SDE1 / Junior Software Engineer",
  "SDE2 / Software Engineer",
  "SDE3 / Senior Software Engineer",
  "Staff Engineer / Tech Lead",
  "Principal Engineer / Architect",
  "Frontend Engineer (React/Angular/Vue)",
  "Backend Engineer (Node/Java/Python/Go)",
  "Fullstack Engineer",
  "Android Engineer",
  "iOS Engineer",
  "Data Analyst",
  "Data Scientist",
  "ML Engineer",
  "Data Engineer",
  "MLOps Engineer",
  "DevOps / Platform Engineer",
  "SRE / Site Reliability Engineer",
  "Cloud Engineer (AWS/GCP/Azure)",
  "Product Manager / APM",
  "Senior Product Manager",
  "Product Analyst",
  "UI/UX Designer",
  "QA / SDET Engineer",
  "Business Analyst",
  "Scrum Master / Agile Coach",
  "Solution Architect",
  "Security Engineer",
];

const EXPERIENCES = ["Fresher - 0 to 1 year", "Junior - 1 to 3 years", "Mid-level - 3 to 6 years", "Senior - 6+ years"];
const LANGUAGES = ["Java", "JavaScript / TypeScript", "Python", "C++", "Go", "Kotlin", "Swift", "SQL", "React"];

const CF_TAGS = [
  "implementation",
  "math",
  "greedy",
  "dp",
  "data structures",
  "brute force",
  "constructive algorithms",
  "graphs",
  "sortings",
  "binary search",
  "dfs and similar",
  "trees",
  "strings",
  "number theory",
  "combinatorics",
  "two pointers",
  "bitmasks",
  "geometry",
  "shortest paths",
  "probabilities",
  "divide and conquer",
  "hashing",
  "games",
  "flows",
  "interactive",
  "matrices",
];

const LC_TOPICS = [
  "Array",
  "String",
  "Hash Table",
  "Dynamic Programming",
  "Math",
  "Sorting",
  "Greedy",
  "Depth-First Search",
  "Binary Search",
  "Tree",
  "Breadth-First Search",
  "Graph",
  "Two Pointers",
  "Stack",
  "Heap",
  "Design",
  "Prefix Sum",
  "Backtracking",
  "Linked List",
  "Sliding Window",
  "Trie",
  "Union Find",
  "Recursion",
  "Bit Manipulation",
  "Queue",
  "Monotonic Stack",
  "Segment Tree",
  "Memoization",
  "Database",
  "Matrix",
  "Binary Tree",
  "Simulation",
  "Counting",
  "Combinatorics",
  "Shortest Path",
  "Divide and Conquer",
  "Ordered Set",
  "Game Theory",
  "Number Theory",
  "Rolling Hash",
  "Geometry",
  "Topological Sort",
  "Binary Indexed Tree",
  "Data Stream",
  "Concurrency",
  "Shell",
  "Reservoir Sampling",
  "Interactive",
  "Randomized",
  "Brainteaser",
];

const SOURCE_META: Record<SourceKey, { label: string; icon: string; className: string }> = {
  company: { label: "Company", icon: "ti-building-skyscraper", className: "iai-source-company" },
  leetcode: { label: "LeetCode", icon: "ti-code", className: "iai-source-leetcode" },
  codeforces: { label: "Codeforces", icon: "ti-trophy", className: "iai-source-codeforces" },
  gfg: { label: "GFG Style", icon: "ti-book", className: "iai-source-gfg" },
  interviewBit: { label: "InterviewBit", icon: "ti-bolt", className: "iai-source-interviewbit" },
  systemDesign: { label: "System Design", icon: "ti-layout-grid", className: "iai-source-system" },
  behavioral: { label: "Behavioral", icon: "ti-users", className: "iai-source-behavioral" },
  hr: { label: "HR", icon: "ti-briefcase", className: "iai-source-hr" },
};

const TABS: SourceKey[] = ["company", "leetcode", "codeforces", "gfg", "interviewBit", "systemDesign", "behavioral", "hr"];

const DEFAULT_FILTERS: FilterState = {
  search: "",
  difficulty: "All",
  topic: "all",
  source: "all",
  onlyFree: false,
  bookmarkedOnly: false,
  hidePracticed: false,
  lcCompany: "all",
  lcStatus: "all",
  lcSort: "frequency",
  cfMinRating: 800,
  cfMaxRating: 3500,
  cfTags: [],
  cfSort: "solved",
};

const EMPTY_SOURCES: SourcesState = {
  company: { status: "idle", items: [], total: 0 },
  leetcode: { status: "idle", items: [], total: 0 },
  codeforces: { status: "idle", items: [], total: 0 },
  gfg: { status: "idle", items: [], total: 0 },
  interviewBit: { status: "idle", items: [], total: 0 },
  systemDesign: { status: "idle", items: [], total: 0 },
  behavioral: { status: "idle", items: [], total: 0 },
  hr: { status: "idle", items: [], total: 0 },
};

export default function InterviewAI() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [form, setForm] = useState<FormState>(() =>
    readJson<FormState>(STORAGE.lastSession, {
      company: "Razorpay",
      role: "SDE2 / Software Engineer",
      experience: "Mid-level - 3 to 6 years",
      language: "JavaScript / TypeScript",
    }),
  );
  const [sources, setSources] = useState<SourcesState>(() => readJson<SourcesState>(STORAGE.sourceCache, EMPTY_SOURCES));
  const [filters, setFiltersState] = useState<FilterState>(() => readJson<FilterState>(STORAGE.filters, DEFAULT_FILTERS));
  const [activeTab, setActiveTab] = useState<SourceKey>("company");
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => new Set(readJson<string[]>(STORAGE.bookmarks, [])));
  const [practiced, setPracticed] = useState<Set<string>>(() => new Set(readJson<string[]>(STORAGE.practiced, [])));
  const [hintCache, setHintCache] = useState<Record<string, Hint>>(() => readJson<Record<string, Hint>>(STORAGE.hintCache, {}));
  const [answerCache, setAnswerCache] = useState<Record<string, Answer>>(() => readJson<Record<string, Answer>>(STORAGE.answerCache, {}));
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [loadingHints, setLoadingHints] = useState<Set<string>>(new Set());
  const [loadingAnswers, setLoadingAnswers] = useState<Set<string>>(new Set());
  const [mockState, setMockState] = useState<MockState | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);

  const totalLoaded = useMemo(() => Object.values(sources).reduce((sum, source) => sum + source.total, 0), [sources]);
  const allItems = useMemo(() => TABS.flatMap((key) => sources[key].items), [sources]);
  const activeItems = sources[activeTab].items;
  const visibleItems = useMemo(
    () => sortItems(filterItems(activeItems, filters, bookmarks, practiced, activeTab), filters, activeTab),
    [activeItems, filters, bookmarks, practiced, activeTab],
  );
  const globalMatches = useMemo(
    () => (filters.search ? filterItems(allItems, filters, bookmarks, practiced, "company") : visibleItems),
    [allItems, filters, bookmarks, practiced, visibleItems],
  );
  const renderedItems = filters.search ? globalMatches : visibleItems;
  const sourceCompanies = useMemo(() => unique(allItems.flatMap((item) => item.companies)).slice(0, 70), [allItems]);
  const sourceTopics = useMemo(() => unique([...LC_TOPICS, ...allItems.flatMap((item) => [...item.topics, item.topic].filter(Boolean))]).slice(0, 140), [allItems]);
  const practicedBySource = useMemo(() => {
    const result: Record<SourceKey, number> = { company: 0, leetcode: 0, codeforces: 0, gfg: 0, interviewBit: 0, systemDesign: 0, behavioral: 0, hr: 0 };
    for (const item of allItems) {
      if (practiced.has(item.id)) {
        result[item.sourceKey] += 1;
      }
    }
    return result;
  }, [allItems, practiced]);

  const setFilters = useCallback((next: FilterState) => {
    setFiltersState(next);
    writeJson(STORAGE.filters, next);
  }, []);

  const updateSource = useCallback((key: SourceKey, patch: Partial<SourceBucket>) => {
    setSources((current) => {
      const next = {
        ...current,
        [key]: {
          ...current[key],
          ...patch,
        },
      };
      const cacheable = Object.fromEntries(
        Object.entries(next).map(([sourceKey, bucket]) => [
          sourceKey,
          {
            ...bucket,
            items: bucket.items.slice(0, sourceKey === "codeforces" ? 650 : 350),
          },
        ]),
      ) as SourcesState;
      writeJson(STORAGE.sourceCache, cacheable);
      return next;
    });
  }, []);

  const generateAll = useCallback(() => {
    setAppState("loading");
    setFormCollapsed(true);
    writeJson(STORAGE.lastSession, form);
    const loadingSources = withEverySource({ status: "loading", items: [], total: 0 });
    setSources(loadingSources);
    fetchCodeforcesProblems()
      .then((items) => updateSource("codeforces", { status: "done", items, total: items.length }))
      .catch(() => updateSource("codeforces", { status: "error", items: [], total: 0, error: "Codeforces API unavailable" }));
    fetchLeetCodeProblems(form)
      .then((result) => updateSource("leetcode", { status: "done", items: result.items, total: result.items.length, ...(result.note ? { note: result.note } : {}) }))
      .catch(() => {
        const items = buildLeetCodeFallback(form);
        updateSource("leetcode", { status: "done", items, total: items.length, note: "Using AI/offline LeetCode-style fallback" });
      });
    fireAiCategories(form, updateSource);
    window.setTimeout(() => setAppState("ready"), 400);
  }, [form, updateSource]);

  const retrySource = useCallback((key: SourceKey) => {
    updateSource(key, { status: "loading", error: "" });
    if (key === "codeforces") {
      fetchCodeforcesProblems()
        .then((items) => updateSource("codeforces", { status: "done", items, total: items.length }))
        .catch(() => updateSource("codeforces", { status: "error", items: [], total: 0, error: "Codeforces API unavailable" }));
      return;
    }
    if (key === "leetcode") {
      fetchLeetCodeProblems(form)
        .then((result) => updateSource("leetcode", { status: "done", items: result.items, total: result.items.length, ...(result.note ? { note: result.note } : {}) }))
        .catch(() => updateSource("leetcode", { status: "done", items: buildLeetCodeFallback(form), total: 80, note: "Using AI/offline LeetCode-style fallback" }));
      return;
    }
    fetchAiCategory(key, form)
      .then((items) => updateSource(key, { status: "done", items, total: items.length }))
      .catch(() => {
        const items = buildAiFallback(key, form);
        updateSource(key, { status: "done", items, total: items.length, note: "Offline AI-prep fallback loaded" });
      });
  }, [form, updateSource]);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writeJson(STORAGE.bookmarks, Array.from(next));
      return next;
    });
  }, []);

  const togglePracticed = useCallback((id: string) => {
    setPracticed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writeJson(STORAGE.practiced, Array.from(next));
      return next;
    });
  }, []);

  const getHint = useCallback(async (item: UniversalQuestion) => {
    setExpandedHints((current) => new Set(current).add(item.id));
    if (hintCache[item.id]) {
      return;
    }
    setLoadingHints((current) => new Set(current).add(item.id));
    try {
      const hint = await fetchAiHint(item);
      setHintCache((current) => {
        const next = { ...current, [item.id]: hint };
        writeJson(STORAGE.hintCache, next);
        return next;
      });
    } catch {
      const hint = buildHintFallback(item);
      setHintCache((current) => {
        const next = { ...current, [item.id]: hint };
        writeJson(STORAGE.hintCache, next);
        return next;
      });
    } finally {
      setLoadingHints((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }, [hintCache]);

  const getAnswer = useCallback(async (item: UniversalQuestion) => {
    setExpandedAnswers((current) => new Set(current).add(item.id));
    if (answerCache[item.id]) {
      return;
    }
    setLoadingAnswers((current) => new Set(current).add(item.id));
    try {
      const answer = await fetchAiAnswer(item, form);
      setAnswerCache((current) => {
        const next = { ...current, [item.id]: answer };
        writeJson(STORAGE.answerCache, next);
        return next;
      });
    } catch {
      const answer = buildAnswerFallback(item, form);
      setAnswerCache((current) => {
        const next = { ...current, [item.id]: answer };
        writeJson(STORAGE.answerCache, next);
        return next;
      });
    } finally {
      setLoadingAnswers((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }, [answerCache, form]);

  const startMock = useCallback(() => {
    setMockState({
      phase: "config",
      config: { leetcodePercent: 40, codeforcesPercent: 25, aiPercent: 35, totalQuestions: 10, timeLimit: 60, difficulty: "Mixed" },
      questions: [],
      index: 0,
      answers: {},
      skipped: new Set(),
      startedAt: Date.now(),
      score: 0,
      feedback: [],
    });
    setAppState("mock");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (appState === "mock" && mockState) {
    return (
      <main className="iai-shell">
        <style>{CSS}</style>
        <MockTest
          allItems={allItems}
          mockState={mockState}
          setMockState={setMockState}
          onBack={() => {
            setAppState("ready");
            setMockState(null);
          }}
        />
      </main>
    );
  }

  return (
    <main className="iai-shell">
      <style>{CSS}</style>
      <div className="iai-container">
        <Header totalLoaded={totalLoaded} appState={appState} />
        <InputForm
          form={form}
          setForm={setForm}
          loading={appState === "loading"}
          collapsed={formCollapsed}
          setCollapsed={setFormCollapsed}
          onSubmit={generateAll}
        />
        {appState !== "idle" ? (
          <DashboardTop
            totalLoaded={totalLoaded}
            sources={sources}
            practicedBySource={practicedBySource}
            allCount={allItems.length}
            practicedCount={allItems.filter((item) => practiced.has(item.id)).length}
            onStartMock={startMock}
          />
        ) : null}
        {appState !== "idle" ? (
          <TabBar activeTab={activeTab} setActiveTab={setActiveTab} sources={sources} />
        ) : null}
        {appState !== "idle" ? (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            topics={sourceTopics}
            companies={sourceCompanies.length ? sourceCompanies : COMPANIES}
          />
        ) : null}
        {appState !== "idle" ? (
          <SourcePanel
            sourceKey={activeTab}
            bucket={sources[activeTab]}
            items={renderedItems}
            filters={filters}
            setFilters={setFilters}
            bookmarks={bookmarks}
            practiced={practiced}
            hintCache={hintCache}
            answerCache={answerCache}
            expandedHints={expandedHints}
            expandedAnswers={expandedAnswers}
            loadingHints={loadingHints}
            loadingAnswers={loadingAnswers}
            onRetry={() => retrySource(activeTab)}
            onBookmark={toggleBookmark}
            onPracticed={togglePracticed}
            onHint={getHint}
            onAnswer={getAnswer}
          />
        ) : (
          <WelcomePanel />
        )}
      </div>
    </main>
  );
}

function Header({ totalLoaded, appState }: { totalLoaded: number; appState: AppState }) {
  return (
    <header className="iai-header">
      <div className="iai-logo">
        <i className="ti ti-target" />
      </div>
      <div>
        <p className="iai-kicker">All-in-one India hiring preparation</p>
        <h1>InterviewAI Source Hub</h1>
      </div>
      {appState !== "idle" ? (
        <div className="iai-counter">
          <strong>{totalLoaded.toLocaleString("en-IN")}</strong>
          <span>questions loaded</span>
        </div>
      ) : null}
    </header>
  );
}

function InputForm({
  form,
  setForm,
  loading,
  collapsed,
  setCollapsed,
  onSubmit,
}: {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  loading: boolean;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="iai-panel iai-input">
      <div className="iai-panel-head">
        <div>
          <p className="iai-section-label">Real sources</p>
          <h2>Company + role target</h2>
        </div>
        <button className="iai-icon-btn" type="button" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle input form">
          <i className={`ti ${collapsed ? "ti-chevron-down" : "ti-chevron-up"}`} />
        </button>
      </div>
      {!collapsed ? (
        <>
          <div className="iai-form-grid">
            <SearchSelect label="Company" options={COMPANIES} value={form.company} onChange={(company) => setForm((current) => ({ ...current, company }))} icon="ti-building-skyscraper" />
            <SearchSelect label="Role" options={ROLES} value={form.role} onChange={(role) => setForm((current) => ({ ...current, role }))} icon="ti-briefcase" />
            <label className="iai-field">
              <span>Experience level</span>
              <select value={form.experience} onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))}>
                {EXPERIENCES.map((experience) => (
                  <option key={experience} value={experience}>{experience}</option>
                ))}
              </select>
            </label>
            <label className="iai-field">
              <span>Programming language</span>
              <select value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}>
                {LANGUAGES.map((language) => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
            </label>
          </div>
          <button className="iai-generate" type="button" onClick={onSubmit} disabled={loading}>
            {loading ? <span className="iai-spinner" /> : <i className="ti ti-sparkles" />}
            {loading ? "Loading every platform in parallel..." : "Get ALL questions from all platforms ->"}
          </button>
          <div className="iai-platform-pills">
            <span>💻 LeetCode</span>
            <span>🏆 Codeforces</span>
            <span>📗 GFG</span>
            <span>⚡ InterviewBit</span>
            <span>🏗️ System Design</span>
            <span>🧠 Behavioral</span>
            <span>👤 HR</span>
            <span>🏢 Company Specific</span>
          </div>
        </>
      ) : null}
    </section>
  );
}

function SearchSelect({
  label,
  options,
  value,
  onChange,
  icon,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  icon: string;
}) {
  const [open, setOpen] = useState(false);
  const matches = options.filter((option) => option.toLowerCase().includes(value.toLowerCase())).slice(0, 12);
  return (
    <label className="iai-field iai-search-select">
      <span>{label}</span>
      <div className="iai-input-shell">
        <i className={`ti ${icon}`} />
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open ? (
        <div className="iai-menu">
          {(matches.length ? matches : options.slice(0, 12)).map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

function DashboardTop({
  totalLoaded,
  sources,
  practicedBySource,
  allCount,
  practicedCount,
  onStartMock,
}: {
  totalLoaded: number;
  sources: SourcesState;
  practicedBySource: Record<SourceKey, number>;
  allCount: number;
  practicedCount: number;
  onStartMock: () => void;
}) {
  const readiness = allCount ? Math.round((practicedCount / allCount) * 100) : 0;
  return (
    <section className="iai-panel iai-dashboard-top">
      <div className="iai-total-counter">
        <strong>{totalLoaded.toLocaleString("en-IN")}</strong>
        <span>questions loaded across real CP datasets, LeetCode datasets, and AI interview banks</span>
      </div>
      <div className="iai-breakdown">
        {TABS.map((key) => (
          <div key={key} className={`iai-breakdown-card ${SOURCE_META[key].className}`}>
            <i className={`ti ${SOURCE_META[key].icon}`} />
            <span>{SOURCE_META[key].label}</span>
            <strong>{sources[key].total.toLocaleString("en-IN")}</strong>
            <small>{practicedBySource[key]} practiced</small>
          </div>
        ))}
      </div>
      <div className="iai-readiness">
        <div>
          <strong>{readiness}% readiness</strong>
          <span>{practicedCount} of {allCount.toLocaleString("en-IN")} visible questions practiced</span>
        </div>
        <div className="iai-progress">
          <span style={{ width: `${readiness}%` }} />
        </div>
        <button className="iai-primary-btn" type="button" onClick={onStartMock}>
          <i className="ti ti-player-play" />
          Mock test from all sources
        </button>
      </div>
    </section>
  );
}

function TabBar({
  activeTab,
  setActiveTab,
  sources,
}: {
  activeTab: SourceKey;
  setActiveTab: (tab: SourceKey) => void;
  sources: SourcesState;
}) {
  return (
    <nav className="iai-tabs" aria-label="Interview source tabs">
      {TABS.map((key) => {
        const meta = SOURCE_META[key];
        const bucket = sources[key];
        return (
          <button key={key} type="button" className={activeTab === key ? "iai-tab iai-tab-active" : "iai-tab"} onClick={() => setActiveTab(key)}>
            {bucket.status === "loading" ? <span className="iai-mini-spinner" /> : <i className={`ti ${meta.icon}`} />}
            {meta.label}
            <span>{bucket.total.toLocaleString("en-IN")}</span>
            {bucket.status === "error" ? <i className="ti ti-alert-triangle" /> : null}
          </button>
        );
      })}
    </nav>
  );
}

function FilterBar({
  filters,
  setFilters,
  topics,
  companies,
}: {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  topics: string[];
  companies: string[];
}) {
  return (
    <section className="iai-panel iai-filters">
      <div className="iai-search">
        <i className="ti ti-search" />
        <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search questions..." />
      </div>
      <label>
        <i className="ti ti-filter" />
        <select value={filters.difficulty} onChange={(event) => setFilters({ ...filters, difficulty: event.target.value as Difficulty })}>
          {["All", "Easy", "Medium", "Hard", "Expert", "Unknown"].map((difficulty) => (
            <option key={difficulty} value={difficulty}>{difficulty}</option>
          ))}
        </select>
      </label>
      <label>
        <i className="ti ti-bookmark" />
        <select value={filters.topic} onChange={(event) => setFilters({ ...filters, topic: event.target.value })}>
          <option value="all">All topics</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
      </label>
      <label>
        <i className="ti ti-building-skyscraper" />
        <select value={filters.lcCompany} onChange={(event) => setFilters({ ...filters, lcCompany: event.target.value })}>
          <option value="all">All companies</option>
          {companies.map((company) => (
            <option key={company} value={company}>{company}</option>
          ))}
        </select>
      </label>
      <button className={filters.onlyFree ? "iai-toggle iai-toggle-on" : "iai-toggle"} type="button" onClick={() => setFilters({ ...filters, onlyFree: !filters.onlyFree })}>
        Only free problems
      </button>
      <button className={filters.bookmarkedOnly ? "iai-toggle iai-toggle-on" : "iai-toggle"} type="button" onClick={() => setFilters({ ...filters, bookmarkedOnly: !filters.bookmarkedOnly })}>
        Bookmarked only
      </button>
      <button className={filters.hidePracticed ? "iai-toggle iai-toggle-on" : "iai-toggle"} type="button" onClick={() => setFilters({ ...filters, hidePracticed: !filters.hidePracticed })}>
        Hide practiced
      </button>
    </section>
  );
}

function SourcePanel({
  sourceKey,
  bucket,
  items,
  filters,
  setFilters,
  bookmarks,
  practiced,
  hintCache,
  answerCache,
  expandedHints,
  expandedAnswers,
  loadingHints,
  loadingAnswers,
  onRetry,
  onBookmark,
  onPracticed,
  onHint,
  onAnswer,
}: {
  sourceKey: SourceKey;
  bucket: SourceBucket;
  items: UniversalQuestion[];
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  bookmarks: Set<string>;
  practiced: Set<string>;
  hintCache: Record<string, Hint>;
  answerCache: Record<string, Answer>;
  expandedHints: Set<string>;
  expandedAnswers: Set<string>;
  loadingHints: Set<string>;
  loadingAnswers: Set<string>;
  onRetry: () => void;
  onBookmark: (id: string) => void;
  onPracticed: (id: string) => void;
  onHint: (item: UniversalQuestion) => void;
  onAnswer: (item: UniversalQuestion) => void;
}) {
  if (bucket.status === "loading") {
    return <LoadingPanel sourceKey={sourceKey} />;
  }
  if (bucket.status === "error") {
    return (
      <section className="iai-panel iai-error">
        <i className="ti ti-alert-triangle" />
        <div>
          <strong>{bucket.error || `${SOURCE_META[sourceKey].label} failed to load`}</strong>
          <span>Retry this source independently while the other tabs stay usable.</span>
        </div>
        <button type="button" onClick={onRetry}>Retry</button>
      </section>
    );
  }
  return (
    <section className="iai-source-section">
      {bucket.note ? <div className="iai-source-note">{bucket.note}</div> : null}
      {sourceKey === "leetcode" ? <LeetCodeTools filters={filters} setFilters={setFilters} items={bucket.items} practiced={practiced} /> : null}
      {sourceKey === "codeforces" ? <CodeforcesTools filters={filters} setFilters={setFilters} onRetry={onRetry} /> : null}
      <div className="iai-result-head">
        <strong>{items.length.toLocaleString("en-IN")} matching questions</strong>
        <span>{filters.search ? `Showing global results for "${filters.search}"` : SOURCE_META[sourceKey].label}</span>
      </div>
      {items.length ? (
        <div className="iai-card-stack">
          {items.slice(0, 500).map((item) => (
            <QuestionCard
              key={item.id}
              item={item}
              bookmarked={bookmarks.has(item.id)}
              practiced={practiced.has(item.id)}
              hint={hintCache[item.id]}
              answer={answerCache[item.id]}
              hintExpanded={expandedHints.has(item.id)}
              answerExpanded={expandedAnswers.has(item.id)}
              hintLoading={loadingHints.has(item.id)}
              answerLoading={loadingAnswers.has(item.id)}
              onBookmark={() => onBookmark(item.id)}
              onPracticed={() => onPracticed(item.id)}
              onHint={() => onHint(item)}
              onAnswer={() => onAnswer(item)}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function LeetCodeTools({
  filters,
  setFilters,
  items,
  practiced,
}: {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  items: UniversalQuestion[];
  practiced: Set<string>;
}) {
  const easy = items.filter((item) => item.difficulty === "Easy").length;
  const medium = items.filter((item) => item.difficulty === "Medium").length;
  const hard = items.filter((item) => item.difficulty === "Hard").length;
  const done = items.filter((item) => practiced.has(item.id)).length;
  return (
    <section className="iai-panel iai-source-tools">
      <div className="iai-quick-stats">
        <span>Total: {items.length}</span>
        <span>Easy: {easy}</span>
        <span>Medium: {medium}</span>
        <span>Hard: {hard}</span>
        <span>You&apos;ve practiced {done} LeetCode problems</span>
      </div>
      <div className="iai-tool-row">
        <label>
          Status
          <select value={filters.lcStatus} onChange={(event) => setFilters({ ...filters, lcStatus: event.target.value as FilterState["lcStatus"] })}>
            <option value="all">All</option>
            <option value="free">Free only</option>
            <option value="premium">Premium only</option>
          </select>
        </label>
        <label>
          Sort
          <select value={filters.lcSort} onChange={(event) => setFilters({ ...filters, lcSort: event.target.value as FilterState["lcSort"] })}>
            <option value="frequency">Frequency</option>
            <option value="difficulty">Difficulty</option>
            <option value="acceptance">Acceptance Rate</option>
            <option value="number">Problem Number</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function CodeforcesTools({
  filters,
  setFilters,
  onRetry,
}: {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  onRetry: () => void;
}) {
  const setPreset = (min: number, max: number) => setFilters({ ...filters, cfMinRating: min, cfMaxRating: max });
  const toggleTag = (tag: string) => {
    const next = filters.cfTags.includes(tag) ? filters.cfTags.filter((item) => item !== tag) : [...filters.cfTags, tag];
    setFilters({ ...filters, cfTags: next });
  };
  return (
    <section className="iai-panel iai-source-tools">
      <div className="iai-rating-row">
        <label>
          Min rating
          <input type="range" min="800" max="3500" step="100" value={filters.cfMinRating} onChange={(event) => setFilters({ ...filters, cfMinRating: Number(event.target.value) })} />
          <span>{filters.cfMinRating}</span>
        </label>
        <label>
          Max rating
          <input type="range" min="800" max="3500" step="100" value={filters.cfMaxRating} onChange={(event) => setFilters({ ...filters, cfMaxRating: Number(event.target.value) })} />
          <span>{filters.cfMaxRating}</span>
        </label>
      </div>
      <div className="iai-preset-row">
        <button type="button" onClick={() => setPreset(800, 1200)}>Beginner 800-1200</button>
        <button type="button" onClick={() => setPreset(1200, 1600)}>Easy 1200-1600</button>
        <button type="button" onClick={() => setPreset(1600, 2000)}>Medium 1600-2000</button>
        <button type="button" onClick={() => setPreset(2000, 2400)}>Hard 2000-2400</button>
        <button type="button" onClick={() => setPreset(2400, 3500)}>Expert 2400+</button>
      </div>
      <div className="iai-tag-cloud">
        {CF_TAGS.map((tag) => (
          <button key={tag} type="button" className={filters.cfTags.includes(tag) ? "iai-chip-on" : ""} onClick={() => toggleTag(tag)}>{tag}</button>
        ))}
      </div>
      <div className="iai-tool-row">
        <label>
          Sort
          <select value={filters.cfSort} onChange={(event) => setFilters({ ...filters, cfSort: event.target.value as FilterState["cfSort"] })}>
            <option value="solved">Solved count</option>
            <option value="rating">Rating</option>
            <option value="contest">Contest ID</option>
          </select>
        </label>
        <button className="iai-secondary-btn" type="button" onClick={onRetry}>
          <i className="ti ti-refresh" />
          Fetch latest problems
        </button>
      </div>
    </section>
  );
}

function QuestionCard({
  item,
  bookmarked,
  practiced,
  hint,
  answer,
  hintExpanded,
  answerExpanded,
  hintLoading,
  answerLoading,
  onBookmark,
  onPracticed,
  onHint,
  onAnswer,
}: {
  item: UniversalQuestion;
  bookmarked: boolean;
  practiced: boolean;
  hint: Hint | undefined;
  answer: Answer | undefined;
  hintExpanded: boolean;
  answerExpanded: boolean;
  hintLoading: boolean;
  answerLoading: boolean;
  onBookmark: () => void;
  onPracticed: () => void;
  onHint: () => void;
  onAnswer: () => void;
}) {
  const sourceMeta = SOURCE_META[item.sourceKey];
  const cardClass = practiced ? "iai-question-card iai-practiced" : bookmarked ? "iai-question-card iai-bookmarked" : "iai-question-card";
  const canHint = item.sourceKey === "leetcode" || item.sourceKey === "codeforces" || item.sourceKey === "interviewBit";
  const canAnswer = !canHint || item.sourceKey === "interviewBit";
  return (
    <article className={cardClass}>
      <div className="iai-card-top">
        <span className={`iai-source-badge ${sourceMeta.className}`}>
          <i className={`ti ${sourceMeta.icon}`} />
          {item.source}
        </span>
        {item.problemId ? <span className="iai-muted-pill">{item.problemId}</span> : null}
        {item.number ? <span className="iai-muted-pill">#{item.number}</span> : null}
        {item.rating ? <span className="iai-muted-pill">Rating: {item.rating}</span> : null}
        {item.frequencyLabel ? <span className={frequencyClass(item.frequency || 0)}>{item.frequencyLabel}</span> : null}
        <span className={`iai-difficulty iai-${item.difficulty.toLowerCase().replace(/\s/g, "-")}`}>{item.difficulty}</span>
      </div>
      <h3>{item.title}</h3>
      {item.question !== item.title ? <p className="iai-question-copy">{item.question}</p> : null}
      <div className="iai-meta-grid">
        {item.subject ? <span>Subject: {item.subject}</span> : null}
        <span>Topic: {item.topic || item.topics[0] || "General"}</span>
        {item.acceptanceRate !== undefined ? <span>Acceptance: {formatPercent(item.acceptanceRate)}</span> : null}
        {item.companies.length ? <span>Asked by {item.companies.slice(0, 3).join(", ")}{item.companies.length > 3 ? ` +${item.companies.length - 3}` : ""}</span> : null}
        {item.solvedCount !== undefined ? <span>Solved by: {item.solvedCount.toLocaleString("en-IN")} users</span> : null}
        {item.round ? <span>Round: {item.round}</span> : null}
        {item.year ? <span>Year: {item.year}</span> : null}
      </div>
      <div className="iai-tags">
        {[...item.tags, ...item.topics].slice(0, 8).map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      {item.scaleHint ? <p className="iai-source-note">{item.scaleHint}</p> : null}
      {item.keyAreas?.length ? (
        <div className="iai-tags iai-keyareas">
          {item.keyAreas.map((area) => <span key={area}>{area}</span>)}
        </div>
      ) : null}
      <div className="iai-card-actions">
        <button className={bookmarked ? "iai-icon-action iai-active-action" : "iai-icon-action"} type="button" onClick={onBookmark} title="Bookmark">
          <i className="ti ti-star" />
        </button>
        <label className="iai-check-action">
          <input type="checkbox" checked={practiced} onChange={onPracticed} />
          Practiced
        </label>
        {item.url ? (
          <a className="iai-link-btn" href={item.url} target="_blank" rel="noreferrer">
            Open on {item.sourceKey === "codeforces" ? "CF" : item.sourceKey === "leetcode" ? "LeetCode" : "platform"}
            <i className="ti ti-external-link" />
          </a>
        ) : null}
        {canHint ? (
          <button className="iai-secondary-btn" type="button" onClick={onHint}>
            {hintLoading ? <span className="iai-mini-spinner" /> : <i className="ti ti-sparkles" />}
            Get AI Hint
          </button>
        ) : null}
        {canAnswer ? (
          <button className="iai-secondary-btn" type="button" onClick={onAnswer}>
            {answerLoading ? <span className="iai-mini-spinner" /> : <i className="ti ti-chevron-down" />}
            See model answer
          </button>
        ) : null}
      </div>
      {hintExpanded ? <HintPanel hint={hint} loading={hintLoading} /> : null}
      {answerExpanded ? <AnswerPanel answer={answer} loading={answerLoading} /> : null}
    </article>
  );
}

function HintPanel({ hint, loading }: { hint: Hint | undefined; loading: boolean }) {
  return (
    <section className="iai-answer-box">
      {loading ? <SkeletonLines label="AI hint generate ho raha hai..." /> : hint ? (
        <div className="iai-answer-content">
          <h4>Approach hint</h4>
          <p>{hint.hint}</p>
          <h4>Key insight</h4>
          <p>{hint.keyInsight}</p>
          <h4>Complexity target</h4>
          <p>{hint.timeComplexity}</p>
          <h4>Approach direction</h4>
          <p>{hint.approach}</p>
        </div>
      ) : null}
    </section>
  );
}

function AnswerPanel({ answer, loading }: { answer: Answer | undefined; loading: boolean }) {
  return (
    <section className="iai-answer-box">
      {loading ? <SkeletonLines label="Model answer generate ho raha hai..." /> : answer ? (
        <div className="iai-answer-content">
          <p>{answer.summary}</p>
          {answer.sections.map((section) => (
            <div key={section.title}>
              <h4>{section.title}</h4>
              {Array.isArray(section.body) ? (
                <ul>{section.body.map((line) => <li key={line}>{line}</li>)}</ul>
              ) : (
                <p>{section.body}</p>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SkeletonLines({ label }: { label: string }) {
  return (
    <div className="iai-skeleton-wrap">
      <span className="iai-skeleton-line iai-w-80" />
      <span className="iai-skeleton-line iai-w-65" />
      <span className="iai-skeleton-line iai-w-45" />
      <small>{label}</small>
    </div>
  );
}

function LoadingPanel({ sourceKey }: { sourceKey: SourceKey }) {
  return (
    <section className="iai-loading-panel">
      {[0, 1, 2, 3].map((item) => (
        <div className="iai-skeleton-card" key={item}>
          <span className="iai-skeleton-line iai-w-25" />
          <span className="iai-skeleton-line iai-w-80" />
          <span className="iai-skeleton-line iai-w-65" />
          <div className="iai-skeleton-pills">
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
      <div className="iai-source-note">{SOURCE_META[sourceKey].label} loading independently...</div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="iai-empty">
      <i className="ti ti-search" />
      <p>No questions match these filters. Try a broader topic, rating range, or company filter.</p>
    </section>
  );
}

function WelcomePanel() {
  return (
    <section className="iai-panel iai-welcome">
      <h2>One platform for India tech hiring prep</h2>
      <p>Fetch live Codeforces problems, GitHub LeetCode datasets, and AI-generated company, GFG, InterviewBit, system design, behavioral, and HR banks in one workspace.</p>
      <div className="iai-platform-pills">
        <span>9000+ Codeforces</span>
        <span>2000+ LeetCode</span>
        <span>Company rounds</span>
        <span>Startup hiring India</span>
        <span>Mock tests</span>
      </div>
    </section>
  );
}

function MockTest({
  allItems,
  mockState,
  setMockState,
  onBack,
}: {
  allItems: UniversalQuestion[];
  mockState: MockState;
  setMockState: Dispatch<SetStateAction<MockState | null>>;
  onBack: () => void;
}) {
  if (mockState.phase === "config") {
    return <MockConfigView allItems={allItems} mockState={mockState} setMockState={setMockState} onBack={onBack} />;
  }
  if (mockState.phase === "report") {
    return <MockReport mockState={mockState} onBack={onBack} onRestart={() => setMockState({ ...mockState, phase: "config", answers: {}, skipped: new Set(), questions: [], index: 0 })} />;
  }
  return <MockRunning mockState={mockState} setMockState={setMockState} onBack={onBack} />;
}

function MockConfigView({
  allItems,
  mockState,
  setMockState,
  onBack,
}: {
  allItems: UniversalQuestion[];
  mockState: MockState;
  setMockState: Dispatch<SetStateAction<MockState | null>>;
  onBack: () => void;
}) {
  const updateConfig = (patch: Partial<MockConfig>) => setMockState({ ...mockState, config: { ...mockState.config, ...patch } });
  const begin = () => {
    const questions = buildMockQuestions(allItems, mockState.config);
    setMockState({
      ...mockState,
      phase: "running",
      questions,
      index: 0,
      answers: {},
      skipped: new Set(),
      startedAt: Date.now(),
      score: 0,
      feedback: [],
    });
  };
  return (
    <section className="iai-mock">
      <div className="iai-mock-head">
        <button className="iai-secondary-btn" type="button" onClick={onBack}>
          <i className="ti ti-x" />
          Back to platform
        </button>
        <h2>Configure mock test</h2>
      </div>
      <div className="iai-mock-grid">
        <NumberControl label="LeetCode %" value={mockState.config.leetcodePercent} onChange={(value) => updateConfig({ leetcodePercent: value })} />
        <NumberControl label="Codeforces %" value={mockState.config.codeforcesPercent} onChange={(value) => updateConfig({ codeforcesPercent: value })} />
        <NumberControl label="AI Questions %" value={mockState.config.aiPercent} onChange={(value) => updateConfig({ aiPercent: value })} />
        <label className="iai-field">
          <span>Total questions</span>
          <select value={mockState.config.totalQuestions} onChange={(event) => updateConfig({ totalQuestions: Number(event.target.value) })}>
            {[10, 20, 30].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
        <label className="iai-field">
          <span>Time limit</span>
          <select value={mockState.config.timeLimit} onChange={(event) => updateConfig({ timeLimit: Number(event.target.value) })}>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
            <option value={0}>No limit</option>
          </select>
        </label>
        <label className="iai-field">
          <span>Difficulty</span>
          <select value={mockState.config.difficulty} onChange={(event) => updateConfig({ difficulty: event.target.value as MockConfig["difficulty"] })}>
            <option value="Easy">Easy</option>
            <option value="Mixed">Mixed</option>
            <option value="Hard">Hard</option>
          </select>
        </label>
      </div>
      <button className="iai-primary-btn iai-wide" type="button" onClick={begin}>
        <i className="ti ti-player-play" />
        Start timed mock test
      </button>
    </section>
  );
}

function NumberControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="iai-field">
      <span>{label}</span>
      <input type="number" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function MockRunning({
  mockState,
  setMockState,
  onBack,
}: {
  mockState: MockState;
  setMockState: Dispatch<SetStateAction<MockState | null>>;
  onBack: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const question = mockState.questions[mockState.index];
  const timeLimitMs = mockState.config.timeLimit * 60 * 1000;
  const remainingMs = timeLimitMs ? Math.max(0, timeLimitMs - (now - mockState.startedAt)) : 0;
  const elapsedMs = now - mockState.startedAt;
  const timerLabel = timeLimitMs ? formatDuration(remainingMs) : formatDuration(elapsedMs);
  const timerCaption = timeLimitMs ? "remaining" : "elapsed";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const finishState = useCallback(async (state: MockState) => {
    if (finishing) {
      return;
    }
    setFinishing(true);
    const localReport = evaluateMock(state);
    const baseReportState = {
      ...state,
      phase: "report" as const,
      score: localReport.score,
      feedback: localReport.feedback,
    };
    setMockState(baseReportState);
    try {
      const aiReport = await evaluateMockWithAI(state);
      setMockState({
        ...baseReportState,
        score: aiReport.score,
        feedback: aiReport.feedback,
      });
    } catch {
      setMockState({
        ...baseReportState,
        feedback: [
          ...localReport.feedback,
          "Claude evaluation was unavailable, so this report uses the local rubric fallback.",
        ],
      });
    }
  }, [finishing, setMockState]);

  useEffect(() => {
    if (timeLimitMs && remainingMs <= 0 && !finishing) {
      const timer = window.setTimeout(() => {
        void finishState(mockState);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [finishState, finishing, mockState, remainingMs, timeLimitMs]);

  if (!question) {
    return <MockReport mockState={{ ...mockState, phase: "report" }} onBack={onBack} onRestart={() => setMockState({ ...mockState, phase: "config" })} />;
  }
  const answer = mockState.answers[question.id] || "";
  const finish = () => {
    void finishState(mockState);
  };
  const next = (skip: boolean) => {
    const skipped = new Set(mockState.skipped);
    if (skip) {
      skipped.add(question.id);
    }
    const nextIndex = mockState.index + 1;
    if (nextIndex >= mockState.questions.length) {
      void finishState({ ...mockState, skipped });
      return;
    }
    setMockState({ ...mockState, skipped, index: nextIndex });
  };
  return (
    <section className="iai-mock">
      <div className="iai-mock-head">
        <button className="iai-secondary-btn" type="button" onClick={onBack}>
          <i className="ti ti-x" />
          End session
        </button>
        <div>
          <strong>Question {mockState.index + 1} of {mockState.questions.length}</strong>
          <div className="iai-progress"><span style={{ width: `${((mockState.index + 1) / mockState.questions.length) * 100}%` }} /></div>
        </div>
        <div className={timeLimitMs && remainingMs < 5 * 60 * 1000 ? "iai-timer iai-timer-hot" : "iai-timer"}>
          <strong>{timerLabel}</strong>
          <span>{timerCaption}</span>
        </div>
      </div>
      <article className="iai-mock-question">
        <span>{question.source} • {question.difficulty}</span>
        <h2>{question.title}</h2>
        <p>{question.question}</p>
      </article>
      <textarea
        className={question.kind === "DSA" || question.kind === "Competitive Programming" ? "iai-code-textarea" : "iai-mock-textarea"}
        value={answer}
        onChange={(event) => setMockState({ ...mockState, answers: { ...mockState.answers, [question.id]: event.target.value } })}
        placeholder={question.kind === "DSA" || question.kind === "Competitive Programming" ? "Write approach, pseudocode, complexity, and edge cases..." : "Write a structured interview answer..."}
      />
      <div className="iai-mock-actions">
        <span>{countWords(answer)} words</span>
        <button className="iai-secondary-btn" type="button" onClick={() => next(true)}>Skip</button>
        <button className="iai-primary-btn" type="button" onClick={() => next(false)}>Next</button>
        <button className="iai-secondary-btn" type="button" onClick={finish} disabled={finishing}>{finishing ? "Evaluating..." : "Finish now"}</button>
      </div>
    </section>
  );
}

function MockReport({
  mockState,
  onBack,
  onRestart,
}: {
  mockState: MockState;
  onBack: () => void;
  onRestart: () => void;
}) {
  const attempted = mockState.questions.length - mockState.skipped.size;
  return (
    <section className="iai-mock">
      <div className="iai-final-hero">
        <i className="ti ti-trophy" />
        <h2>{mockState.score}%</h2>
        <p>{mockState.score >= 75 ? "Strong mock performance" : mockState.score >= 55 ? "Promising, but polish weak areas" : "Needs more focused prep"}</p>
      </div>
      <div className="iai-breakdown">
        <div className="iai-breakdown-card"><span>Attempted</span><strong>{attempted}</strong><small>of {mockState.questions.length}</small></div>
        <div className="iai-breakdown-card"><span>Skipped</span><strong>{mockState.skipped.size}</strong><small>review these first</small></div>
        <div className="iai-breakdown-card"><span>Written answers</span><strong>{Object.values(mockState.answers).filter(Boolean).length}</strong><small>evaluated locally</small></div>
      </div>
      <section className="iai-panel">
        <h3>AI-style evaluation summary</h3>
        <ul className="iai-report-list">
          {mockState.feedback.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="iai-panel">
        <h3>Review links</h3>
        <div className="iai-tags">
          {mockState.questions.filter((item) => item.url).slice(0, 20).map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
          ))}
        </div>
      </section>
      <div className="iai-mock-actions">
        <button className="iai-primary-btn" type="button" onClick={onRestart}>Restart mock test</button>
        <button className="iai-secondary-btn" type="button" onClick={onBack}>Back to platform</button>
      </div>
    </section>
  );
}

async function fetchCodeforcesProblems(): Promise<UniversalQuestion[]> {
  const response = await fetch("https://codeforces.com/api/problemset.problems", { method: "GET" });
  const data = await response.json() as {
    status: string;
    result: {
      problems: Array<{ contestId?: number; index?: string; name?: string; rating?: number; tags?: string[] }>;
      problemStatistics: Array<{ contestId?: number; index?: string; solvedCount?: number }>;
    };
  };
  if (data.status !== "OK") {
    throw new Error("Codeforces API failed");
  }
  const stats = data.result.problemStatistics || [];
  return (data.result.problems || [])
    .filter((problem) => problem.contestId && problem.index && problem.name)
    .map((problem, index) => {
      const rating = problem.rating || 0;
      const tags = problem.tags || [];
      return {
        id: `cf_${problem.contestId}_${problem.index}`,
        sourceKey: "codeforces",
        source: "Codeforces",
        sourceIcon: "🏆",
        title: problem.name || "Untitled Codeforces Problem",
        question: problem.name || "Untitled Codeforces Problem",
        kind: "Competitive Programming",
        difficulty: ratingToDifficulty(rating),
        topic: tags[0] || "Competitive Programming",
        topics: tags,
        tags,
        companies: [],
        problemId: `${problem.contestId}${problem.index}`,
        rating,
        solvedCount: stats[index]?.solvedCount || 0,
        url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
        modelAnswerType: "dsa",
      } satisfies UniversalQuestion;
    });
}

async function fetchLeetCodeProblems(form: FormState): Promise<{ items: UniversalQuestion[]; note?: string }> {
  let data: unknown = null;
  for (const url of LEETCODE_SOURCES) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        data = await response.json();
        break;
      }
    } catch {
    }
  }
  if (!data) {
    try {
      return { items: await generateLeetCodeStyleViaAI(form), note: "Using AI-generated LeetCode-style problems" };
    } catch {
      return { items: buildLeetCodeFallback(form), note: "Using offline LeetCode fallback" };
    }
  }
  const rawItems = extractLeetCodeArray(data);
  const items = rawItems.map((item, index) => normalizeLeetCodeProblem(item, index, form)).filter(Boolean) as UniversalQuestion[];
  if (items.length) {
    return { items: items.slice(0, 2400) };
  }
  return { items: buildLeetCodeFallback(form), note: "Using offline LeetCode fallback" };
}

function extractLeetCodeArray(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (isRecord(data)) {
    const candidates = [data.problems, data.stat_status_pairs, data.questions, data.data];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
  }
  return [];
}

function normalizeLeetCodeProblem(raw: unknown, index: number, form: FormState): UniversalQuestion | null {
  if (!isRecord(raw)) {
    return null;
  }
  const stat = isRecord(raw.stat) ? raw.stat : raw;
  const rawDifficulty = isRecord(raw.difficulty) ? raw.difficulty.level : raw.difficulty;
  const title = stringValue(stat.question__title) || stringValue(stat.title) || stringValue(raw.title) || stringValue(raw.name);
  const slug = stringValue(stat.question__title_slug) || stringValue(stat.title_slug) || stringValue(raw.slug) || slugify(title);
  if (!title || !slug) {
    return null;
  }
  const number = numberValue(stat.question_id) || numberValue(stat.id) || numberValue(raw.id) || index + 1;
  const topics = normalizeStringList(raw.topicTags || raw.tags || raw.topics).slice(0, 8);
  const companies = normalizeStringList(raw.companies || raw.companyTags);
  const fallbackCompanies = companies.length ? companies : inferCompaniesForProblem(title, form.company);
  const difficulty = rawDifficulty === 1 ? "Easy" : rawDifficulty === 2 ? "Medium" : rawDifficulty === 3 ? "Hard" : normalizeDifficulty(stringValue(rawDifficulty) || stringValue(raw.difficulty) || "Medium");
  const acceptance = numberValue(raw.acceptance_rate) || numberValue(raw.acRate) || parseStatsAcceptance(raw.stats);
  return {
    id: `lc_${number}_${slug}`,
    sourceKey: "leetcode",
    source: "LeetCode",
    sourceIcon: "💻",
    title,
    question: title,
    kind: "DSA",
    difficulty,
    topic: topics[0] || "DSA",
    topics: topics.length ? topics : inferTopicsForProblem(title),
    tags: topics.length ? topics : inferTopicsForProblem(title),
    companies: fallbackCompanies,
    number,
    slug,
    acceptanceRate: acceptance,
    isPaid: Boolean(raw.paid_only || raw.is_paid_only || raw.paidOnly),
    url: `https://leetcode.com/problems/${slug}/`,
    modelAnswerType: "dsa",
  };
}

async function generateLeetCodeStyleViaAI(form: FormState): Promise<UniversalQuestion[]> {
  const raw = await callClaude(
    "Expert LeetCode interview coach. Return ONLY valid JSON array. Use real LeetCode titles and slugs only.",
    `Generate 80 real LeetCode problems for company ${form.company}, role ${form.role}, language ${form.language}. Return JSON array with id,title,slug,difficulty,topics,companies,acceptanceRate,isPaid,url.`,
    4000,
  );
  const parsed = JSON.parse(cleanJson(raw)) as unknown[];
  return parsed.map((item, index) => normalizeGeneratedCodingProblem(item, index, "leetcode", form)).filter(Boolean) as UniversalQuestion[];
}

function fireAiCategories(form: FormState, updateSource: (key: SourceKey, patch: Partial<SourceBucket>) => void) {
  (["company", "gfg", "systemDesign", "behavioral", "hr", "interviewBit"] as SourceKey[]).forEach((key) => {
    fetchAiCategory(key, form)
      .then((items) => updateSource(key, { status: "done", items, total: items.length }))
      .catch(() => {
        const items = buildAiFallback(key, form);
        updateSource(key, { status: "done", items, total: items.length, note: "Offline AI-prep fallback loaded" });
      });
  });
}

async function fetchAiCategory(key: SourceKey, form: FormState): Promise<UniversalQuestion[]> {
  const prompt = buildPromptForSource(key, form);
  const raw = await callClaude(prompt.system, prompt.user, 4000);
  const parsed = JSON.parse(cleanJson(raw)) as { questions?: unknown[] } | unknown[];
  const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
  const items = questions.map((item, index) => normalizeAiQuestion(item, index, key, form)).filter(Boolean) as UniversalQuestion[];
  return items.length ? items : buildAiFallback(key, form);
}

function buildPromptForSource(key: SourceKey, form: FormState) {
  if (key === "company") {
    return {
      system: `Expert India tech interview coach. Deep knowledge of ${form.company}'s interview process for ${form.role}. Return ONLY valid JSON. No markdown.`,
      user: `List ALL questions ever asked at ${form.company} for ${form.role} at ${form.experience} level across OA, phone screen, technical rounds, system design, behavioral, bar raiser, HR. Minimum 20 questions per type. Return {"questions":[{"id":"cq1","question":"exact question text","type":"DSA|SystemDesign|Behavioral|HR|CS","source":"${form.company} Interview","sourceIcon":"🏢","round":"OA|Phone Screen|Technical|Design|HR","difficulty":"Easy|Medium|Hard","topic":"specific topic","frequency":85,"frequencyLabel":"Asked in 85% of ${form.company} interviews","year":"2023-2026","experienceLevels":["Junior","Mid","Senior"],"whyAsked":"why ${form.company} asks this specifically"}]}`,
    };
  }
  if (key === "gfg") {
    return {
      system: "Expert in GeeksForGeeks-style CS theory questions covering DSA theory, DBMS, OS, Networks, OOP, and system concepts. Return ONLY valid JSON. No markdown.",
      user: `Generate a comprehensive GeeksForGeeks-style question bank for ${form.role} at ${form.experience}. Cover Data Structures, Algorithms, DBMS, OS, Networks, OOP, System Design Concepts, and language-specific ${form.language}. Minimum 30 questions per subject section. Return {"questions":[{"id":"gfg1","question":"exact theory question","type":"CS_Theory","source":"GeeksForGeeks Style","sourceIcon":"📗","subject":"DBMS|OS|Networks|OOP|DSA Theory|System Concepts","topic":"specific topic","difficulty":"Easy|Medium|Hard","frequency":75,"frequencyLabel":"Very frequently asked in India interviews","conceptsTested":["concept1"],"gfgArticle":"relevant article topic","followUpQuestions":["follow up"]}]}`,
    };
  }
  if (key === "systemDesign") {
    return {
      system: "Expert system design interviewer for India tech companies. Return ONLY valid JSON. No markdown.",
      user: `Generate ALL system design questions asked at ${form.company} and in India tech interviews generally for ${form.role}. Cover HLD, LLD, API Design, DB Design, Distributed Systems. Minimum 25 questions. Return {"questions":[{"id":"sd1","question":"Design system for company scale","type":"SystemDesign","subtype":"HLD|LLD|API Design|DB Design|Distributed","source":"System Design","sourceIcon":"🏗️","difficulty":"Medium|Hard","topic":"system being designed","frequency":78,"frequencyLabel":"Asked in 78% of design rounds","scaleHint":"50M users, 5000 TPS, 99.99% uptime","keyAreas":["API","Database","Cache","Queue","Scale"],"companyRelevance":"direct connection to company product","timeBreakdown":"Clarify: 5min, HLD: 20min, Deep dive: 20min","experienceLevels":["Mid","Senior"]}]}`,
    };
  }
  if (key === "behavioral") {
    return {
      system: "Expert behavioral interview coach for India tech companies. Return ONLY valid JSON. No markdown.",
      user: `Generate behavioral questions for ${form.company} ${form.role} ${form.experience}. Include STAR, leadership, conflict, ownership, Amazon leadership principles, situational judgment, failure, mentoring, ambiguity. Minimum 40 questions. Return {"questions":[{"id":"b1","question":"question text","type":"Behavioral","source":"Behavioral","sourceIcon":"🧠","difficulty":"Easy|Medium|Hard","topic":"Conflict|Leadership|Ownership|Failure","frequency":70,"frequencyLabel":"Common in behavioral rounds","round":"Manager","whyAsked":"what interviewer checks"}]}`,
    };
  }
  if (key === "hr") {
    return {
      system: "Expert HR interview coach for India tech companies. Return ONLY valid JSON. No markdown.",
      user: `Generate HR round questions for ${form.company} ${form.role}. Include company fit, salary negotiation, career goals, notice period, competing offers, culture alignment, remote preference, closing questions. Minimum 35 questions. Return {"questions":[{"id":"h1","question":"question text","type":"HR","source":"HR Round","sourceIcon":"👤","difficulty":"Easy|Medium","topic":"Company Fit|Compensation|Career Goals|Culture","frequency":90,"frequencyLabel":"Asked in almost every HR round","round":"HR","whyAsked":"what HR checks"}]}`,
    };
  }
  return {
    system: "Expert in InterviewBit-style mixed interview questions covering practical DSA and theory for India company interviews. Return ONLY valid JSON. No markdown.",
    user: `Generate InterviewBit-style mixed practice questions for ${form.company} ${form.role} at ${form.experience}. Cover Arrays, Math, Binary Search, Two Pointers, Linked List, Trees, DP, Backtracking, Graphs, Strings, Bits, Heaps. Minimum 60 problems. Return {"questions":[{"id":"ib1","question":"complete problem statement with example","type":"DSA","source":"InterviewBit Style","sourceIcon":"⚡","difficulty":"Easy|Medium|Hard","topic":"Arrays|DP|Trees|Graphs","approach":"key insight","constraints":"1 <= n <= 100000","example":"Input: [1,2,3] Output: 6","frequency":70,"frequencyLabel":"Frequently asked pattern","timeComplexityTarget":"O(n) expected","companies":["${form.company}","Razorpay","Swiggy"]}]}`,
  };
}

function normalizeAiQuestion(raw: unknown, index: number, key: SourceKey, form: FormState): UniversalQuestion | null {
  if (!isRecord(raw)) {
    return null;
  }
  const meta = SOURCE_META[key];
  const question = stringValue(raw.question) || stringValue(raw.title);
  if (!question) {
    return null;
  }
  const rawType = stringValue(raw.type);
  const title = question.length > 110 ? `${question.slice(0, 107)}...` : question;
  const difficulty = normalizeDifficulty(stringValue(raw.difficulty) || "Medium");
  const topic = stringValue(raw.topic) || stringValue(raw.subject) || meta.label;
  const topics = normalizeStringList(raw.conceptsTested || raw.topics || raw.tags);
  return {
    id: `${key}_${stringValue(raw.id) || index + 1}`,
    sourceKey: key,
    source: stringValue(raw.source) || meta.label,
    sourceIcon: stringValue(raw.sourceIcon) || sourceIconFor(key),
    title,
    question,
    kind: kindForSource(key, rawType),
    difficulty,
    topic,
    topics: topics.length ? topics : [topic],
    tags: topics.length ? topics : [topic],
    companies: normalizeStringList(raw.companies).length ? normalizeStringList(raw.companies) : [form.company],
    frequency: numberValue(raw.frequency) || frequencyForIndex(index),
    frequencyLabel: stringValue(raw.frequencyLabel) || `Asked in ${frequencyForIndex(index)}% of interviews`,
    round: stringValue(raw.round),
    year: stringValue(raw.year),
    subject: stringValue(raw.subject),
    sourceNote: stringValue(raw.whyAsked) || stringValue(raw.companyRelevance),
    keyAreas: normalizeStringList(raw.keyAreas),
    scaleHint: stringValue(raw.scaleHint),
    subtype: stringValue(raw.subtype),
    approach: stringValue(raw.approach),
    constraints: stringValue(raw.constraints),
    example: stringValue(raw.example),
    timeComplexityTarget: stringValue(raw.timeComplexityTarget),
    modelAnswerType: modelAnswerTypeFor(key),
  };
}

function buildLeetCodeFallback(form: FormState): UniversalQuestion[] {
  const titles = [
    ["Two Sum", "two-sum", "Easy", ["Array", "Hash Table"]],
    ["Add Two Numbers", "add-two-numbers", "Medium", ["Linked List", "Math"]],
    ["Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", "Medium", ["Hash Table", "Sliding Window"]],
    ["Median of Two Sorted Arrays", "median-of-two-sorted-arrays", "Hard", ["Array", "Binary Search"]],
    ["Longest Palindromic Substring", "longest-palindromic-substring", "Medium", ["String", "Dynamic Programming"]],
    ["Container With Most Water", "container-with-most-water", "Medium", ["Array", "Two Pointers"]],
    ["3Sum", "3sum", "Medium", ["Array", "Two Pointers", "Sorting"]],
    ["Valid Parentheses", "valid-parentheses", "Easy", ["String", "Stack"]],
    ["Merge Two Sorted Lists", "merge-two-sorted-lists", "Easy", ["Linked List", "Recursion"]],
    ["Generate Parentheses", "generate-parentheses", "Medium", ["String", "Backtracking"]],
    ["Search in Rotated Sorted Array", "search-in-rotated-sorted-array", "Medium", ["Array", "Binary Search"]],
    ["Trapping Rain Water", "trapping-rain-water", "Hard", ["Array", "Two Pointers", "Dynamic Programming"]],
    ["Permutations", "permutations", "Medium", ["Array", "Backtracking"]],
    ["Group Anagrams", "group-anagrams", "Medium", ["Array", "Hash Table", "String"]],
    ["Maximum Subarray", "maximum-subarray", "Medium", ["Array", "Dynamic Programming"]],
    ["Merge Intervals", "merge-intervals", "Medium", ["Array", "Sorting"]],
    ["Unique Paths", "unique-paths", "Medium", ["Math", "Dynamic Programming"]],
    ["Climbing Stairs", "climbing-stairs", "Easy", ["Math", "Dynamic Programming"]],
    ["Set Matrix Zeroes", "set-matrix-zeroes", "Medium", ["Array", "Matrix"]],
    ["Minimum Window Substring", "minimum-window-substring", "Hard", ["Hash Table", "String", "Sliding Window"]],
    ["Word Search", "word-search", "Medium", ["Array", "Backtracking", "Matrix"]],
    ["Largest Rectangle in Histogram", "largest-rectangle-in-histogram", "Hard", ["Array", "Stack", "Monotonic Stack"]],
    ["Binary Tree Inorder Traversal", "binary-tree-inorder-traversal", "Easy", ["Stack", "Tree", "DFS"]],
    ["Validate Binary Search Tree", "validate-binary-search-tree", "Medium", ["Tree", "DFS", "Binary Search Tree"]],
    ["Symmetric Tree", "symmetric-tree", "Easy", ["Tree", "DFS", "BFS"]],
    ["Binary Tree Level Order Traversal", "binary-tree-level-order-traversal", "Medium", ["Tree", "BFS"]],
    ["Maximum Depth of Binary Tree", "maximum-depth-of-binary-tree", "Easy", ["Tree", "DFS"]],
    ["Construct Binary Tree from Preorder and Inorder Traversal", "construct-binary-tree-from-preorder-and-inorder-traversal", "Medium", ["Array", "Hash Table", "Tree"]],
    ["Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Easy", ["Array", "Dynamic Programming"]],
    ["Longest Consecutive Sequence", "longest-consecutive-sequence", "Medium", ["Array", "Hash Table", "Union Find"]],
    ["Palindrome Partitioning", "palindrome-partitioning", "Medium", ["String", "Dynamic Programming", "Backtracking"]],
    ["Clone Graph", "clone-graph", "Medium", ["Hash Table", "Graph", "BFS"]],
    ["Word Break", "word-break", "Medium", ["Hash Table", "String", "Dynamic Programming"]],
    ["LRU Cache", "lru-cache", "Medium", ["Hash Table", "Linked List", "Design"]],
    ["Sort List", "sort-list", "Medium", ["Linked List", "Two Pointers", "Sorting"]],
    ["Maximum Product Subarray", "maximum-product-subarray", "Medium", ["Array", "Dynamic Programming"]],
    ["Find Minimum in Rotated Sorted Array", "find-minimum-in-rotated-sorted-array", "Medium", ["Array", "Binary Search"]],
    ["Number of Islands", "number-of-islands", "Medium", ["Array", "DFS", "BFS", "Union Find"]],
    ["Course Schedule", "course-schedule", "Medium", ["DFS", "BFS", "Graph", "Topological Sort"]],
    ["Implement Trie", "implement-trie-prefix-tree", "Medium", ["Hash Table", "String", "Trie", "Design"]],
  ] as const;
  return Array.from({ length: 3 }).flatMap((_, round) =>
    titles.map(([title, slug, difficulty, topics], index) => ({
      id: `lc_fallback_${round}_${index}`,
      sourceKey: "leetcode" as const,
      source: "LeetCode",
      sourceIcon: "💻",
      title,
      question: title,
      kind: "DSA" as const,
      difficulty: difficulty as Difficulty,
      topic: topics[0],
      topics: [...topics],
      tags: [...topics],
      companies: inferCompaniesForProblem(title, form.company),
      number: round * titles.length + index + 1,
      slug,
      acceptanceRate: 35 + ((index * 7) % 45),
      isPaid: index % 11 === 0,
      url: `https://leetcode.com/problems/${slug}/`,
      modelAnswerType: "dsa" as const,
    })),
  );
}

function buildAiFallback(key: SourceKey, form: FormState): UniversalQuestion[] {
  if (key === "interviewBit") {
    return buildInterviewBitFallback(form);
  }
  const builders: Record<Exclude<SourceKey, "leetcode" | "codeforces" | "interviewBit">, () => UniversalQuestion[]> = {
    company: () => buildCompanyFallback(form),
    gfg: () => buildGfgFallback(form),
    systemDesign: () => buildSystemFallback(form),
    behavioral: () => buildBehavioralFallback(form),
    hr: () => buildHrFallback(form),
  };
  if (key === "leetcode" || key === "codeforces") {
    return [];
  }
  return builders[key]();
}

function buildCompanyFallback(form: FormState): UniversalQuestion[] {
  const profile = companyProfile(form.company);
  const questions: Array<[string, string, string, Difficulty]> = [
    ["Design the core product workflow for company scale", "SystemDesign", "Design", "Hard"],
    ["Implement LRU Cache with O(1) get and put", "DSA", "Design", "Medium"],
    ["Why do you want to join this company?", "HR", "Company Fit", "Easy"],
    ["Explain consistent hashing and why it matters for sharding", "CS", "Distributed Systems", "Medium"],
    ["Debug a sudden latency spike in checkout or transaction flow", "CS", "Observability", "Hard"],
    ["Find longest substring without repeating characters", "DSA", "Sliding Window", "Medium"],
    ["Design a notification service with retries and deduplication", "SystemDesign", "Notifications", "Medium"],
    ["Tell me about a disagreement with your manager", "Behavioral", "Conflict", "Medium"],
    ["Explain DB transaction isolation levels with examples", "CS", "DBMS", "Medium"],
    ["Design an idempotency system for critical writes", "SystemDesign", "Idempotency", "Hard"],
    ["Solve minimum window substring", "DSA", "Sliding Window", "Hard"],
    ["Tell me about a production issue you owned end to end", "Behavioral", "Ownership", "Medium"],
    ["Explain process vs thread and context switching", "CS", "Operating Systems", "Easy"],
    ["Design rate limiter for public APIs", "SystemDesign", "Rate Limiting", "Hard"],
    ["What compensation range are you targeting?", "HR", "Compensation", "Easy"],
    ["Find shortest path with weighted graph constraints", "DSA", "Graphs", "Medium"],
    ["Explain indexes and query optimization", "CS", "DBMS", "Medium"],
    ["Design fraud detection pipeline", "SystemDesign", "Fraud", "Hard"],
    ["Tell me about feedback that changed your working style", "Behavioral", "Growth", "Medium"],
    ["Where do you see yourself in 2 years?", "HR", "Career Goals", "Easy"],
  ];
  return questions.flatMap((base, round) => Array.from({ length: 3 }).map((_, copy) => makeAiItem("company", form, `${round}_${copy}`, `${base[0]} for ${profile.domain}`, base[1], base[2], base[3])));
}

function buildGfgFallback(form: FormState): UniversalQuestion[] {
  const subjects: Array<[string, string]> = [
    ["Array rotation, prefix sums, and two-pointer patterns", "DSA Theory"],
    ["Linked list reversal, cycle detection, and merge operations", "DSA Theory"],
    ["Stack and queue applications in parsing and scheduling", "DSA Theory"],
    ["BST, heap, trie, segment tree, and Fenwick tree operations", "DSA Theory"],
    ["Dijkstra, Bellman-Ford, Floyd-Warshall, Prim, Kruskal", "Algorithms"],
    ["Dynamic programming patterns: knapsack, LIS, grid, interval DP", "Algorithms"],
    ["Normalization, ACID, joins, indexing, deadlocks", "DBMS"],
    ["Process vs thread, scheduling, paging, semaphores, mutex", "Operating Systems"],
    ["OSI, TCP handshake, DNS, HTTP2, TLS, load balancers", "Networks"],
    ["SOLID, design patterns, inheritance, polymorphism, abstraction", "OOP"],
    ["CAP theorem, caching, sharding, replication, message queues", "System Concepts"],
    [`${form.language} runtime, performance, debugging, memory model`, "Language Specific"],
  ];
  return subjects.flatMap(([topic, subject], subjectIndex) =>
    Array.from({ length: 10 }).map((_, index) => makeAiItem("gfg", form, `${subjectIndex}_${index}`, `Explain ${topic}. What are the common interview follow-ups and edge cases?`, "CS_Theory", topic, index % 3 === 0 ? "Hard" : index % 2 === 0 ? "Medium" : "Easy", subject)),
  );
}

function buildSystemFallback(form: FormState): UniversalQuestion[] {
  const profile = companyProfile(form.company);
  const systems = [
    "payment gateway",
    "UPI transfer system",
    "food delivery ETA system",
    "real-time order tracking",
    "inventory management for dark stores",
    "supplier marketplace catalog",
    "search ranking system",
    "recommendation engine",
    "notification platform",
    "fraud detection pipeline",
    "rate limiter",
    "webhook delivery service",
    "wallet ledger",
    "refund reconciliation system",
    "ride matching and surge pricing",
    "chat and support system",
    "analytics dashboard",
    "multi-tenant SaaS CRM",
    "feature flag platform",
    "audit logging system",
    "file upload and virus scanning service",
    "URL shortener at India scale",
    "leaderboard system",
    "stock trading order book viewer",
    "A/B experimentation platform",
  ];
  return systems.map((system, index) => ({
    ...makeAiItem("systemDesign", form, `${index}`, `Design a ${system} for ${form.company} with ${profile.scale}.`, "SystemDesign", system, index % 3 === 0 ? "Hard" : "Medium"),
    scaleHint: profile.scale,
    keyAreas: ["API", "Database", "Cache", "Queue", "Scale", "Observability"],
    subtype: index % 5 === 0 ? "LLD" : index % 4 === 0 ? "API Design" : "HLD",
  }));
}

function buildBehavioralFallback(form: FormState): UniversalQuestion[] {
  const topics = ["Conflict", "Leadership", "Ownership", "Failure", "Ambiguity", "Mentoring", "Pressure", "Customer Obsession", "Bias for Action", "Dive Deep"];
  return Array.from({ length: 50 }).map((_, index) => {
    const topic = topics[index % topics.length] || "Behavioral";
    return makeAiItem("behavioral", form, `${index}`, behavioralQuestion(topic, form.company, index), "Behavioral", topic, index % 4 === 0 ? "Hard" : "Medium");
  });
}

function buildHrFallback(form: FormState): UniversalQuestion[] {
  const topics = ["Company Fit", "Role Fit", "Compensation", "Career Goals", "Culture", "Notice Period", "Competing Offers", "Remote Preference", "Relocation", "Closing"];
  return Array.from({ length: 42 }).map((_, index) => {
    const topic = topics[index % topics.length] || "HR";
    return makeAiItem("hr", form, `${index}`, hrQuestion(topic, form.company, form.role), "HR", topic, index % 5 === 0 ? "Medium" : "Easy");
  });
}

function buildInterviewBitFallback(form: FormState): UniversalQuestion[] {
  const topics = ["Arrays", "Math", "Binary Search", "Two Pointers", "Linked List", "Trees", "Dynamic Programming", "Backtracking", "Graphs", "Strings", "Bit Manipulation", "Heaps"];
  return Array.from({ length: 96 }).map((_, index) => {
    const topic = topics[index % topics.length] || "Arrays";
    const title = `${topic} insight problem ${index + 1}`;
    return {
      ...makeAiItem("interviewBit", form, `${index}`, `Given an input constrained around ${topic}, write the optimal solution, explain the edge cases, and compare brute force with the expected approach. Example: Input size up to 100000, output the best valid score or arrangement.`, "DSA", topic, index % 7 === 0 ? "Hard" : index % 3 === 0 ? "Easy" : "Medium"),
      title,
      approach: `Use the core ${topic} invariant and reduce repeated work.`,
      constraints: "1 <= n <= 100000",
      example: "Input: [1,2,3] Output: depends on objective",
      timeComplexityTarget: index % 4 === 0 ? "O(n log n)" : "O(n)",
    };
  });
}

function makeAiItem(key: SourceKey, form: FormState, id: string, question: string, type: string, topic: string, difficulty: Difficulty, subject?: string): UniversalQuestion {
  const meta = SOURCE_META[key];
  const item: UniversalQuestion = {
    id: `${key}_${id}`,
    sourceKey: key,
    source: key === "company" ? `${form.company} Interview` : meta.label,
    sourceIcon: sourceIconFor(key),
    title: question.length > 110 ? `${question.slice(0, 107)}...` : question,
    question,
    kind: kindForSource(key, type),
    difficulty,
    topic,
    topics: [topic],
    tags: [topic],
    companies: [form.company],
    frequency: frequencyForIndex(Number(id.split("_").pop()) || 0),
    frequencyLabel: `Asked in ${frequencyForIndex(Number(id.split("_").pop()) || 0)}% of interviews`,
    round: roundForKind(kindForSource(key, type)),
    year: "2023-2026",
    sourceNote: `Relevant for ${form.company} ${form.role} hiring in India.`,
    modelAnswerType: modelAnswerTypeFor(key),
  };
  if (subject) {
    item.subject = subject;
  }
  return item;
}

async function fetchAiHint(item: UniversalQuestion): Promise<Hint> {
  const raw = await callClaude(
    "You give concise coding hints without revealing the full solution. Return ONLY valid JSON.",
    `Give a helpful hint for this coding problem without revealing the full solution. Just the key insight and approach direction.
Problem: ${item.title}
Type: ${[...item.tags, ...item.topics].join(", ")}
Return JSON: {"hint":"","keyInsight":"","timeComplexity":"","approach":""}`,
    1000,
  );
  return JSON.parse(cleanJson(raw)) as Hint;
}

async function fetchAiAnswer(item: UniversalQuestion, form: FormState): Promise<Answer> {
  const raw = await callClaude(
    "You are a senior India tech interview coach. Return complete self-contained model answers as JSON only.",
    `Company: ${form.company}
Role: ${form.role}
Question type: ${item.kind}
Question: ${item.question}
Return JSON: {"summary":"","sections":[{"title":"","body":""}]}.
For HR return HR answer only. For behavioral use STAR only. For system design use architecture and trade-offs. For CS theory use definition, mechanics, example, follow-ups. For DSA use approach, algorithm, pseudocode, complexity, edge cases.`,
    1600,
  );
  return JSON.parse(cleanJson(raw)) as Answer;
}

async function callClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const response = await fetch(CLAUDE_PROXY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!response.ok) {
    throw new Error("Claude API failed");
  }
  const data = await response.json() as { content?: Array<{ text?: string }> };
  return (data.content || []).map((block) => block.text || "").join("");
}

function buildHintFallback(item: UniversalQuestion): Hint {
  const topic = item.topic || item.tags[0] || "the core pattern";
  return {
    hint: `Start by identifying the invariant for ${topic}. Avoid jumping to code before you know what state must be preserved after each step.`,
    keyInsight: `The optimized solution usually removes repeated work by storing just enough state to answer the next decision quickly.`,
    timeComplexity: item.rating && item.rating > 1900 ? "Target O(n log n) or better with careful data structures." : "Target O(n) or O(n log n), depending on whether sorting is required.",
    approach: "Explain brute force in one sentence, then state the optimized data structure, walk through one example, and close with edge cases.",
  };
}

function buildAnswerFallback(item: UniversalQuestion, form: FormState): Answer {
  if (item.kind === "System Design") {
    return {
      summary: `A strong answer for ${form.company} starts with scale, consistency requirements, and the product invariant that must never break.`,
      sections: [
        { title: "Clarifying questions", body: ["Expected DAU, peak TPS, geography, and latency SLO", "Which writes require strong consistency", "Scope for MVP versus deep dive"] },
        { title: "High-level architecture", body: "Client -> API Gateway -> Domain services -> Redis cache -> Primary relational store -> Kafka -> workers -> analytics and alerting." },
        { title: "Trade-offs", body: ["Use strong consistency for critical state", "Use async queues for notifications and analytics", "Partition by entity ID where ordering matters"] },
      ],
    };
  }
  if (item.kind === "Behavioral") {
    return {
      summary: "Use a concrete STAR story with personal ownership and a measurable result.",
      sections: [
        { title: "Situation", body: `In a previous team, we faced a delivery or reliability problem similar to ${form.company}'s pace and customer expectations.` },
        { title: "Task", body: "I needed to align stakeholders and protect both delivery speed and engineering quality." },
        { title: "Action", body: "I wrote a short decision note, owned the riskiest technical part, communicated trade-offs clearly, and added monitoring so the team could release safely." },
        { title: "Result", body: "We shipped with fewer regressions, improved team trust, and I learned to turn disagreement into a data-backed decision." },
      ],
    };
  }
  if (item.kind === "HR") {
    return {
      summary: `A good HR answer should sound specific to ${form.company}, practical, and confident.`,
      sections: [
        { title: "Sample answer", body: `I am interested in ${form.company} because the role combines meaningful product impact with strong engineering execution. For this ${form.role} role, I can bring structured problem solving, ownership, and a willingness to work deeply on customer-facing systems. I am looking for a team where I can contribute quickly, learn from high-quality peers, and build reliable products for the Indian market.` },
        { title: "Key points", body: ["Mention company-specific product interest", "Connect your experience to the role", "Sound intentional about the move"] },
        { title: "Avoid", body: "Do not say salary, brand name, or remote work is the only reason." },
      ],
    };
  }
  if (item.kind === "CS Theory") {
    return {
      summary: "Give a precise definition, then explain mechanics and production relevance.",
      sections: [
        { title: "Definition", body: `${item.topic} is a core CS concept used to reason about correctness, performance, and reliability.` },
        { title: "How it works", body: ["Define the guarantee", "Explain implementation choices", "Mention cost and failure modes", "Use one production example"] },
        { title: "Example", body: `At ${form.company}, this matters when latency, consistency, or scale affects customer-visible flows.` },
      ],
    };
  }
  return {
    summary: "A complete coding answer should include approach, algorithm, pseudocode, complexity, and edge cases.",
    sections: [
      { title: "Approach", body: `Use the ${item.topic} pattern. State brute force first, then the optimized invariant.` },
      { title: "Algorithm", body: ["Parse input and constraints", "Initialize the right state", "Iterate while preserving the invariant", "Update answer and return"] },
      { title: "Complexity", body: item.timeComplexityTarget || "Target O(n) or O(n log n), with O(n) auxiliary space when maps or DP are needed." },
    ],
  };
}

function filterItems(items: UniversalQuestion[], filters: FilterState, bookmarks: Set<string>, practiced: Set<string>, activeTab: SourceKey): UniversalQuestion[] {
  const search = filters.search.toLowerCase().trim();
  return items.filter((item) => {
    if (search) {
      const haystack = `${item.title} ${item.question} ${item.topic} ${item.tags.join(" ")} ${item.companies.join(" ")}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    if (filters.difficulty !== "All" && item.difficulty !== filters.difficulty) {
      return false;
    }
    if (filters.topic !== "all" && ![item.topic, ...item.topics, ...item.tags].some((topic) => topic.toLowerCase() === filters.topic.toLowerCase())) {
      return false;
    }
    if (filters.source !== "all" && item.sourceKey !== filters.source) {
      return false;
    }
    if (filters.onlyFree && item.isPaid) {
      return false;
    }
    if (filters.bookmarkedOnly && !bookmarks.has(item.id)) {
      return false;
    }
    if (filters.hidePracticed && practiced.has(item.id)) {
      return false;
    }
    if ((activeTab === "leetcode" || item.sourceKey === "leetcode") && filters.lcStatus !== "all") {
      if (filters.lcStatus === "free" && item.isPaid) {
        return false;
      }
      if (filters.lcStatus === "premium" && !item.isPaid) {
        return false;
      }
    }
    if ((activeTab === "leetcode" || item.sourceKey === "leetcode") && filters.lcCompany !== "all" && item.companies.length) {
      if (!item.companies.some((company) => company.toLowerCase().includes(filters.lcCompany.toLowerCase()))) {
        return false;
      }
    }
    if ((activeTab === "codeforces" || item.sourceKey === "codeforces") && item.rating) {
      if (item.rating < filters.cfMinRating || item.rating > filters.cfMaxRating) {
        return false;
      }
      if (filters.cfTags.length && !filters.cfTags.some((tag) => item.tags.includes(tag))) {
        return false;
      }
    }
    return true;
  });
}

function sortItems(items: UniversalQuestion[], filters: FilterState, activeTab: SourceKey): UniversalQuestion[] {
  const next = [...items];
  if (activeTab === "codeforces") {
    if (filters.cfSort === "rating") {
      return next.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }
    if (filters.cfSort === "contest") {
      return next.sort((a, b) => (b.number || 0) - (a.number || 0));
    }
    return next.sort((a, b) => (b.solvedCount || 0) - (a.solvedCount || 0));
  }
  if (activeTab === "leetcode") {
    if (filters.lcSort === "difficulty") {
      return next.sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty));
    }
    if (filters.lcSort === "acceptance") {
      return next.sort((a, b) => (b.acceptanceRate || 0) - (a.acceptanceRate || 0));
    }
    if (filters.lcSort === "number") {
      return next.sort((a, b) => (a.number || 0) - (b.number || 0));
    }
  }
  return next.sort((a, b) => (b.frequency || b.solvedCount || 0) - (a.frequency || a.solvedCount || 0));
}

function buildMockQuestions(items: UniversalQuestion[], config: MockConfig): UniversalQuestion[] {
  const lc = items.filter((item) => item.sourceKey === "leetcode");
  const cf = items.filter((item) => item.sourceKey === "codeforces");
  const ai = items.filter((item) => item.sourceKey !== "leetcode" && item.sourceKey !== "codeforces");
  const difficultyFilter = (item: UniversalQuestion) => {
    if (config.difficulty === "Mixed") {
      return true;
    }
    if (config.difficulty === "Hard") {
      return item.difficulty === "Hard" || item.difficulty === "Expert";
    }
    return item.difficulty === "Easy";
  };
  const total = config.totalQuestions;
  const lcCount = Math.round((total * config.leetcodePercent) / 100);
  const cfCount = Math.round((total * config.codeforcesPercent) / 100);
  const aiCount = Math.max(0, total - lcCount - cfCount);
  return [
    ...lc.filter(difficultyFilter).slice(0, lcCount),
    ...cf.filter(difficultyFilter).slice(0, cfCount),
    ...ai.filter(difficultyFilter).slice(0, aiCount),
  ].slice(0, total);
}

function evaluateMock(state: MockState) {
  const answers = Object.entries(state.answers).filter(([, answer]) => answer.trim().length > 0);
  const attemptedRatio = state.questions.length ? answers.length / state.questions.length : 0;
  const averageWords = answers.length ? answers.reduce((sum, [, answer]) => sum + countWords(answer), 0) / answers.length : 0;
  const structureBonus = answers.filter(([, answer]) => /complexity|trade.?off|star|situation|approach|because|scale/i.test(answer)).length;
  const score = Math.min(100, Math.round(attemptedRatio * 55 + Math.min(25, averageWords / 4) + structureBonus * 4));
  return {
    score,
    feedback: [
      `You attempted ${answers.length} of ${state.questions.length} questions and skipped ${state.skipped.size}.`,
      averageWords > 80 ? "Your answers had enough depth for meaningful evaluation." : "Add more detail: constraints, trade-offs, examples, and outcomes.",
      structureBonus >= Math.max(1, answers.length / 2) ? "Good use of structured signals such as approach, complexity, STAR, or trade-offs." : "Use explicit structure in every answer so the interviewer can follow your thinking.",
      "Review all coding links and rewrite weak theory answers using definition, mechanics, example, and follow-ups.",
    ],
  };
}

async function evaluateMockWithAI(state: MockState): Promise<{ score: number; feedback: string[] }> {
  const localReport = evaluateMock(state);
  const sample = state.questions.slice(0, 12).map((question, index) => ({
    number: index + 1,
    source: question.source,
    difficulty: question.difficulty,
    kind: question.kind,
    question: question.question,
    answer: state.answers[question.id] || "",
    skipped: state.skipped.has(question.id),
  }));
  const raw = await callClaude(
    "You are a strict but constructive mock interview evaluator. Return ONLY valid JSON.",
    `Evaluate this timed mock interview. Score coding answers for approach, complexity, edge cases, and clarity. Score theory, HR, and behavioral answers for structure, specificity, and interview readiness. Return JSON: {"score":0,"feedback":["specific improvement"]}. Questions: ${JSON.stringify(sample)}`,
    1800,
  );
  const parsed = JSON.parse(cleanJson(raw)) as {
    score?: unknown;
    feedback?: unknown;
    goodPoints?: unknown;
    missingPoints?: unknown;
    modelAnswer?: unknown;
    nextTip?: unknown;
    summary?: unknown;
  };
  const feedback = [
    ...normalizeStringList(parsed.feedback),
    ...normalizeStringList(parsed.goodPoints).map((point) => `Strength: ${point}`),
    ...normalizeStringList(parsed.missingPoints).map((point) => `Improve: ${point}`),
    stringValue(parsed.summary),
    stringValue(parsed.modelAnswer) ? `Model-answer signal: ${stringValue(parsed.modelAnswer)}` : "",
    stringValue(parsed.nextTip) ? `Next drill: ${stringValue(parsed.nextTip)}` : "",
  ].filter(Boolean);
  return {
    score: Math.max(0, Math.min(100, numberValue(parsed.score) || localReport.score)),
    feedback: feedback.length ? feedback.slice(0, 8) : localReport.feedback,
  };
}

function ratingToDifficulty(rating?: number): Difficulty {
  if (!rating) {
    return "Unknown";
  }
  if (rating <= 1000) {
    return "Easy";
  }
  if (rating <= 1600) {
    return "Medium";
  }
  if (rating <= 2200) {
    return "Hard";
  }
  return "Expert";
}

function normalizeDifficulty(value: string): Difficulty {
  const lower = value.toLowerCase();
  if (lower.includes("easy")) {
    return "Easy";
  }
  if (lower.includes("hard")) {
    return "Hard";
  }
  if (lower.includes("expert")) {
    return "Expert";
  }
  if (lower.includes("unknown")) {
    return "Unknown";
  }
  return "Medium";
}

function difficultyRank(difficulty: Difficulty) {
  return { All: 0, Easy: 1, Medium: 2, Hard: 3, Expert: 4, Unknown: 5 }[difficulty];
}

function frequencyForIndex(index: number) {
  return Math.max(45, 92 - (index % 30));
}

function frequencyClass(frequency: number) {
  if (frequency > 75) {
    return "iai-frequency iai-hot";
  }
  if (frequency >= 50) {
    return "iai-frequency iai-warm";
  }
  return "iai-frequency iai-normal";
}

function kindForSource(key: SourceKey, type: string): QuestionKind {
  if (key === "systemDesign" || type.toLowerCase().includes("system")) {
    return "System Design";
  }
  if (key === "behavioral" || type.toLowerCase().includes("behavioral")) {
    return "Behavioral";
  }
  if (key === "hr" || type.toLowerCase() === "hr") {
    return "HR";
  }
  if (key === "gfg" || type.toLowerCase().includes("cs")) {
    return "CS Theory";
  }
  if (key === "codeforces") {
    return "Competitive Programming";
  }
  return "DSA";
}

function modelAnswerTypeFor(key: SourceKey): NonNullable<UniversalQuestion["modelAnswerType"]> {
  if (key === "systemDesign") {
    return "system";
  }
  if (key === "behavioral") {
    return "behavioral";
  }
  if (key === "hr") {
    return "hr";
  }
  if (key === "gfg") {
    return "cs";
  }
  return "dsa";
}

function roundForKind(kind: QuestionKind) {
  if (kind === "System Design") {
    return "Design";
  }
  if (kind === "Behavioral") {
    return "Manager";
  }
  if (kind === "HR") {
    return "HR";
  }
  if (kind === "CS Theory") {
    return "Technical";
  }
  return "OA";
}

function sourceIconFor(key: SourceKey) {
  return { company: "🏢", leetcode: "💻", codeforces: "🏆", gfg: "📗", interviewBit: "⚡", systemDesign: "🏗️", behavioral: "🧠", hr: "👤" }[key];
}

function companyProfile(company: string) {
  const lower = company.toLowerCase();
  if (lower.includes("razorpay") || lower.includes("phonepe") || lower.includes("paytm") || lower.includes("cred") || lower.includes("jupiter")) {
    return { domain: "payments, wallets, ledgers, fraud, reconciliation", scale: "50M users, 5000 TPS, strict financial consistency" };
  }
  if (lower.includes("swiggy") || lower.includes("zomato") || lower.includes("zepto") || lower.includes("blinkit")) {
    return { domain: "delivery, ETA, inventory, tracking, city operations", scale: "100M users, city-level spikes, real-time logistics" };
  }
  if (lower.includes("meesho") || lower.includes("flipkart") || lower.includes("amazon") || lower.includes("myntra")) {
    return { domain: "marketplace, catalog, pricing, search, recommendations, logistics", scale: "100M shoppers, massive catalog, sale-day traffic" };
  }
  if (lower.includes("google") || lower.includes("microsoft") || lower.includes("meta") || lower.includes("apple")) {
    return { domain: "large-scale distributed systems, cloud, search, ads, developer platforms", scale: "global users, billions of requests, strong reliability SLOs" };
  }
  if (lower.includes("infosys") || lower.includes("tcs") || lower.includes("wipro") || lower.includes("accenture")) {
    return { domain: "enterprise client delivery, modernization, banking, retail systems", scale: "large enterprise accounts, SLA-driven delivery" };
  }
  return { domain: "India startup product, growth systems, customer-facing workflows", scale: "10M users, 1000 TPS, cost-aware reliability" };
}

function behavioralQuestion(topic: string, company: string, index: number) {
  const templates = [
    `Tell me about a time you handled ${topic.toLowerCase()} while working with a difficult stakeholder.`,
    `Describe a situation where ${topic.toLowerCase()} mattered more than raw technical skill.`,
    `Give an example of ${topic.toLowerCase()} in a high-pressure delivery for a ${company}-like product.`,
    `Tell me about a time your judgment around ${topic.toLowerCase()} changed after feedback.`,
  ];
  return templates[index % templates.length] || templates[0] || "Tell me about a challenging work situation.";
}

function hrQuestion(topic: string, company: string, role: string) {
  if (topic === "Company Fit") {
    return `Why ${company}, and what do you know about our product and market?`;
  }
  if (topic === "Role Fit") {
    return `Why is ${role} the right next step for you now?`;
  }
  if (topic === "Compensation") {
    return "What are your compensation expectations and how flexible are you?";
  }
  if (topic === "Career Goals") {
    return "Where do you see yourself in the next 2 to 3 years?";
  }
  if (topic === "Culture") {
    return "What work culture helps you do your best work?";
  }
  if (topic === "Notice Period") {
    return "What is your notice period and earliest joining date?";
  }
  if (topic === "Competing Offers") {
    return "Do you have competing offers or other interview processes running?";
  }
  if (topic === "Remote Preference") {
    return "What is your preference between office, hybrid, and remote work?";
  }
  if (topic === "Relocation") {
    return "Are you open to relocation for this role?";
  }
  return "What questions do you have for us?";
}

function normalizeGeneratedCodingProblem(raw: unknown, index: number, key: SourceKey, form: FormState): UniversalQuestion | null {
  if (!isRecord(raw)) {
    return null;
  }
  const title = stringValue(raw.title) || stringValue(raw.question);
  if (!title) {
    return null;
  }
  const slug = stringValue(raw.slug) || slugify(title);
  const topics = normalizeStringList(raw.topics || raw.tags);
  return {
    id: `${key}_gen_${index}_${slug}`,
    sourceKey: key,
    source: key === "leetcode" ? "LeetCode Style" : SOURCE_META[key].label,
    sourceIcon: sourceIconFor(key),
    title,
    question: stringValue(raw.description) || stringValue(raw.question) || title,
    kind: "DSA",
    difficulty: normalizeDifficulty(stringValue(raw.difficulty) || "Medium"),
    topic: topics[0] || "DSA",
    topics,
    tags: topics,
    companies: normalizeStringList(raw.companies).length ? normalizeStringList(raw.companies) : [form.company],
    acceptanceRate: numberValue(raw.acceptanceRate),
    isPaid: Boolean(raw.isPaid),
    slug,
    url: stringValue(raw.url) || `https://leetcode.com/problems/${slug}/`,
    modelAnswerType: "dsa",
  };
}

function inferTopicsForProblem(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("tree")) {
    return ["Tree", "DFS"];
  }
  if (lower.includes("substring") || lower.includes("window")) {
    return ["String", "Sliding Window"];
  }
  if (lower.includes("graph") || lower.includes("island") || lower.includes("course")) {
    return ["Graph", "BFS", "DFS"];
  }
  if (lower.includes("stock") || lower.includes("path") || lower.includes("palindrome")) {
    return ["Dynamic Programming"];
  }
  if (lower.includes("search") || lower.includes("sorted")) {
    return ["Binary Search"];
  }
  return ["Array", "Hash Table"];
}

function inferCompaniesForProblem(title: string, selected: string) {
  const pool = [selected, "Amazon India", "Google India", "Microsoft India", "Razorpay", "Swiggy", "PhonePe", "Flipkart", "CRED"];
  const count = Math.max(2, Math.min(5, (title.length % 5) + 1));
  return unique(pool).slice(0, count);
}

function parseStatsAcceptance(value: unknown) {
  if (!isRecord(value)) {
    return 0;
  }
  const accepted = numberValue(value.totalAcceptedRaw) || numberValue(value.total_acs);
  const submitted = numberValue(value.totalSubmissionRaw) || numberValue(value.total_submitted);
  return submitted ? Math.round((accepted / submitted) * 1000) / 10 : 0;
}

function normalizeStringList(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isRecord(item)) {
        return stringValue(item.name) || stringValue(item.slug) || stringValue(item.title);
      }
      return stringValue(item);
    }).filter(Boolean);
  }
  const text = stringValue(value);
  return text ? text.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function formatPercent(value: number) {
  if (!value) {
    return "n/a";
  }
  if (value > 1000) {
    return `${Math.round(value / 100)} acs`;
  }
  return `${Math.round(value * 10) / 10}%`;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cleanJson(raw: string) {
  return raw.replace(/```json|```/g, "").trim();
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function withEverySource(patch: Partial<SourceBucket>): SourcesState {
  return {
    company: { ...EMPTY_SOURCES.company, ...patch },
    leetcode: { ...EMPTY_SOURCES.leetcode, ...patch },
    codeforces: { ...EMPTY_SOURCES.codeforces, ...patch },
    gfg: { ...EMPTY_SOURCES.gfg, ...patch },
    interviewBit: { ...EMPTY_SOURCES.interviewBit, ...patch },
    systemDesign: { ...EMPTY_SOURCES.systemDesign, ...patch },
    behavioral: { ...EMPTY_SOURCES.behavioral, ...patch },
    hr: { ...EMPTY_SOURCES.hr, ...patch },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : typeof value === "string" ? Number(value) || 0 : 0;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

const CSS = `
.iai-shell {
  --color-background-primary: var(--background);
  --color-background-secondary: var(--surface-muted);
  --color-text-primary: var(--foreground);
  --color-text-secondary: var(--muted-foreground);
  --color-border-tertiary: var(--border);
  --color-background-success: color-mix(in srgb, var(--success) 14%, var(--surface));
  --color-text-success: var(--success);
  --color-background-warning: color-mix(in srgb, var(--warning) 14%, var(--surface));
  --color-text-warning: var(--warning);
  --color-background-danger: color-mix(in srgb, var(--danger) 14%, var(--surface));
  --color-text-danger: var(--danger);
  --color-background-info: color-mix(in srgb, var(--accent) 14%, var(--surface));
  --color-text-info: var(--accent);
  --color-background-orange: color-mix(in srgb, var(--warning) 18%, var(--surface));
  --color-text-orange: var(--warning);
  --color-background-blue: color-mix(in srgb, var(--accent) 18%, var(--surface));
  --color-text-blue: var(--accent);
  --color-background-green: color-mix(in srgb, var(--success) 18%, var(--surface));
  --color-text-green: var(--success);
  --color-background-purple: color-mix(in srgb, var(--accent) 16%, var(--surface));
  --color-text-purple: var(--accent);
  --color-background-amber: color-mix(in srgb, var(--warning) 15%, var(--surface));
  --color-text-amber: var(--warning);
  --color-background-pink: color-mix(in srgb, var(--danger) 13%, var(--surface));
  --color-text-pink: var(--danger);
  --border-radius-md: 8px;
  min-height: 100vh;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}
.iai-shell * {
  box-sizing: border-box;
  letter-spacing: 0;
}
.iai-container {
  width: min(1240px, calc(100vw - 28px));
  margin: 0 auto;
  padding: 22px 0 48px;
}
.iai-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.iai-logo {
  width: 44px;
  height: 44px;
  border-radius: var(--border-radius-md);
  display: grid;
  place-items: center;
  background: var(--color-background-info);
  color: var(--color-text-info);
  border: 0.5px solid var(--color-border-tertiary);
  font-size: 22px;
}
.iai-header h1,
.iai-panel h2,
.iai-mock h2 {
  margin: 2px 0 0;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 500;
}
.iai-kicker,
.iai-section-label {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 850;
}
.iai-counter {
  margin-left: auto;
  min-width: 150px;
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--surface);
  border-radius: var(--border-radius-md);
  padding: 10px 12px;
  display: grid;
  gap: 2px;
  text-align: right;
}
.iai-counter strong {
  font-size: 22px;
  line-height: 1;
  color: var(--color-text-info);
}
.iai-counter span {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 800;
}
.iai-panel,
.iai-question-card,
.iai-loading-panel,
.iai-empty,
.iai-mock {
  background: var(--surface);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
}
.iai-input {
  padding: 16px;
  margin-bottom: 12px;
}
.iai-panel-head,
.iai-card-top,
.iai-card-actions,
.iai-tool-row,
.iai-rating-row,
.iai-preset-row,
.iai-mock-head,
.iai-mock-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.iai-panel-head,
.iai-mock-head,
.iai-mock-actions {
  justify-content: space-between;
}
.iai-icon-btn,
.iai-icon-action,
.iai-secondary-btn,
.iai-primary-btn,
.iai-link-btn,
.iai-toggle,
.iai-preset-row button,
.iai-tag-cloud button {
  min-height: 38px;
  border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 11px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  text-decoration: none;
}
.iai-primary-btn,
.iai-generate {
  border: 0;
  background: var(--color-text-info);
  color: var(--color-background-primary);
}
.iai-generate {
  width: 100%;
  min-height: 44px;
  margin-top: 14px;
  border-radius: var(--border-radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 900;
}
.iai-generate:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}
.iai-wide {
  width: 100%;
}
.iai-form-grid,
.iai-filters,
.iai-breakdown,
.iai-mock-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.iai-field {
  position: relative;
  display: grid;
  gap: 7px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 850;
}
.iai-input-shell,
.iai-field select,
.iai-field input,
.iai-search,
.iai-filters label,
.iai-tool-row label {
  min-height: 42px;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}
.iai-input-shell,
.iai-search,
.iai-filters label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
}
.iai-tool-row label {
  display: inline-grid;
  gap: 5px;
  padding: 8px 10px;
  color: var(--color-text-secondary);
  font-size: 11px;
}
.iai-input-shell input,
.iai-search input,
.iai-field select,
.iai-field input,
.iai-filters select,
.iai-tool-row select {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-size: 14px;
}
.iai-menu {
  position: absolute;
  z-index: 30;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--surface-elevated);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.iai-menu button {
  width: 100%;
  min-height: 38px;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
  padding: 0 12px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
.iai-menu button:hover {
  background: var(--surface-muted);
}
.iai-platform-pills,
.iai-tags,
.iai-tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}
.iai-platform-pills span,
.iai-tags span,
.iai-tags a,
.iai-muted-pill,
.iai-frequency,
.iai-difficulty,
.iai-source-badge {
  min-height: 24px;
  border-radius: var(--border-radius-md);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 850;
  text-decoration: none;
}
.iai-platform-pills span,
.iai-tags span,
.iai-tags a,
.iai-muted-pill {
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
}
.iai-key-field {
  margin-top: 12px;
}
.iai-dashboard-top {
  padding: 14px;
  display: grid;
  gap: 12px;
}
.iai-total-counter {
  display: grid;
  gap: 3px;
  justify-items: center;
  text-align: center;
}
.iai-total-counter strong {
  font-size: clamp(34px, 6vw, 62px);
  line-height: 1;
  color: var(--color-text-info);
}
.iai-total-counter span,
.iai-breakdown-card small,
.iai-readiness span,
.iai-result-head span,
.iai-source-note {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.iai-breakdown-card {
  min-height: 82px;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  padding: 10px;
  display: grid;
  gap: 4px;
  background: var(--color-background-primary);
}
.iai-breakdown-card i {
  font-size: 18px;
}
.iai-breakdown-card span {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 850;
}
.iai-breakdown-card strong {
  font-size: 18px;
}
.iai-readiness {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 2fr auto;
  gap: 12px;
  align-items: center;
}
.iai-progress {
  height: 9px;
  border-radius: var(--border-radius-md);
  background: var(--color-background-secondary);
  overflow: hidden;
}
.iai-progress span {
  display: block;
  height: 100%;
  background: var(--color-text-info);
}
.iai-tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  margin: 12px 0;
}
.iai-tab {
  min-height: 50px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  white-space: nowrap;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
.iai-tab span {
  min-width: 24px;
  height: 22px;
  border-radius: var(--border-radius-md);
  display: grid;
  place-items: center;
  background: var(--color-background-secondary);
  color: var(--color-text-primary);
  font-size: 11px;
  font-weight: 900;
}
.iai-tab-active {
  border-bottom-color: var(--color-text-info);
  color: var(--color-text-info);
}
.iai-filters {
  padding: 12px;
  grid-template-columns: minmax(240px, 1fr) repeat(3, minmax(150px, max-content)) repeat(3, max-content);
  margin-bottom: 12px;
}
.iai-toggle-on,
.iai-chip-on {
  border-color: var(--color-text-info) !important;
  color: var(--color-text-info) !important;
  background: var(--color-background-info) !important;
}
.iai-source-tools {
  padding: 12px;
  margin-bottom: 12px;
}
.iai-quick-stats,
.iai-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.iai-quick-stats span {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  border-radius: var(--border-radius-md);
  padding: 0 9px;
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 800;
}
.iai-rating-row label {
  flex: 1 1 240px;
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 850;
}
.iai-rating-row input {
  width: 100%;
  accent-color: var(--color-text-info);
}
.iai-result-head {
  margin: 10px 0;
}
.iai-card-stack {
  display: grid;
  gap: 10px;
}
.iai-question-card {
  padding: 14px 16px;
  border-left: 3px solid var(--color-border-tertiary);
}
.iai-practiced {
  border-left-color: var(--color-text-success);
}
.iai-bookmarked {
  border-left-color: var(--color-text-info);
}
.iai-question-card h3 {
  margin: 12px 0 5px;
  font-size: 16px;
  line-height: 1.35;
  font-weight: 650;
}
.iai-question-copy {
  margin: 0 0 10px;
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 1.6;
}
.iai-meta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 9px 0;
}
.iai-meta-grid span {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}
.iai-card-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 0.5px solid var(--color-border-tertiary);
}
.iai-icon-action {
  width: 38px;
  padding: 0;
}
.iai-active-action {
  color: var(--color-text-info);
  border-color: var(--color-text-info);
}
.iai-check-action {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 850;
}
.iai-check-action input {
  width: 17px;
  height: 17px;
  accent-color: var(--color-text-info);
}
.iai-answer-box {
  margin-top: 12px;
  border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-primary);
  padding: 12px;
}
.iai-answer-content {
  display: grid;
  gap: 9px;
  color: var(--color-text-primary);
  font-size: 13px;
  line-height: 1.7;
}
.iai-answer-content h4 {
  margin: 0 0 3px;
  color: var(--color-text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.iai-answer-content p,
.iai-answer-content ul {
  margin: 0;
}
.iai-answer-content ul {
  padding-left: 18px;
}
.iai-loading-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.iai-skeleton-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
}
.iai-skeleton-line,
.iai-skeleton-pills span {
  display: block;
  height: 12px;
  border-radius: var(--border-radius-md);
  background: var(--color-background-secondary);
  animation: iaiPulse 1200ms ease-in-out infinite;
}
.iai-skeleton-pills {
  display: flex;
  gap: 8px;
}
.iai-skeleton-pills span {
  width: 70px;
  height: 24px;
}
.iai-skeleton-wrap {
  display: grid;
  gap: 10px;
}
.iai-skeleton-wrap small {
  color: var(--color-text-secondary);
}
.iai-w-25 {
  width: 25%;
}
.iai-w-45 {
  width: 45%;
}
.iai-w-65 {
  width: 65%;
}
.iai-w-80 {
  width: 80%;
}
.iai-empty {
  min-height: 180px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--color-text-secondary);
  padding: 20px;
}
.iai-welcome {
  padding: 18px;
}
.iai-welcome p {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.7;
}
.iai-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--color-background-danger);
  color: var(--color-text-danger);
}
.iai-error div {
  display: grid;
  gap: 2px;
}
.iai-error button {
  margin-left: auto;
  min-height: 36px;
  border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--surface);
  color: var(--color-text-primary);
  padding: 0 12px;
  cursor: pointer;
}
.iai-source-company {
  background: var(--color-background-info);
  color: var(--color-text-info);
}
.iai-source-leetcode {
  background: var(--color-background-orange);
  color: var(--color-text-orange);
}
.iai-source-codeforces {
  background: var(--color-background-blue);
  color: var(--color-text-blue);
}
.iai-source-gfg {
  background: var(--color-background-green);
  color: var(--color-text-green);
}
.iai-source-interviewbit {
  background: var(--color-background-purple);
  color: var(--color-text-purple);
}
.iai-source-system {
  background: var(--color-background-purple);
  color: var(--color-text-purple);
}
.iai-source-behavioral {
  background: var(--color-background-amber);
  color: var(--color-text-amber);
}
.iai-source-hr {
  background: var(--color-background-pink);
  color: var(--color-text-pink);
}
.iai-easy {
  background: var(--color-background-success);
  color: var(--color-text-success);
}
.iai-medium {
  background: var(--color-background-warning);
  color: var(--color-text-warning);
}
.iai-hard,
.iai-expert {
  background: var(--color-background-danger);
  color: var(--color-text-danger);
}
.iai-unknown,
.iai-normal {
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
}
.iai-hot {
  background: var(--color-background-danger);
  color: var(--color-text-danger);
}
.iai-warm {
  background: var(--color-background-warning);
  color: var(--color-text-warning);
}
.iai-spinner,
.iai-mini-spinner {
  border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: iaiSpin 820ms linear infinite;
}
.iai-spinner {
  width: 17px;
  height: 17px;
}
.iai-mini-spinner {
  width: 14px;
  height: 14px;
}
.iai-mock {
  width: min(980px, calc(100vw - 28px));
  margin: 22px auto;
  padding: 18px;
  display: grid;
  gap: 14px;
}
.iai-mock-question {
  text-align: center;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  padding: 18px;
  background: var(--color-background-primary);
}
.iai-mock-question span {
  color: var(--color-text-info);
  font-size: 12px;
  font-weight: 900;
}
.iai-mock-question h2 {
  margin: 8px 0;
  font-size: 18px;
  line-height: 1.45;
}
.iai-mock-question p {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.65;
}
.iai-mock-textarea,
.iai-code-textarea {
  width: 100%;
  min-height: 170px;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  padding: 12px;
  outline: 0;
  resize: vertical;
  font: inherit;
  line-height: 1.6;
}
.iai-code-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.iai-timer {
  min-width: 92px;
  min-height: 48px;
  border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-primary);
  display: grid;
  place-items: center;
  padding: 6px 10px;
}
.iai-timer strong {
  font-size: 18px;
  line-height: 1;
  color: var(--color-text-info);
}
.iai-timer span {
  color: var(--color-text-secondary);
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 850;
}
.iai-timer-hot {
  background: var(--color-background-danger);
}
.iai-timer-hot strong,
.iai-timer-hot span {
  color: var(--color-text-danger);
}
.iai-final-hero {
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
  padding: 20px;
}
.iai-final-hero i {
  font-size: 38px;
  color: var(--color-text-warning);
}
.iai-final-hero h2 {
  margin: 0;
  font-size: 48px;
  line-height: 1;
}
.iai-final-hero p {
  margin: 0;
  color: var(--color-text-secondary);
}
.iai-report-list {
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}
@keyframes iaiSpin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes iaiPulse {
  0%, 100% {
    opacity: 0.42;
  }
  50% {
    opacity: 0.92;
  }
}
@media (max-width: 980px) {
  .iai-form-grid,
  .iai-filters,
  .iai-breakdown,
  .iai-mock-grid,
  .iai-readiness {
    grid-template-columns: 1fr;
  }
  .iai-counter {
    width: 100%;
    margin-left: 0;
    text-align: left;
  }
  .iai-header {
    flex-wrap: wrap;
  }
  .iai-primary-btn,
  .iai-secondary-btn,
  .iai-link-btn,
  .iai-toggle,
  .iai-generate {
    width: 100%;
  }
}
`;
