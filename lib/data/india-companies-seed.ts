export const INDIA_COMPANIES_DATA = [
  {
    companyName: "Flipkart",
    companySlug: "flipkart",
    tier: "tier1_india",
    logoEmoji: "🛒",
    hiringProcess: {
      totalRounds: 5,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "90 min", prep: "2 DSA problems (LeetCode medium). CS fundamentals MCQs. Attempt all questions — partial credit given." },
        { round: 2, type: "Technical Screen", duration: "60 min", prep: "1 DSA problem. Focus on time-space complexity discussion. Common: trees, graphs, DP." },
        { round: 3, type: "Technical Interview 1", duration: "60 min", prep: "DSA hard. Data structures deep dive. Must write clean compilable code." },
        { round: 4, type: "Technical Interview 2 (LLD/HLD)", duration: "60 min", prep: "LLD for SDE1-2. HLD for SDE3+. Design Flipkart search, recommendation, or cart." },
        { round: 5, type: "HR + Hiring Manager", duration: "45 min", prep: "STAR stories. Why Flipkart specifically. Compensation discussion." }
      ]
    },
    dsaDifficulty: "hard",
    knownQuestions: [
      { question: "Design a URL shortener with analytics", type: "system_design", difficulty: "medium", source: "Glassdoor" },
      { question: "Find the kth largest element in a stream", type: "dsa", difficulty: "medium", source: "LeetCode" },
      { question: "Tell me about a time you disagreed with your manager", type: "behavioral", difficulty: "easy", source: "Glassdoor" }
    ],
    salaryRanges: { SDE1: { min: 2000000, max: 3200000 }, SDE2: { min: 3500000, max: 5500000 }, SDE3: { min: 6000000, max: 10000000 } },
    avgTimelineDays: 21,
    hiringStatus: "high",
    interviewTips: [
      "LeetCode top 150 is the minimum bar — medium problems must be solved in 15-20 minutes",
      "System design: always start with clarifying questions, then capacity estimation, then design",
      "Flipkart loves 'customer obsession' stories — have 2-3 specific examples ready",
      "All interviewers share notes — be consistent across rounds"
    ],
    prepResources: [
      { title: "Flipkart Interview Experiences 2024", url: "https://www.geeksforgeeks.org/flipkart-interview-experiences/", type: "reading" },
      { title: "Flipkart LeetCode Questions", url: "https://leetcode.com/company/flipkart/", type: "practice" },
      { title: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", type: "reading" }
    ]
  },
  {
    companyName: "Razorpay",
    companySlug: "razorpay",
    tier: "unicorn",
    logoEmoji: "💳",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Machine Coding", duration: "90 min", prep: "Build a functional application (like a split-wise system, parking lot) locally. Focus on modularity, clean code, and working solution." },
        { round: 2, type: "Technical Interview 1 (DSA/LLD)", duration: "60 min", prep: "Review machine coding round. Add new requirements. Basic DSA (Medium)." },
        { round: 3, type: "Technical Interview 2 (System Design)", duration: "60 min", prep: "High Level Design. Focus on API design, database schemas, and handling concurrency (payments context)." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Cultural fit. Empathy, ownership, transparency. Discuss past projects." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Machine Coding: Design an Event Bus or Key-Value store", type: "machine_coding", difficulty: "hard", source: "GeeksForGeeks" },
      { question: "Design Razorpay Payment Gateway", type: "system_design", difficulty: "hard", source: "Community report" },
      { question: "Detect cycle in a directed graph", type: "dsa", difficulty: "medium", source: "Glassdoor" }
    ],
    salaryRanges: { SDE1: { min: 1800000, max: 2800000 }, SDE2: { min: 3200000, max: 4800000 }, SDE3: { min: 5500000, max: 8000000 } },
    avgTimelineDays: 14,
    hiringStatus: "high",
    interviewTips: [
      "Machine coding is the make-or-break round. Practice building small CLI apps locally in 90 mins.",
      "Clean code and separation of concerns matter more than complex design patterns.",
      "Understand concurrency and database transactions deeply for design rounds.",
      "Razorpay values transparency and low ego — reflect this in the HR round."
    ],
    prepResources: [
      { title: "Machine Coding Round Guide", url: "https://workat.tech/machine-coding/article/how-to-prepare-for-machine-coding-round", type: "reading" },
      { title: "Razorpay Engineering Blog", url: "https://engineering.razorpay.com/", type: "reading" }
    ]
  },
  {
    companyName: "Swiggy",
    companySlug: "swiggy",
    tier: "unicorn",
    logoEmoji: "🛵",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Machine Coding", duration: "120 min", prep: "Design an app like food delivery or wallet. Focus on working code and entity relationships." },
        { round: 2, type: "Technical - DSA & Problem Solving", duration: "60 min", prep: "LeetCode Medium/Hard. Dynamic Programming and Graph algorithms are common." },
        { round: 3, type: "Technical - System Design", duration: "60 min", prep: "Design food delivery tracking, ETA prediction, or restaurant availability system. High scalability focus." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Past projects, conflict resolution, ownership, 'customer first' mentality." }
      ]
    },
    dsaDifficulty: "hard",
    knownQuestions: [
      { question: "Machine Coding: Design a Food Delivery System", type: "machine_coding", difficulty: "hard", source: "GeeksForGeeks" },
      { question: "Design the Delivery Partner ETA system", type: "system_design", difficulty: "hard", source: "Community report" },
      { question: "Rotting Oranges problem", type: "dsa", difficulty: "medium", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 2000000, max: 3000000 }, SDE2: { min: 3500000, max: 5000000 }, SDE3: { min: 6000000, max: 8500000 } },
    avgTimelineDays: 18,
    hiringStatus: "normal",
    interviewTips: [
      "Swiggy places very heavy emphasis on the Machine Coding round.",
      "For system design, be prepared to discuss geo-spatial queries and event-driven architectures.",
      "Graph algorithms (BFS/DFS/Dijkstra) are frequently asked in DSA."
    ],
    prepResources: [
      { title: "Swiggy Interview Experience", url: "https://www.geeksforgeeks.org/swiggy-interview-experience/", type: "reading" },
      { title: "System Design: Uber/Ola/Swiggy", url: "https://www.youtube.com/watch?v=RmsB1UciGUs", type: "video" }
    ]
  },
  {
    companyName: "Zepto",
    companySlug: "zepto",
    tier: "soonicorn",
    logoEmoji: "🛒",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "60 min", prep: "2 DSA questions (Medium). 1 SQL query." },
        { round: 2, type: "Technical Screen", duration: "60 min", prep: "DSA (Medium). String manipulation, sliding window, two pointers." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Design a 10-minute delivery inventory system. Focus on high throughput and consistency." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Startup fit. High energy, ambiguity tolerance." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design Dark Store Inventory Management", type: "system_design", difficulty: "medium", source: "Community report" },
      { question: "Merge Intervals", type: "dsa", difficulty: "medium", source: "Glassdoor" }
    ],
    salaryRanges: { SDE1: { min: 1600000, max: 2400000 }, SDE2: { min: 2800000, max: 4000000 }, SDE3: { min: 4500000, max: 6500000 } },
    avgTimelineDays: 12,
    hiringStatus: "high",
    interviewTips: [
      "Speed of execution is heavily valued. Move fast during the technical screen.",
      "Understand inventory models and concurrency control for design rounds.",
      "They look for 'hustle' — showcase times you delivered under tight deadlines."
    ],
    prepResources: [
      { title: "Zepto Engineering", url: "https://blog.zeptonow.com/", type: "reading" }
    ]
  },
  {
    companyName: "CRED",
    companySlug: "cred",
    tier: "unicorn",
    logoEmoji: "💳",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Machine Coding", duration: "120 min", prep: "Build a functioning backend or frontend app locally. Strict emphasis on code quality, OOPs, and extensibility." },
        { round: 2, type: "LLD / DSA", duration: "60 min", prep: "Review of machine coding. Design patterns. 1 Medium DSA." },
        { round: 3, type: "System Design", duration: "60 min", prep: "High level design of a rewards system or payment processing pipeline." },
        { round: 4, type: "Cultural / Founders", duration: "45 min", prep: "CRED values design aesthetics, high trust, and extreme ownership." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design an IPL Leaderboard System", type: "machine_coding", difficulty: "hard", source: "GeeksForGeeks" },
      { question: "Design a generic rewards rule engine", type: "system_design", difficulty: "hard", source: "Glassdoor" }
    ],
    salaryRanges: { SDE1: { min: 2400000, max: 3500000 }, SDE2: { min: 4000000, max: 6000000 }, SDE3: { min: 6500000, max: 10000000 } },
    avgTimelineDays: 20,
    hiringStatus: "normal",
    interviewTips: [
      "CRED cares more about low-level design and code quality than complex DSA.",
      "Your machine coding submission must follow SOLID principles.",
      "Have a strong product sense — understand *why* you are building the feature."
    ],
    prepResources: [
      { title: "CRED Interview Experience", url: "https://www.glassdoor.co.in/Interview/CRED-Interview-Questions-E3007673.htm", type: "reading" }
    ]
  },
  {
    companyName: "PhonePe",
    companySlug: "phonepe",
    tier: "tier1_india",
    logoEmoji: "📱",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Machine Coding", duration: "90 min", prep: "Command line app for splitwise, snake & ladder, or parking lot." },
        { round: 2, type: "DSA / Problem Solving", duration: "60 min", prep: "1 Hard or 2 Medium DSA. Trees, Tries, Graphs." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Payment scale systems. High availability and consistency (ACID)." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Past experience deep dive. Handling production issues." }
      ]
    },
    dsaDifficulty: "hard",
    knownQuestions: [
      { question: "Machine Coding: Design a Digital Wallet", type: "machine_coding", difficulty: "medium", source: "GeeksForGeeks" },
      { question: "Design PhonePe UPI transaction flow", type: "system_design", difficulty: "hard", source: "Community report" }
    ],
    salaryRanges: { SDE1: { min: 2200000, max: 3500000 }, SDE2: { min: 3800000, max: 6500000 }, SDE3: { min: 6500000, max: 11000000 } },
    avgTimelineDays: 25,
    hiringStatus: "normal",
    interviewTips: [
      "Extremely high bar for System Design. Focus on distributed transactions and idempotency.",
      "Machine coding must be executable and handle edge cases gracefully.",
      "Be prepared to discuss distributed locks, message queues, and database sharding."
    ],
    prepResources: [
      { title: "PhonePe Tech Blog", url: "https://tech.phonepe.com/", type: "reading" }
    ]
  },
  {
    companyName: "Meesho",
    companySlug: "meesho",
    tier: "unicorn",
    logoEmoji: "🛍️",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "90 min", prep: "3 DSA questions (Easy, Medium, Hard)." },
        { round: 2, type: "DSA Interview", duration: "60 min", prep: "Graphs, DP, Arrays. LeetCode Medium/Hard." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Design a reseller e-commerce platform. Focus on search and recommendation." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Cultural fit. Scrappiness, bias for action." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design a Flash Sale System", type: "system_design", difficulty: "hard", source: "Glassdoor" },
      { question: "Longest Increasing Subsequence", type: "dsa", difficulty: "medium", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 1800000, max: 2800000 }, SDE2: { min: 3200000, max: 4800000 }, SDE3: { min: 5000000, max: 8000000 } },
    avgTimelineDays: 18,
    hiringStatus: "high",
    interviewTips: [
      "Meesho values 'speed over perfection' in their culture, reflect this in behavioral rounds.",
      "System design rounds often focus on handling traffic spikes (e.g., flash sales).",
      "Be strong on Java/Spring Boot if applying for backend roles."
    ],
    prepResources: [
      { title: "Meesho Tech Blog", url: "https://medium.com/meesho-tech", type: "reading" }
    ]
  },
  {
    companyName: "Zomato",
    companySlug: "zomato",
    tier: "tier1_india",
    logoEmoji: "🍽️",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Technical Screen", duration: "45 min", prep: "Basic DSA, JS/Java fundamentals, past project discussion." },
        { round: 2, type: "DSA / Problem Solving", duration: "60 min", prep: "LeetCode Medium. Focus on optimization." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Design restaurant search, real-time tracking, or order management." },
        { round: 4, type: "Founders / Leadership", duration: "30 min", prep: "Zomato culture. Ownership, intensity." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design Zomato Search API", type: "system_design", difficulty: "medium", source: "Community report" },
      { question: "LRU Cache Implementation", type: "dsa", difficulty: "medium", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 1800000, max: 2600000 }, SDE2: { min: 3000000, max: 4500000 }, SDE3: { min: 5000000, max: 7500000 } },
    avgTimelineDays: 15,
    hiringStatus: "normal",
    interviewTips: [
      "Zomato's process is often faster and more pragmatic than FAANG.",
      "Focus heavily on API design, caching (Redis), and database indexing.",
      "Show passion for the food-tech space."
    ],
    prepResources: [
      { title: "Zomato Engineering", url: "https://blog.zomato.com/category/engineering", type: "reading" }
    ]
  },
  {
    companyName: "Groww",
    companySlug: "groww",
    tier: "unicorn",
    logoEmoji: "📈",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "60 min", prep: "2 DSA (Medium), CS fundamentals." },
        { round: 2, type: "DSA Interview", duration: "60 min", prep: "LeetCode Medium. Trees, Linked Lists, Arrays." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Design a stock trading system. Focus on real-time data streaming (WebSockets, Kafka)." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Cultural fit, product mindset, fintech domain interest." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design a Stock Ticker System", type: "system_design", difficulty: "hard", source: "Community report" },
      { question: "Maximum Subarray Sum", type: "dsa", difficulty: "easy", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 1600000, max: 2500000 }, SDE2: { min: 2800000, max: 4500000 }, SDE3: { min: 4800000, max: 7000000 } },
    avgTimelineDays: 20,
    hiringStatus: "high",
    interviewTips: [
      "Familiarity with financial systems, ACID properties, and transaction isolation levels is a huge plus.",
      "Be prepared to discuss real-time push architectures.",
      "Customer trust is a core value; reflect this in your system design choices (fault tolerance)."
    ],
    prepResources: [
      { title: "Groww Engineering", url: "https://tech.groww.in/", type: "reading" }
    ]
  },
  {
    companyName: "Paytm",
    companySlug: "paytm",
    tier: "tier1_india",
    logoEmoji: "💸",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "60 min", prep: "3 DSA questions. SQL." },
        { round: 2, type: "Technical - DSA", duration: "60 min", prep: "LeetCode Medium. String manipulation, Hashes, Trees." },
        { round: 3, type: "Technical - System Design", duration: "60 min", prep: "Design wallet, payment gateway, or ticket booking system." },
        { round: 4, type: "HR", duration: "30 min", prep: "Standard HR questions, salary negotiation." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design Paytm Wallet", type: "system_design", difficulty: "medium", source: "Glassdoor" },
      { question: "Reverse Linked List in groups of K", type: "dsa", difficulty: "medium", source: "GeeksForGeeks" }
    ],
    salaryRanges: { SDE1: { min: 1200000, max: 2000000 }, SDE2: { min: 2000000, max: 3500000 }, SDE3: { min: 3800000, max: 5500000 } },
    avgTimelineDays: 25,
    hiringStatus: "normal",
    interviewTips: [
      "Process can be slow; follow up diligently.",
      "Design rounds focus heavily on database schema design and scalability.",
      "Expect questions on Java internals if applying for backend roles."
    ],
    prepResources: [
      { title: "Paytm Interview Experience", url: "https://www.geeksforgeeks.org/paytm-interview-experience/", type: "reading" }
    ]
  },
  {
    companyName: "Urban Company",
    companySlug: "urban-company",
    tier: "unicorn",
    logoEmoji: "🛠️",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Machine Coding", duration: "120 min", prep: "Build a service booking system or calendar matching tool." },
        { round: 2, type: "DSA / Problem Solving", duration: "60 min", prep: "LeetCode Medium/Hard." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Design professional matching, scheduling, and routing systems." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Start-up mindset, deep dive into past impactful projects." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Machine Coding: Service Booking System", type: "machine_coding", difficulty: "medium", source: "GeeksForGeeks" },
      { question: "Design Professional Allocation System", type: "system_design", difficulty: "hard", source: "Community report" }
    ],
    salaryRanges: { SDE1: { min: 1800000, max: 2800000 }, SDE2: { min: 3200000, max: 4800000 }, SDE3: { min: 5500000, max: 8000000 } },
    avgTimelineDays: 18,
    hiringStatus: "high",
    interviewTips: [
      "Machine coding is very important. Practice clean architecture.",
      "Understand matching algorithms and geo-spatial data for system design.",
      "Urban Company values first-principles thinking."
    ],
    prepResources: [
      { title: "Urban Company Engineering", url: "https://engineering.urbancompany.com/", type: "reading" }
    ]
  },
  {
    companyName: "Freshworks",
    companySlug: "freshworks",
    tier: "tier1_india",
    logoEmoji: "🍃",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "90 min", prep: "DSA + MCQs on networks, OS, databases." },
        { round: 2, type: "Technical Interview 1", duration: "60 min", prep: "DSA (Medium). String, arrays, linked lists." },
        { round: 3, type: "Technical Interview 2", duration: "60 min", prep: "LLD and API Design. Object-oriented programming." },
        { round: 4, type: "HR", duration: "30 min", prep: "Cultural fit, standard behavioral." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design a Ticketing System (LLD)", type: "system_design", difficulty: "medium", source: "Glassdoor" },
      { question: "Valid Parentheses", type: "dsa", difficulty: "easy", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 1400000, max: 2000000 }, SDE2: { min: 2200000, max: 3500000 }, SDE3: { min: 3800000, max: 5500000 } },
    avgTimelineDays: 20,
    hiringStatus: "normal",
    interviewTips: [
      "Strong emphasis on Object-Oriented Design and SOLID principles.",
      "Ruby on Rails or Ember.js knowledge is a plus, but not mandatory.",
      "Focus on customer empathy in behavioral rounds."
    ],
    prepResources: [
      { title: "Freshworks Interview Experience", url: "https://www.geeksforgeeks.org/freshworks-interview-experience/", type: "reading" }
    ]
  },
  {
    companyName: "Zoho",
    companySlug: "zoho",
    tier: "tier1_india",
    logoEmoji: "🏢",
    hiringProcess: {
      totalRounds: 5,
      rounds: [
        { round: 1, type: "Aptitude + C Programming", duration: "90 min", prep: "Paper/pen or portal. Focus on C output tracking, pointers, loops." },
        { round: 2, type: "Programming Round 1", duration: "90 min", prep: "Write code for patterns, matrix manipulation, basic arrays without using built-in libraries." },
        { round: 3, type: "Advanced Programming (LLD)", duration: "120 min", prep: "Design a console application (e.g., Railway Reservation, ATM, Taxi Booking) in C/C++/Java." },
        { round: 4, type: "Technical HR", duration: "45 min", prep: "Deep dive into your advanced programming solution. System fundamentals." },
        { round: 5, type: "General HR", duration: "30 min", prep: "Background, willingness to work in Chennai/Tenkasi." }
      ]
    },
    dsaDifficulty: "easy",
    knownQuestions: [
      { question: "Machine Coding: Railway Reservation System", type: "machine_coding", difficulty: "medium", source: "GeeksForGeeks" },
      { question: "Print matrix in spiral form", type: "dsa", difficulty: "medium", source: "GeeksForGeeks" }
    ],
    salaryRanges: { SDE1: { min: 600000, max: 1200000 }, SDE2: { min: 1200000, max: 2200000 }, SDE3: { min: 2500000, max: 4000000 } },
    avgTimelineDays: 10,
    hiringStatus: "high",
    interviewTips: [
      "Zoho's process is unique: NO LeetCode hard problems. Focus is entirely on basic logic, C/C++/Java fundamentals, and avoiding built-in libraries.",
      "Practice building full console applications from scratch.",
      "They value long-term commitment and foundational computer science knowledge."
    ],
    prepResources: [
      { title: "Zoho Advanced Programming Round", url: "https://www.geeksforgeeks.org/zoho-interview-experience-for-software-developer/", type: "reading" }
    ]
  },
  {
    companyName: "BrowserStack",
    companySlug: "browserstack",
    tier: "unicorn",
    logoEmoji: "🌐",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Machine Coding", duration: "120 min", prep: "Log parsing, simple key-value store, or parallel execution engine." },
        { round: 2, type: "Technical - DSA & OS", duration: "60 min", prep: "OS concepts (threads, processes, memory). Medium DSA." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Design distributed test execution system. Focus on scale and infra." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Past challenges. System architecture discussions." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Parse a large log file efficiently", type: "machine_coding", difficulty: "medium", source: "Glassdoor" },
      { question: "Design a scalable video recording service", type: "system_design", difficulty: "hard", source: "Community report" }
    ],
    salaryRanges: { SDE1: { min: 1800000, max: 2600000 }, SDE2: { min: 3000000, max: 4500000 }, SDE3: { min: 5000000, max: 8000000 } },
    avgTimelineDays: 20,
    hiringStatus: "normal",
    interviewTips: [
      "Extremely high focus on OS concepts, networking, and infrastructure.",
      "System design rounds will test your knowledge of low-level networking and hardware constraints.",
      "Ruby on Rails experience is valued but not required."
    ],
    prepResources: [
      { title: "BrowserStack Engineering", url: "https://www.browserstack.com/engineering", type: "reading" }
    ]
  },
  {
    companyName: "Postman",
    companySlug: "postman",
    tier: "unicorn",
    logoEmoji: "🚀",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Take-home Assignment", duration: "48 hours", prep: "Build a full-stack or backend REST API application. High emphasis on tests, documentation, and code quality." },
        { round: 2, type: "Code Review / Technical Screen", duration: "60 min", prep: "Defend your take-home assignment. Pair programming to add a feature." },
        { round: 3, type: "System Design / Architecture", duration: "60 min", prep: "Design a collaborative API platform or real-time sync system." },
        { round: 4, type: "Values / Founders", duration: "45 min", prep: "Alignment with Postman's developer-first culture." }
      ]
    },
    dsaDifficulty: "easy",
    knownQuestions: [
      { question: "Design Google Docs (Real-time collaboration)", type: "system_design", difficulty: "hard", source: "Community report" },
      { question: "Take-home: Build a rate-limited proxy server", type: "machine_coding", difficulty: "medium", source: "Glassdoor" }
    ],
    salaryRanges: { SDE1: { min: 2000000, max: 3000000 }, SDE2: { min: 3500000, max: 5500000 }, SDE3: { min: 6000000, max: 9000000 } },
    avgTimelineDays: 25,
    hiringStatus: "high",
    interviewTips: [
      "Postman relies heavily on take-home assignments instead of LeetCode. Treat the assignment like production code.",
      "Write exhaustive unit and integration tests.",
      "Understand WebSockets, operational transforms, and collaborative architectures for design."
    ],
    prepResources: [
      { title: "Postman Engineering Blog", url: "https://blog.postman.com/category/engineering/", type: "reading" }
    ]
  },
  {
    companyName: "Unacademy",
    companySlug: "unacademy",
    tier: "unicorn",
    logoEmoji: "🎓",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "90 min", prep: "3 DSA questions." },
        { round: 2, type: "DSA / LLD", duration: "60 min", prep: "LeetCode Medium. Basic class design." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Design live streaming backend, leaderboard, or chat system." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Past experience, handling scale." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design a Live Leaderboard", type: "system_design", difficulty: "medium", source: "Glassdoor" },
      { question: "Search in Rotated Sorted Array", type: "dsa", difficulty: "medium", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 1500000, max: 2200000 }, SDE2: { min: 2500000, max: 4000000 }, SDE3: { min: 4500000, max: 6500000 } },
    avgTimelineDays: 14,
    hiringStatus: "frozen",
    interviewTips: [
      "Focus on real-time systems (WebSockets, Redis Pub/Sub) for design rounds.",
      "Be prepared to discuss handling sudden traffic spikes (e.g., when a popular class starts)."
    ],
    prepResources: [
      { title: "Unacademy Interview Experience", url: "https://www.geeksforgeeks.org/unacademy-interview-experience/", type: "reading" }
    ]
  },
  {
    companyName: "Ola",
    companySlug: "ola",
    tier: "tier1_india",
    logoEmoji: "🚕",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "90 min", prep: "3 DSA questions (Medium/Hard)." },
        { round: 2, type: "DSA Interview", duration: "60 min", prep: "Dynamic Programming, Graphs, Trees." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Design cab matching, pricing engine, or geo-spatial indexing." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Culture fit. High resilience required." }
      ]
    },
    dsaDifficulty: "hard",
    knownQuestions: [
      { question: "Design Surge Pricing System", type: "system_design", difficulty: "hard", source: "Glassdoor" },
      { question: "Word Break", type: "dsa", difficulty: "medium", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 1400000, max: 2200000 }, SDE2: { min: 2400000, max: 3800000 }, SDE3: { min: 4000000, max: 6000000 } },
    avgTimelineDays: 20,
    hiringStatus: "normal",
    interviewTips: [
      "Geo-spatial algorithms (Quadtrees, Geohashes) are crucial for System Design.",
      "Expect standard LeetCode hard questions in the technical rounds.",
      "Culture is known to be demanding; show resilience in behavioral rounds."
    ],
    prepResources: [
      { title: "System Design: Uber/Ola", url: "https://www.youtube.com/watch?v=umWABit-wbk", type: "video" }
    ]
  },
  {
    companyName: "InMobi",
    companySlug: "inmobi",
    tier: "unicorn",
    logoEmoji: "📱",
    hiringProcess: {
      totalRounds: 4,
      rounds: [
        { round: 1, type: "Technical Screen", duration: "60 min", prep: "DSA (Medium) + Core Java/C++ fundamentals." },
        { round: 2, type: "DSA / LLD", duration: "60 min", prep: "Data structures and low level design." },
        { round: 3, type: "System Design", duration: "60 min", prep: "Ad-tech architecture. Low latency, high throughput systems." },
        { round: 4, type: "Hiring Manager", duration: "45 min", prep: "Past projects, culture fit." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design an Ad Server", type: "system_design", difficulty: "hard", source: "Glassdoor" },
      { question: "Top K Frequent Elements", type: "dsa", difficulty: "medium", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 1800000, max: 2600000 }, SDE2: { min: 3000000, max: 4500000 }, SDE3: { min: 5000000, max: 7500000 } },
    avgTimelineDays: 20,
    hiringStatus: "normal",
    interviewTips: [
      "Ad-tech requires extreme low latency (p99 < 50ms). Focus on in-memory caches, CDN, and async processing.",
      "Big data ecosystem knowledge (Hadoop, Spark, Kafka) is a huge plus."
    ],
    prepResources: [
      { title: "InMobi Technology Blog", url: "https://www.inmobi.com/blog/technology", type: "reading" }
    ]
  },
  {
    companyName: "Google India",
    companySlug: "google-india",
    tier: "faang_india",
    logoEmoji: "🔍",
    hiringProcess: {
      totalRounds: 5,
      rounds: [
        { round: 1, type: "Phone Screen", duration: "45 min", prep: "1 DSA question (Medium). Focus on communication and thinking out loud." },
        { round: 2, type: "Onsite 1 - DSA", duration: "45 min", prep: "DSA Hard. Trees, Graphs, DP. Must be bug-free." },
        { round: 3, type: "Onsite 2 - DSA", duration: "45 min", prep: "DSA Hard. Focus on optimization and edge cases." },
        { round: 4, type: "Onsite 3 - System Design / DSA", duration: "45 min", prep: "System Design for L4+. DSA for L3." },
        { round: 5, type: "Googleyness & Leadership", duration: "45 min", prep: "Behavioral. Handling ambiguity, conflict resolution." }
      ]
    },
    dsaDifficulty: "very_hard",
    knownQuestions: [
      { question: "Design Google Auto-complete", type: "system_design", difficulty: "hard", source: "Glassdoor" },
      { question: "Longest Path in a Matrix", type: "dsa", difficulty: "hard", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 3000000, max: 4500000 }, SDE2: { min: 5000000, max: 8000000 }, SDE3: { min: 8000000, max: 15000000 } },
    avgTimelineDays: 60,
    hiringStatus: "normal",
    interviewTips: [
      "Google evaluates heavily on code quality — variable names, modularity, and handling edge cases.",
      "Always state the time and space complexity before writing code.",
      "Be prepared for the process to take 2-3 months."
    ],
    prepResources: [
      { title: "Google Interview Prep Guide", url: "https://careers.google.com/interview-tips/", type: "reading" }
    ]
  },
  {
    companyName: "Amazon India",
    companySlug: "amazon-india",
    tier: "faang_india",
    logoEmoji: "📦",
    hiringProcess: {
      totalRounds: 5,
      rounds: [
        { round: 1, type: "Online Assessment", duration: "90 min", prep: "2 DSA (Medium). Amazon work style simulation." },
        { round: 2, type: "Technical Screen", duration: "60 min", prep: "1-2 DSA questions. 10 mins on Leadership Principles." },
        { round: 3, type: "Onsite 1 - DSA + LP", duration: "60 min", prep: "DSA (Medium/Hard) + 20 mins Leadership Principles." },
        { round: 4, type: "Onsite 2 - System Design + LP", duration: "60 min", prep: "System Design (LLD for SDE1, HLD for SDE2) + LP." },
        { round: 5, type: "Bar Raiser", duration: "60 min", prep: "Deep dive behavioral on Leadership Principles + System Design." }
      ]
    },
    dsaDifficulty: "medium",
    knownQuestions: [
      { question: "Design Amazon Checkout System", type: "system_design", difficulty: "hard", source: "Glassdoor" },
      { question: "Number of Islands", type: "dsa", difficulty: "medium", source: "LeetCode" }
    ],
    salaryRanges: { SDE1: { min: 2500000, max: 3500000 }, SDE2: { min: 4500000, max: 7000000 }, SDE3: { min: 8000000, max: 13000000 } },
    avgTimelineDays: 30,
    hiringStatus: "high",
    interviewTips: [
      "Leadership Principles (LPs) are 50% of the interview. Prepare STAR stories for every LP.",
      "Amazon prefers practical, scalable design over academic perfection.",
      "Bar Raiser round is critical — do not contradict your earlier LP stories."
    ],
    prepResources: [
      { title: "Amazon Leadership Principles", url: "https://www.amazon.jobs/content/en/our-workplace/leadership-principles", type: "reading" }
    ]
  }
];
