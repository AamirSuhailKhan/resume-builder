# System Architecture Overview

This directory contains the core architectural diagrams and documentation for the production-ready AI Resume Builder & Job Intelligence SaaS.

## Queue Flow (BullMQ + Redis)

```mermaid
graph TD
    A[Next.js API Routes] -->|Enqueue| B(Redis Queue)
    B --> C{Worker Process}
    C -->|Process| D[Job Sync Queue]
    C -->|Process| E[ATS Analysis Queue]
    C -->|Process| F[Analytics Queue]
    C -->|Process| G[Cleanup Queue]
    
    D -->|Updates| H[(PostgreSQL)]
    E -->|Calls| I[OpenAI API]
    I -->|Returns JSON| E
    E -->|Saves| H
```

## ATS Analysis Pipeline

```mermaid
sequenceDiagram
    participant User
    participant Next.js
    participant Queue
    participant Worker
    participant OpenAI
    
    User->>Next.js: Upload Resume & Target Job
    Next.js->>Queue: Enqueue 'ats_analysis' Job
    Next.js-->>User: Return Job ID (Polling/SSE)
    
    Queue->>Worker: Pick up 'ats_analysis' Job
    Worker->>OpenAI: Request structured JSON analysis
    OpenAI-->>Worker: Return ATS score, gaps, enhancements
    Worker->>PostgreSQL: Save AIUsage, update Job record
    
    Next.js->>User: Display optimized results
```

## Job Ingestion Flow

```mermaid
graph LR
    A[Provider Adapters] -->|Fetch| B(Normalizer)
    B -->|Filter Duplicates| C(Deduplication Logic)
    C -->|Upsert| D[(PostgreSQL JobOpportunities)]
    
    subgraph Providers
    L[LinkedIn]
    I[Indeed]
    G[Greenhouse]
    end
    
    L --> A
    I --> A
    G --> A
```
