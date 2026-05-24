export interface CompanyData {
  company: string;
  slug: string;
  basePay: string;
  sysDesignWeight: string;
  dsaWeight: string;
  timeline: string;
  difficulty: number; // 1-5 scale
  rounds: { dsa: number; systemDesign: number };
}

export interface TierSalary {
  tier1: string;
  tier2: string;
  lateral: string;
}

export interface SkillWeight {
  label: string;
  weight: number; // percentage
  color: string;
}

export interface TimelineStep {
  company: string;
  steps: string[];
}

export interface RoleMap {
  slug: string;
  title: string;
  targetQuery: string;
  description: string;
  salaryRange: string;
  focus: string;
  demandScore: number; // demand score out of 100
  category: "Engineering" | "Product" | "Data" | "Management";
  companies: CompanyData[];
  tierSalaries: TierSalary;
  skills: SkillWeight[];
  timeline: TimelineStep[];
}

export const ROLE_MAPS: Record<string, RoleMap> = {
  "backend-sde2-market-map": {
    slug: "backend-sde2-market-map",
    title: "Backend SDE2 Cross-Company Market Map",
    targetQuery: "Backend SDE2 salary India 2026",
    description: "Cross-company comparison map for Backend Software Development Engineer 2 (SDE2) positions. Compare system design weights, DSA expectations, interview timelines, and compensation indexes across leading Indian tech companies.",
    salaryRange: "₹30L - ₹55L",
    focus: "Distributed systems, API scalability, database design, caching patterns.",
    demandScore: 95,
    category: "Engineering",
    companies: [
      { company: "Google India", slug: "google-india", basePay: "60-75 LPA", sysDesignWeight: "45%", dsaWeight: "55%", timeline: "45-60 days", difficulty: 4.8, rounds: { dsa: 3, systemDesign: 2 } },
      { company: "Amazon India", slug: "amazon-india", basePay: "45-55 LPA", sysDesignWeight: "40%", dsaWeight: "50%", timeline: "30 days", difficulty: 4.5, rounds: { dsa: 3, systemDesign: 2 } },
      { company: "Flipkart", slug: "flipkart", basePay: "42-50 LPA", sysDesignWeight: "40%", dsaWeight: "45%", timeline: "21 days", difficulty: 4.2, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "PhonePe", slug: "phonepe", basePay: "45-55 LPA", sysDesignWeight: "45%", dsaWeight: "40%", timeline: "25 days", difficulty: 4.4, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Razorpay", slug: "razorpay", basePay: "36-45 LPA", sysDesignWeight: "45%", dsaWeight: "35%", timeline: "14 days", difficulty: 4.0, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "Swiggy", slug: "swiggy", basePay: "38-48 LPA", sysDesignWeight: "40%", dsaWeight: "40%", timeline: "18 days", difficulty: 4.1, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "CRED", slug: "cred", basePay: "42-52 LPA", sysDesignWeight: "40%", dsaWeight: "35%", timeline: "20 days", difficulty: 4.3, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "Zepto", slug: "zepto", basePay: "34-42 LPA", sysDesignWeight: "35%", dsaWeight: "45%", timeline: "12 days", difficulty: 4.2, rounds: { dsa: 2, systemDesign: 1 } }
    ],
    tierSalaries: {
      tier1: "₹38L - ₹48L base + stock",
      tier2: "₹30L - ₹38L base + stock",
      lateral: "₹32L - ₹55L base + stock"
    },
    skills: [
      { label: "System Design (HLD/LLD)", weight: 45, color: "#10b981" },
      { label: "Data Structures & Algos", weight: 35, color: "#3b82f6" },
      { label: "Concurrency & Multi-threading", weight: 12, color: "#f59e0b" },
      { label: "SQL & DB Internal Mechanics", weight: 8, color: "#ef4444" }
    ],
    timeline: [
      { company: "Razorpay", steps: ["1. Recruiter Screen", "2. Machine Coding Loop (90m)", "3. HLD Architectural Review", "4. Culture & Values Alignment"] },
      { company: "CRED", steps: ["1. Phone Screener", "2. Low-Level Design Hack (120m)", "3. High-Level Scalability Loop", "4. Founder Alignment Session"] },
      { company: "Zepto", steps: ["1. Tech screening", "2. Speed Machine Coding Round", "3. System Design & Scale Interview", "4. Bar Raiser loop"] }
    ]
  },
  "frontend-sde2-market-map": {
    slug: "frontend-sde2-market-map",
    title: "Frontend SDE2 Cross-Company Market Map",
    targetQuery: "Frontend SDE2 salary India 2026",
    description: "Analyze and compare Frontend Software Development Engineer 2 (SDE2) loop weightage, frontend design expectations, salaries, and recruiter filters in leading Indian startups.",
    salaryRange: "₹18L - ₹38L",
    focus: "React/Next.js depth, CSS precision, performance metrics, browser rendering pipelines.",
    demandScore: 92,
    category: "Engineering",
    companies: [
      { company: "Razorpay", slug: "razorpay", basePay: "22-32 LPA", sysDesignWeight: "40%", dsaWeight: "25%", timeline: "14 days", difficulty: 3.8, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Meesho", slug: "meesho", basePay: "18-26 LPA", sysDesignWeight: "35%", dsaWeight: "30%", timeline: "10 days", difficulty: 3.5, rounds: { dsa: 1, systemDesign: 1 } },
      { company: "Zepto", slug: "zepto", basePay: "22-30 LPA", sysDesignWeight: "40%", dsaWeight: "30%", timeline: "12 days", difficulty: 4.0, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "CRED", slug: "cred", basePay: "26-36 LPA", sysDesignWeight: "45%", dsaWeight: "25%", timeline: "20 days", difficulty: 4.2, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "PhonePe", slug: "phonepe", basePay: "28-38 LPA", sysDesignWeight: "35%", dsaWeight: "45%", timeline: "25 days", difficulty: 4.3, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Swiggy", slug: "swiggy", basePay: "24-34 LPA", sysDesignWeight: "40%", dsaWeight: "30%", timeline: "18 days", difficulty: 4.0, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Juspay", slug: "juspay", basePay: "20-30 LPA", sysDesignWeight: "30%", dsaWeight: "50%", timeline: "30 days", difficulty: 4.5, rounds: { dsa: 2, systemDesign: 2 } }
    ],
    tierSalaries: {
      tier1: "₹24L - ₹30L base + stocks",
      tier2: "₹18L - ₹24L base + stocks",
      lateral: "₹20L - ₹38L base + stocks"
    },
    skills: [
      { label: "Frontend Architecture & LLD", weight: 45, color: "#10b981" },
      { label: "JS & React Internals", weight: 30, color: "#3b82f6" },
      { label: "Data Structures & Algos", weight: 15, color: "#f59e0b" },
      { label: "Performance & Web Vitals", weight: 10, color: "#ef4444" }
    ],
    timeline: [
      { company: "Zepto", steps: ["1. Coding Screen", "2. Frontend UI Machine Coding (120m)", "3. Frontend HLD (Performance & Scale)", "4. HM Round"] },
      { company: "Juspay", steps: ["1. Pure Functional JS Screen", "2. Hackathon-style UI build", "3. Core Frontend LLD", "4. Leadership Round"] },
      { company: "Swiggy", steps: ["1. React Machine Coding", "2. State Management & Cache Design", "3. Core JS & CSS internals", "4. HM Loop"] }
    ]
  },
  "data-engineer-senior-market-map": {
    slug: "data-engineer-senior-market-map",
    title: "Senior Data Engineer Cross-Company Market Map",
    targetQuery: "Senior Data Engineer salary India 2026",
    description: "Compare Senior Data Engineer loop weight splits, SQL/NoSQL expectations, big data design, and CTC base ranges for top companies in India.",
    salaryRange: "₹24L - ₹55L",
    focus: "Big Data processing (Spark, Airflow, dbt), data modeling, streaming (Kafka, Flink), data warehousing.",
    demandScore: 94,
    category: "Data",
    companies: [
      { company: "Flipkart", slug: "flipkart", basePay: "34-48 LPA", sysDesignWeight: "45%", dsaWeight: "25%", timeline: "21 days", difficulty: 4.2, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Swiggy", slug: "swiggy", basePay: "32-45 LPA", sysDesignWeight: "45%", dsaWeight: "25%", timeline: "18 days", difficulty: 4.0, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Razorpay", slug: "razorpay", basePay: "30-42 LPA", sysDesignWeight: "40%", dsaWeight: "20%", timeline: "14 days", difficulty: 3.9, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Juspay", slug: "juspay", basePay: "28-40 LPA", sysDesignWeight: "40%", dsaWeight: "35%", timeline: "25 days", difficulty: 4.3, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Zepto", slug: "zepto", basePay: "32-44 LPA", sysDesignWeight: "40%", dsaWeight: "20%", timeline: "12 days", difficulty: 4.1, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "PhonePe", slug: "phonepe", basePay: "36-50 LPA", sysDesignWeight: "45%", dsaWeight: "30%", timeline: "25 days", difficulty: 4.4, rounds: { dsa: 2, systemDesign: 2 } }
    ],
    tierSalaries: {
      tier1: "₹32L - ₹42L base",
      tier2: "₹24L - ₹32L base",
      lateral: "₹26L - ₹55L base + equity"
    },
    skills: [
      { label: "Data Pipeline Design & Spark", weight: 45, color: "#10b981" },
      { label: "Data Modeling & DW Principles", weight: 30, color: "#3b82f6" },
      { label: "Real-time Streaming (Kafka)", weight: 15, color: "#f59e0b" },
      { label: "Data Structures & SQL depth", weight: 10, color: "#ef4444" }
    ],
    timeline: [
      { company: "Flipkart", steps: ["1. Phone Screening", "2. Data Modeling & SQL Case Round", "3. Big Data System Design (Spark)", "4. Bar Raiser Loop"] },
      { company: "Swiggy", steps: ["1. SQL & Coding Screener", "2. Pipeline Design round", "3. Real-time Streaming Architecture", "4. Engineering Fit"] },
      { company: "PhonePe", steps: ["1. DSA screening", "2. Advanced SQL & DB Tuning", "3. High-scale Data Design", "4. Leadership Round"] }
    ]
  },
  "product-manager-sde2-market-map": {
    slug: "product-manager-sde2-market-map",
    title: "Product Manager (Mid-Level) Cross-Company Market Map",
    targetQuery: "Product Manager salary startup India 2026",
    description: "Salary bands, case study expectations, engineering collaboration criteria, and product sense filters for Product Managers (PM2) at top Indian tech startups.",
    salaryRange: "₹20L - ₹50L",
    focus: "Product metrics, SQL/analytics, product sense, GTM strategy, engineering collaboration, execution.",
    demandScore: 93,
    category: "Management",
    companies: [
      { company: "Razorpay", slug: "razorpay", basePay: "24-38 LPA", sysDesignWeight: "25%", dsaWeight: "0%", timeline: "21 days", difficulty: 4.1, rounds: { dsa: 0, systemDesign: 2 } },
      { company: "CRED", slug: "cred", basePay: "28-45 LPA", sysDesignWeight: "30%", dsaWeight: "0%", timeline: "25 days", difficulty: 4.3, rounds: { dsa: 0, systemDesign: 2 } },
      { company: "Meesho", slug: "meesho", basePay: "20-32 LPA", sysDesignWeight: "20%", dsaWeight: "0%", timeline: "15 days", difficulty: 3.8, rounds: { dsa: 0, systemDesign: 1 } },
      { company: "Zepto", slug: "zepto", basePay: "24-38 LPA", sysDesignWeight: "25%", dsaWeight: "0%", timeline: "14 days", difficulty: 4.2, rounds: { dsa: 0, systemDesign: 2 } },
      { company: "PhonePe", slug: "phonepe", basePay: "26-42 LPA", sysDesignWeight: "30%", dsaWeight: "0%", timeline: "20 days", difficulty: 4.2, rounds: { dsa: 0, systemDesign: 2 } },
      { company: "Groww", slug: "groww", basePay: "22-36 LPA", sysDesignWeight: "20%", dsaWeight: "0%", timeline: "18 days", difficulty: 4.0, rounds: { dsa: 0, systemDesign: 1 } }
    ],
    tierSalaries: {
      tier1: "₹28L - ₹36L base + options",
      tier2: "₹20L - ₹28L base + options",
      lateral: "₹22L - ₹50L base + options"
    },
    skills: [
      { label: "Product Heuristics & Sense", weight: 40, color: "#10b981" },
      { label: "Execution & GTM Delivery", weight: 30, color: "#3b82f6" },
      { label: "Metrics & SQL Analytics", weight: 20, color: "#f59e0b" },
      { label: "Technical Engineering Sync", weight: 10, color: "#ef4444" }
    ],
    timeline: [
      { company: "CRED", steps: ["1. Recruiter Screen", "2. Product Case presentation", "3. Design & Growth Loop interview", "4. Founder Fit session"] },
      { company: "Razorpay", steps: ["1. Core Case study submission", "2. Case defense round", "3. Product Execution & Metrics", "4. Product Leadership Review"] },
      { company: "Zepto", steps: ["1. Live Case analysis", "2. Speed Execution & GTM loop", "3. Growth & User analytics", "4. Leadership Round"] }
    ]
  },
  "devops-senior-market-map": {
    slug: "devops-senior-market-map",
    title: "Senior DevOps Engineer Cross-Company Market Map",
    targetQuery: "Senior DevOps Engineer salary India 2026",
    description: "Detailed salary comparison map and tech expectations for Senior DevOps / Site Reliability Engineers at Flipkart, Swiggy, Zomato, PhonePe, and Razorpay.",
    salaryRange: "₹22L - ₹48L",
    focus: "Orchestration (Kubernetes, Docker), Infrastructure as Code (Terraform), Cloud (AWS, GCP), SRE, observability.",
    demandScore: 96,
    category: "Engineering",
    companies: [
      { company: "Flipkart", slug: "flipkart", basePay: "30-42 LPA", sysDesignWeight: "45%", dsaWeight: "15%", timeline: "20 days", difficulty: 4.1, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Swiggy", slug: "swiggy", basePay: "28-40 LPA", sysDesignWeight: "45%", dsaWeight: "15%", timeline: "18 days", difficulty: 4.0, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Zomato", slug: "zomato", basePay: "32-46 LPA", sysDesignWeight: "50%", dsaWeight: "10%", timeline: "15 days", difficulty: 4.2, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "PhonePe", slug: "phonepe", basePay: "32-48 LPA", sysDesignWeight: "45%", dsaWeight: "20%", timeline: "22 days", difficulty: 4.3, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Razorpay", slug: "razorpay", basePay: "28-40 LPA", sysDesignWeight: "45%", dsaWeight: "15%", timeline: "14 days", difficulty: 4.0, rounds: { dsa: 1, systemDesign: 2 } }
    ],
    tierSalaries: {
      tier1: "₹28L - ₹38L base",
      tier2: "₹22L - ₹28L base",
      lateral: "₹24L - ₹48L base + options"
    },
    skills: [
      { label: "Kubernetes & Containers", weight: 40, color: "#10b981" },
      { label: "Infra Design (Terraform/IaC)", weight: 30, color: "#3b82f6" },
      { label: "SRE & Monitoring stacks", weight: 20, color: "#f59e0b" },
      { label: "Linux & Shell Scripting", weight: 10, color: "#ef4444" }
    ],
    timeline: [
      { company: "Zomato", steps: ["1. Resume screening", "2. Linux internals & script round", "3. High-availability Infra Design", "4. Operational review"] },
      { company: "PhonePe", steps: ["1. DSA & Python Screening", "2. Core SRE Architecture", "3. Network Security & CDN Loop", "4. Team Fit Round"] },
      { company: "Flipkart", steps: ["1. Scripting screening", "2. Cloud scalability loop", "3. System failure simulation review", "4. Bar Raiser Round"] }
    ]
  },
  "sde1-fresher-market-map": {
    slug: "sde1-fresher-market-map",
    title: "SDE1 / Fresher Software Engineer Market Map",
    targetQuery: "Fresher SDE salary Bangalore 2026",
    description: "Compare SDE1 Fresher hiring bars, target DSA difficulty levels, internship conversion factors, and compensation structures in Bangalore.",
    salaryRange: "₹8L - ₹28L",
    focus: "Data structures and algorithms (DSA), basic system design principles, computer science fundamentals (OS, DBMS, Networks), internship weights.",
    demandScore: 90,
    category: "Engineering",
    companies: [
      { company: "Google", slug: "google-india", basePay: "18-24 LPA", sysDesignWeight: "10%", dsaWeight: "85%", timeline: "45 days", difficulty: 4.7, rounds: { dsa: 3, systemDesign: 0 } },
      { company: "Amazon", slug: "amazon-india", basePay: "16-20 LPA", sysDesignWeight: "10%", dsaWeight: "80%", timeline: "30 days", difficulty: 4.4, rounds: { dsa: 3, systemDesign: 0 } },
      { company: "Flipkart", slug: "flipkart", basePay: "14-18 LPA", sysDesignWeight: "15%", dsaWeight: "75%", timeline: "21 days", difficulty: 4.2, rounds: { dsa: 2, systemDesign: 0 } },
      { company: "Razorpay", slug: "razorpay", basePay: "12-15 LPA", sysDesignWeight: "20%", dsaWeight: "65%", timeline: "14 days", difficulty: 4.0, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "Swiggy", slug: "swiggy", basePay: "12-16 LPA", sysDesignWeight: "20%", dsaWeight: "65%", timeline: "14 days", difficulty: 4.0, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "PhonePe", slug: "phonepe", basePay: "14-18 LPA", sysDesignWeight: "15%", dsaWeight: "75%", timeline: "20 days", difficulty: 4.1, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "Juspay", slug: "juspay", basePay: "12-18 LPA", sysDesignWeight: "10%", dsaWeight: "80%", timeline: "25 days", difficulty: 4.5, rounds: { dsa: 3, systemDesign: 0 } },
      { company: "CRED", slug: "cred", basePay: "15-20 LPA", sysDesignWeight: "20%", dsaWeight: "70%", timeline: "18 days", difficulty: 4.3, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "Zepto", slug: "zepto", basePay: "12-16 LPA", sysDesignWeight: "20%", dsaWeight: "70%", timeline: "12 days", difficulty: 4.1, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "Meesho", slug: "meesho", basePay: "10-14 LPA", sysDesignWeight: "15%", dsaWeight: "70%", timeline: "10 days", difficulty: 3.8, rounds: { dsa: 2, systemDesign: 1 } }
    ],
    tierSalaries: {
      tier1: "₹18L - ₹28L base (IIT/BITS/NIT)",
      tier2: "₹12L - ₹18L base (Top state colleges)",
      lateral: "₹8L - ₹12L base (Service-to-product shift)"
    },
    skills: [
      { label: "Data Structures & Algos (DSA)", weight: 65, color: "#3b82f6" },
      { label: "Computer Science Core (OS/DBMS)", weight: 15, color: "#10b981" },
      { label: "Clean Code & Implementation", weight: 12, color: "#f59e0b" },
      { label: "Project & Internship depth", weight: 8, color: "#ef4444" }
    ],
    timeline: [
      { company: "Google", steps: ["1. Online Assessment (OA)", "2. 2x DSA Technical Rounds", "3. 1x Googleness & Technical Loop", "4. Hiring Committee review"] },
      { company: "Juspay", steps: ["1. Extreme Speed Coding Test", "2. Functional Programming Hackathon", "3. Advanced DS interview", "4. HM fitment"] },
      { company: "Amazon", steps: ["1. Online OA", "2. 2x DSA loops (Focus on LP)", "3. Bar Raiser technical round", "4. Offer confirmation"] }
    ]
  },
  "data-scientist-mid-market-map": {
    slug: "data-scientist-mid-market-map",
    title: "Mid-Level Data Scientist Cross-Company Market Map",
    targetQuery: "Data Scientist salary India 2026 mid level",
    description: "Track data scientist hiring standards, core math/statistics interview splits, SQL benchmarks, and salary structures in India's leading startups.",
    salaryRange: "₹18L - ₹42L",
    focus: "Machine learning systems, A/B testing & experimentation, statistics/probability, SQL, Python modeling.",
    demandScore: 91,
    category: "Data",
    companies: [
      { company: "Flipkart", slug: "flipkart", basePay: "24-36 LPA", sysDesignWeight: "35%", dsaWeight: "25%", timeline: "25 days", difficulty: 4.2, rounds: { dsa: 1, systemDesign: 1 } },
      { company: "Swiggy", slug: "swiggy", basePay: "22-34 LPA", sysDesignWeight: "40%", dsaWeight: "20%", timeline: "18 days", difficulty: 4.0, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Razorpay", slug: "razorpay", basePay: "20-32 LPA", sysDesignWeight: "35%", dsaWeight: "20%", timeline: "15 days", difficulty: 3.9, rounds: { dsa: 1, systemDesign: 1 } },
      { company: "PhonePe", slug: "phonepe", basePay: "24-38 LPA", sysDesignWeight: "40%", dsaWeight: "25%", timeline: "20 days", difficulty: 4.2, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Juspay", slug: "juspay", basePay: "20-30 LPA", sysDesignWeight: "30%", dsaWeight: "35%", timeline: "30 days", difficulty: 4.3, rounds: { dsa: 2, systemDesign: 1 } },
      { company: "Meesho", slug: "meesho", basePay: "18-28 LPA", sysDesignWeight: "35%", dsaWeight: "20%", timeline: "12 days", difficulty: 3.8, rounds: { dsa: 1, systemDesign: 1 } }
    ],
    tierSalaries: {
      tier1: "₹24L - ₹32L base",
      tier2: "₹18L - ₹24L base",
      lateral: "₹20L - ₹42L base + stocks"
    },
    skills: [
      { label: "Math, Stats & Hypothesis Testing", weight: 35, color: "#10b981" },
      { label: "ML Modeling & Evaluation", weight: 30, color: "#3b82f6" },
      { label: "SQL & Advanced Analytics", weight: 20, color: "#f59e0b" },
      { label: "Data Structures & Scripting", weight: 15, color: "#ef4444" }
    ],
    timeline: [
      { company: "Swiggy", steps: ["1. SQL & Coding challenge", "2. Statistical Experimentation (A/B testing) round", "3. Predictive ML modeling loop", "4. Fitment interview"] },
      { company: "Flipkart", steps: ["1. ML Machine Coding Round (3 hours)", "2. Mathematical Foundations & Stats", "3. Product ML design loop", "4. Bar Raiser Review"] },
      { company: "PhonePe", steps: ["1. Tech Assessment", "2. Advanced probability & SQL", "3. Scaled ML System design", "4. Leadership Round"] }
    ]
  },
  "fullstack-sde3-market-map": {
    slug: "fullstack-sde3-market-map",
    title: "Fullstack SDE3 / Tech Lead Cross-Company Market Map",
    targetQuery: "SDE3 Full Stack salary India 2026",
    description: "Analyze loop expectations, SDE3 system design requirements, microfrontend capabilities, high-scale database modeling, and compensation bands in leading tech giants.",
    salaryRange: "₹35L - ₹80L",
    focus: "Complete architectural ownership, microfrontends, high-scale backend services, system design leadership, performance optimization.",
    demandScore: 97,
    category: "Engineering",
    companies: [
      { company: "Google", slug: "google-india", basePay: "65-85 LPA", sysDesignWeight: "45%", dsaWeight: "45%", timeline: "60 days", difficulty: 4.8, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Amazon", slug: "amazon-india", basePay: "55-70 LPA", sysDesignWeight: "40%", dsaWeight: "40%", timeline: "40 days", difficulty: 4.6, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Razorpay", slug: "razorpay", basePay: "45-60 LPA", sysDesignWeight: "50%", dsaWeight: "25%", timeline: "20 days", difficulty: 4.3, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "CRED", slug: "cred", basePay: "50-68 LPA", sysDesignWeight: "45%", dsaWeight: "25%", timeline: "25 days", difficulty: 4.4, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "PhonePe", slug: "phonepe", basePay: "52-72 LPA", sysDesignWeight: "45%", dsaWeight: "35%", timeline: "30 days", difficulty: 4.5, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Flipkart", slug: "flipkart", basePay: "48-62 LPA", sysDesignWeight: "40%", dsaWeight: "30%", timeline: "25 days", difficulty: 4.3, rounds: { dsa: 1, systemDesign: 2 } }
    ],
    tierSalaries: {
      tier1: "₹45L - ₹60L base",
      tier2: "₹35L - ₹45L base",
      lateral: "₹40L - ₹80L base + massive stock grants"
    },
    skills: [
      { label: "Fullstack Architecture (HLD/LLD)", weight: 45, color: "#10b981" },
      { label: "Backend Scalability & Scaling DBs", weight: 25, color: "#3b82f6" },
      { label: "Frontend optimization & Microfrontends", weight: 20, color: "#f59e0b" },
      { label: "DSA & System Concurrency", weight: 10, color: "#ef4444" }
    ],
    timeline: [
      { company: "Razorpay", steps: ["1. Fullstack Architecture screening", "2. System Design Loop 1 (Backend scale)", "3. System Design Loop 2 (Frontend rendering & edge caching)", "4. Leadership & Fitment Review"] },
      { company: "CRED", steps: ["1. Machine Coding architectural build (150m)", "2. High-Level Distributed scale design", "3. Core Client UI performance", "4. Founder Alignment"] },
      { company: "PhonePe", steps: ["1. DSA screening", "2. Fullstack Architectural Design (Scale & Security)", "3. DB Internals & Latency tuning", "4. Bar Raiser Round"] }
    ]
  },
  "mobile-sde2-market-map": {
    slug: "mobile-sde2-market-map",
    title: "Mobile Engineer SDE2 Cross-Company Market Map",
    targetQuery: "Mobile Engineer salary India 2026 Android iOS",
    description: "Compare iOS and Android developer SDE2 loops, native Swift/Kotlin expectation levels, Flutter vs native weight, and salary metrics in India.",
    salaryRange: "₹18L - ₹40L",
    focus: "Cross-platform vs native structures, memory optimization, client-side caching, Jetpack Compose, offline architectures.",
    demandScore: 91,
    category: "Engineering",
    companies: [
      { company: "Razorpay", slug: "razorpay", basePay: "22-32 LPA", sysDesignWeight: "45%", dsaWeight: "25%", timeline: "14 days", difficulty: 4.0, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "PhonePe", slug: "phonepe", basePay: "26-36 LPA", sysDesignWeight: "45%", dsaWeight: "35%", timeline: "20 days", difficulty: 4.2, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "CRED", slug: "cred", basePay: "26-38 LPA", sysDesignWeight: "45%", dsaWeight: "25%", timeline: "20 days", difficulty: 4.3, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Meesho", slug: "meesho", basePay: "18-26 LPA", sysDesignWeight: "35%", dsaWeight: "25%", timeline: "12 days", difficulty: 3.7, rounds: { dsa: 1, systemDesign: 1 } },
      { company: "Swiggy", slug: "swiggy", basePay: "22-32 LPA", sysDesignWeight: "40%", dsaWeight: "25%", timeline: "18 days", difficulty: 4.0, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Zepto", slug: "zepto", basePay: "20-30 LPA", sysDesignWeight: "40%", dsaWeight: "25%", timeline: "12 days", difficulty: 4.1, rounds: { dsa: 1, systemDesign: 2 } }
    ],
    tierSalaries: {
      tier1: "₹24L - ₹32L base",
      tier2: "₹18L - ₹24L base",
      lateral: "₹20L - ₹40L base + equity"
    },
    skills: [
      { label: "Mobile LLD & App Architecture", weight: 45, color: "#10b981" },
      { label: "OS Internals (iOS/Android UI loop)", weight: 25, color: "#3b82f6" },
      { label: "Local Caching & Offline DBs", weight: 18, color: "#f59e0b" },
      { label: "DSA & Memory Profiling", weight: 12, color: "#ef4444" }
    ],
    timeline: [
      { company: "PhonePe", steps: ["1. Android/iOS Coding challenge", "2. App Architecture Design (Offline-first & Cache)", "3. Native UI & Jetpack/SwiftUI mechanics", "4. HM Fitment"] },
      { company: "Razorpay", steps: ["1. Mobile Machine Coding (120m)", "2. App scalability & SDK design", "3. Native platform internals", "4. Engineering Review"] },
      { company: "Zepto", steps: ["1. Native Speed Coding Screen", "2. Mobile App LLD (Performance optimization)", "3. Real-time API sync design", "4. Leadership Fit"] }
    ]
  },
  "ml-engineer-senior-market-map": {
    slug: "ml-engineer-senior-market-map",
    title: "Senior ML Engineer Cross-Company Market Map",
    targetQuery: "ML Engineer salary India 2026 senior",
    description: "Compare LLM fine-tuning standards, MLOps orchestration criteria, high-concurrency production ML systems, and base compensation bands for senior ML engineers.",
    salaryRange: "₹30L - ₹90L",
    focus: "LLM fine-tuning, MLOps, inference speed optimization, deep learning modeling, high-concurrency production ML systems.",
    demandScore: 98,
    category: "Engineering",
    companies: [
      { company: "Google", slug: "google-india", basePay: "70-95 LPA", sysDesignWeight: "45%", dsaWeight: "35%", timeline: "60 days", difficulty: 4.9, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Amazon", slug: "amazon-india", basePay: "60-80 LPA", sysDesignWeight: "45%", dsaWeight: "35%", timeline: "45 days", difficulty: 4.7, rounds: { dsa: 2, systemDesign: 2 } },
      { company: "Flipkart", slug: "flipkart", basePay: "48-65 LPA", sysDesignWeight: "45%", dsaWeight: "25%", timeline: "25 days", difficulty: 4.4, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Swiggy", slug: "swiggy", basePay: "46-62 LPA", sysDesignWeight: "45%", dsaWeight: "25%", timeline: "20 days", difficulty: 4.3, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Razorpay", slug: "razorpay", basePay: "42-58 LPA", sysDesignWeight: "40%", dsaWeight: "20%", timeline: "15 days", difficulty: 4.2, rounds: { dsa: 1, systemDesign: 2 } },
      { company: "Juspay", slug: "juspay", basePay: "40-55 LPA", sysDesignWeight: "40%", dsaWeight: "30%", timeline: "30 days", difficulty: 4.5, rounds: { dsa: 2, systemDesign: 2 } }
    ],
    tierSalaries: {
      tier1: "₹42L - ₹55L base",
      tier2: "₹30L - ₹42L base",
      lateral: "₹35L - ₹90L base + stocks"
    },
    skills: [
      { label: "LLM Orchestration & Fine-tuning", weight: 40, color: "#10b981" },
      { label: "Production ML System Design", weight: 30, color: "#3b82f6" },
      { label: "Inference Latency Optimization", weight: 20, color: "#f59e0b" },
      { label: "MLOps & Pipeline Automation", weight: 10, color: "#ef4444" }
    ],
    timeline: [
      { company: "Google", steps: ["1. Advanced DSA Screen", "2. Deep Learning Theory & Math", "3. Scaled ML System Design", "4. Googleness & SRE Fit"] },
      { company: "Swiggy", steps: ["1. Python ML Machine Coding", "2. Recommendation Engine HLD Design", "3. Latency & Batch Pipeline Tuning", "4. Executive Review"] },
      { company: "Razorpay", steps: ["1. NLP/LLM Screening Challenge", "2. Fraud/Risk System Design Round", "3. Core MLOps & Infra scaling", "4. Leadership Alignment"] }
    ]
  }
};
