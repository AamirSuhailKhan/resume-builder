import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

const MOCK_PREP_PACKAGE = {
  overview: {
    company: "Razorpay",
    role: "Software Engineer",
    totalRounds: 4,
    processDuration: "3-4 weeks",
    difficulty: "High",
    ctcRange: "₹28L - ₹45L",
    summary: "Focuses heavily on DSA, system architecture, database transactional safety, and behavioral STAR scenarios."
  },
  repeated: [
    {
      id: "r1",
      q: "How would you design a distributed rate limiter that handles up to 50k requests per second cleanly?",
      round: "DSA",
      difficulty: "Medium",
      frequency: 82,
      frequencyLabel: "Asked in 82% of interviews",
      topic: "Arrays",
      bookmarked: false,
      practiced: false
    },
    {
      id: "r2",
      q: "Design an idempotent payment API gateway that guarantees zero-loss transaction handling under network splits.",
      round: "SystemDesign",
      difficulty: "Hard",
      frequency: 74,
      frequencyLabel: "Asked in 74% of interviews",
      topic: "Scalability",
      bookmarked: false,
      practiced: false
    },
    {
      id: "r3",
      q: "Tell me about a time you designed a high-throughput queue system and had to trade off write latency for consistency.",
      round: "Behavioral",
      difficulty: "Easy",
      frequency: 68,
      frequencyLabel: "Asked in 68% of interviews",
      topic: "Ownership",
      bookmarked: false,
      practiced: false
    },
    {
      id: "r4",
      q: "Why do you want to join our engineering team, and what is your expectations around engineering ownership?",
      round: "HR",
      difficulty: "Easy",
      frequency: 60,
      frequencyLabel: "Asked in 60% of interviews",
      topic: "Salary",
      bookmarked: false,
      practiced: false
    }
  ],
  technical: [
    {
      id: "t1",
      q: "Implement a memory-efficient LRU cache that supports constant time O(1) reads and writes under high concurrency.",
      round: "DSA",
      difficulty: "Hard",
      frequency: 70,
      frequencyLabel: "Asked in 70% of interviews",
      topic: "DP",
      timeComplexityHint: "O(1)",
      category: "Data Structures",
      bookmarked: false,
      practiced: false
    },
    {
      id: "t2",
      q: "Write an efficient algorithm to detect cycles in a directed graph representing package dependencies.",
      round: "DSA",
      difficulty: "Medium",
      frequency: 65,
      frequencyLabel: "Asked in 65% of interviews",
      topic: "Graphs",
      timeComplexityHint: "O(V+E)",
      category: "Graph Traversal",
      bookmarked: false,
      practiced: false
    },
    {
      id: "t3",
      q: "Explain ACID isolation levels and how you prevent write skew in highly concurrent postgres databases.",
      round: "Technical",
      difficulty: "Medium",
      frequency: 58,
      frequencyLabel: "Asked in 58% of interviews",
      topic: "DBMS",
      timeComplexityHint: "N/A",
      category: "Database Design",
      bookmarked: false,
      practiced: false
    },
    {
      id: "t4",
      q: "What is the difference between a process and a thread, and how does the Node.js event loop leverage asynchronous OS APIs?",
      round: "Technical",
      difficulty: "Easy",
      frequency: 50,
      frequencyLabel: "Asked in 50% of interviews",
      topic: "OS",
      timeComplexityHint: "N/A",
      category: "Operating Systems",
      bookmarked: false,
      practiced: false
    }
  ],
  systemDesign: [
    {
      id: "s1",
      q: "Design a system to stream large-scale system logs securely and efficiently to an analytical data store.",
      round: "SystemDesign",
      difficulty: "Hard",
      frequency: 75,
      frequencyLabel: "Asked in 75% of interviews",
      topic: "Payments",
      category: "Design a distributed payment system",
      bookmarked: false,
      practiced: false
    },
    {
      id: "s2",
      q: "Design a push-notification system that can deliver 10 million alerts within 60 seconds with strict order guarantees.",
      round: "SystemDesign",
      difficulty: "Hard",
      frequency: 60,
      frequencyLabel: "Asked in 60% of interviews",
      topic: "Real-time",
      category: "Design a real-time notification service",
      bookmarked: false,
      practiced: false
    },
    {
      id: "s3",
      q: "Design a highly scalable URL shortening service like Bitly with high-density read caching and analytics.",
      round: "SystemDesign",
      difficulty: "Medium",
      frequency: 50,
      frequencyLabel: "Asked in 50% of interviews",
      topic: "Caching",
      category: "Design a distributed cache",
      bookmarked: false,
      practiced: false
    }
  ],
  behavioral: [
    {
      id: "b1",
      q: "Tell me about a time you had to deliver a critical high-priority technical project under extremely tight deadlines.",
      round: "Behavioral",
      difficulty: "Medium",
      frequency: 80,
      frequencyLabel: "Asked in 80% of interviews",
      topic: "Ownership",
      category: "Tests ownership and bias for action",
      bookmarked: false,
      practiced: false
    },
    {
      id: "b2",
      q: "Describe a situation where you had a strong technical disagreement with a team lead or architect. How did you resolve it?",
      round: "HR",
      difficulty: "Easy",
      frequency: 72,
      frequencyLabel: "Asked in 72% of interviews",
      topic: "Culture",
      category: "Tests culture fit",
      bookmarked: false,
      practiced: false
    },
    {
      id: "b3",
      q: "Tell me about a technical mistake you made in production. What was the impact, and what guardrails did you implement after?",
      round: "Manager",
      difficulty: "Medium",
      frequency: 55,
      frequencyLabel: "Asked in 55% of interviews",
      topic: "Conflict",
      category: "Tests conflict resolution",
      bookmarked: false,
      practiced: false
    }
  ],
  tips: [
    {
      type: "process",
      text: "Expect 2 DSA rounds, 1 extensive System Design round, and 1 Hiring Manager round focusing heavily on past scale stories."
    },
    {
      type: "culture",
      text: "Hiring bars prioritize direct ownership, bias for action, and deep technical depth over years of generic management experience."
    },
    {
      type: "warning",
      text: "Candidates often fail by only reciting textbook DSA solutions without discussing real-world performance tradeoffs."
    },
    {
      type: "salary",
      text: "Prepare data points on local benchmarks (e.g., top percentile salaries for Tier-1 India tech hubs like Bangalore)."
    }
  ]
};

const MOCK_EVALUATION = {
  score: 8,
  scoreLabel: "Good - would likely proceed to the next round",
  goodPoints: [
    "Well-structured STAR approach used explicitly.",
    "Addressed both database bottleneck details and write isolation.",
    "Clear separation of team metrics vs your direct impact."
  ],
  missingPoints: [
    "Include specific queries per second (QPS) metrics in the situation description.",
    "Discuss database partitioning or sharding options under write splits."
  ],
  modelAnswer: "An ideal answer details high-density write partitioning, optimistic locking in transaction logic, and strict write-through caching configuration.",
  nextTip: "Spend 20% more time quantifying specific QPS metrics and hardware boundaries."
};

const MOCK_TEXT_RESPONSES = [
  "To structure a compelling answer here, follow the **STAR** method (Situation, Task, Action, Result) with an emphasis on technical tradeoffs:\n\n1. **Situation**: Set the scene. For instance, 'At TechCorp, our monolithic payment gateway experienced 5% database lock contention under peak sales event load.'\n2. **Action**: Describe *your* specific actions and choices. 'I introduced Redis as a write-through cache and decoupled payment ledger writes via a Kafka event queue.'\n3. **Result**: Share metrics. 'This lowered DB CPU utilization by 40% and guaranteed zero-loss payment consistency.'\n\nWould you like to try mock-answering this question yourself?",
  "That is a great response! To take this answer to a **senior or staff level** in India's top tech firms (like Razorpay or Flipkart), emphasize these points:\n\n- **Tradeoffs**: Discuss explicitly why you chose one database over another (e.g., PostgreSQL for transactional safety vs. DynamoDB for horizontal scale).\n- **Scale Metrics**: Instead of just saying 'high volume,' quote concrete numbers (e.g., 20,000 requests per second, 99th percentile latency of under 50ms).\n- **Ownership**: Clearly isolate your personal contribution from the team's general output.\n\nLet's re-run this drill. Focus on these three metrics and see how your score improves!",
  "Great question. From a system design perspective, when building for high scalability, you must address two key bottlenecks:\n\n1. **State Persistence**: Avoid database locks by using read replicas, vertical sharding, and optimistic locking mechanisms.\n2. **Network I/O**: Utilize HTTP/2 or gRPC, gzip compression, and secure edge-caching via Cloudflare to keep latency minimal.\n\nWould you like to draft a quick architecture diagram or write down the key database schemas first?"
] as const;

function getMockResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("prep package") || lower.includes("repeated") || lower.includes("overview")) {
    return JSON.stringify(MOCK_PREP_PACKAGE);
  }
  
  if (lower.includes("strict but fair") || lower.includes("evaluator") || lower.includes("score")) {
    return JSON.stringify(MOCK_EVALUATION);
  }

  if (lower.includes("evaluate") || lower.includes("score") || lower.includes("feedback")) {
    return MOCK_TEXT_RESPONSES[1];
  }
  if (lower.includes("system") || lower.includes("design") || lower.includes("architecture")) {
    return MOCK_TEXT_RESPONSES[2];
  }
  return MOCK_TEXT_RESPONSES[0];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { messages, system, stream, model } = body;
    const prompt = messages?.[0]?.content || "";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isMockKey = !apiKey || apiKey === "xxx" || apiKey.startsWith("mock");

    if (isMockKey) {
      console.warn("[ClaudeProxy] Using intelligent local sandbox responder because ANTHROPIC_API_KEY is not configured.");
      
      const responseText = getMockResponse(prompt);

      if (stream) {
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
          async start(controller) {
            const words = responseText.split(/(\s+)/);
            for (let i = 0; i < words.length; i++) {
              const word = words[i];
              const eventPayload = `data: ${JSON.stringify({ delta: { text: word } })}\n\n`;
              controller.enqueue(encoder.encode(eventPayload));
              await new Promise((resolve) => setTimeout(resolve, Math.max(5, 20 - i * 0.1)));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });

        return new Response(customStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }

      return NextResponse.json({
        content: [{ type: "text", text: responseText }],
        usage: { input_tokens: 10, output_tokens: responseText.length / 4 },
      });
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-3-5-sonnet-latest",
        max_tokens: body.max_tokens || 1000,
        system,
        stream,
        messages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text().catch(() => "");
      console.error(`[ClaudeProxy] Anthropic API failed: Status ${anthropicResponse.status}. Details: ${errorText}`);
      
      const responseText = getMockResponse(prompt);
      return NextResponse.json({
        content: [{ type: "text", text: responseText }],
        usage: { input_tokens: 10, output_tokens: responseText.length / 4 },
      });
    }

    if (stream && anthropicResponse.body) {
      return new Response(anthropicResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const jsonData = await anthropicResponse.json();
    return NextResponse.json(jsonData);
  } catch (error: any) {
    console.error("[ClaudeProxy] Error occurred:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
