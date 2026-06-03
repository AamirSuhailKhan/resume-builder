import { z } from "zod";
import { structuredJSON } from "@/lib/ai/structured";

export const InterviewEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  rubric: z.object({
    technicalDepth: z.object({
      score: z.number().min(0).max(100),
      feedback: z.string(),
    }),
    communication: z.object({
      score: z.number().min(0).max(100),
      feedback: z.string(),
    }),
    problemSolving: z.object({
      score: z.number().min(0).max(100),
      feedback: z.string(),
    }),
    starBehavioral: z.object({
      score: z.number().min(0).max(100),
      feedback: z.string(),
    }),
    tradeoffThinking: z.object({
      score: z.number().min(0).max(100),
      feedback: z.string(),
    }),
  }),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  improvedAnswerExample: z.string(),
  nextDrill: z.string(),
});

export type InterviewEvaluation = z.infer<typeof InterviewEvaluationSchema>;

const SYSTEM_PROMPT = `You are a world-class senior technical recruiter and principal engineering evaluator.
Your evaluation is direct, constructive, and detailed. You avoid generic platitudes.
You look for concrete evidence of:
1. Technical Depth: deep knowledge of system internals, protocol details, concurrency patterns.
2. Tradeoff Thinking: evaluating alternative designs (cost vs latency vs reliability).
3. Problem Solving: first-principles analytical reasoning.
4. Communication: structured, clean, and logical.
5. STAR Behavioral: clear situation, action, concrete result, and learning.

Provide a highly customized 'improvedAnswerExample' which writes out exactly how the candidate should have framed their primary technical achievement or system design, loaded with metrics, architectural details, and robust tradeoff justifications.`;

export class InterviewEvaluationEngine {
  static async evaluate(
    roleTitle: string,
    companyName: string | undefined,
    transcript: Array<{ speaker: "interviewer" | "candidate"; text: string }>
  ): Promise<InterviewEvaluation> {
    const formattedTranscript = transcript
      .map((entry) => `${entry.speaker === "interviewer" ? "Interviewer" : "Candidate"}: ${entry.text}`)
      .join("\n");

    const userPrompt = `
Role Title: ${roleTitle}
${companyName ? `Company Name: ${companyName}` : ""}

Interview Session Transcript:
${formattedTranscript}

Perform a rigorous evaluation of the candidate's performance across all rounds of questioning.
Analyze their strengths, weaknesses, gaps in their logic, and areas where they lacked technical depth.
Provide a high-fidelity 'improvedAnswerExample' that models a stellar answer for their main technical prompt.

Return ONLY a valid JSON matching this exact structure:
{
  "score": number (0-100),
  "summary": "two sentence overall summary",
  "rubric": {
    "technicalDepth": { "score": number, "feedback": "string" },
    "communication": { "score": number, "feedback": "string" },
    "problemSolving": { "score": number, "feedback": "string" },
    "starBehavioral": { "score": number, "feedback": "string" },
    "tradeoffThinking": { "score": number, "feedback": "string" }
  },
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "improvedAnswerExample": "A complete, perfectly-crafted, realistic response that they could have given to stand out as a top 1% candidate.",
  "nextDrill": "A highly focused, actionable exercise to perform next."
}`;

    const fallback: InterviewEvaluation = {
      score: 72,
      summary: "Good effort showing solid understanding of functional design. However, the responses lacked quantitative metrics and deep justification of architectural tradeoffs.",
      rubric: {
        technicalDepth: { score: 70, feedback: "Understood standard technology usages but didn't dive deep into protocol or database sharding internals." },
        communication: { score: 78, feedback: "Logical structure and clear flow, but can be more concise." },
        problemSolving: { score: 70, feedback: "Solved direct questions well, but struggled when challenged on scaling constraints." },
        starBehavioral: { score: 75, feedback: "STAR structure was visible, but lacked clear final outcomes and business impact metrics." },
        tradeoffThinking: { score: 68, feedback: "Ad-hoc technology choices. Needs to present structured comparisons between options." },
      },
      strengths: [
        "Clearly articulated system flow",
        "Honest recognition of scaling bottlenecks",
      ],
      improvements: [
        "Include production scale metrics (TPS, latency percentiles)",
        "Provide direct trade-off analysis (e.g. SQL vs NoSQL, memory vs network)",
      ],
      improvedAnswerExample: "To design a payment ledger system under 10,000 TPS, I would use an event-driven architecture using Kafka for transaction streams, processing each transaction idempotently with a unique idempotent key. I would employ a relational database with strict serializable isolation to guarantee ledger balance accuracy, routing read traffic to high-performance Redis cache instances. This balances safety and throughput perfectly...",
      nextDrill: "Practice a timed 3-minute explanation of a complex project focusing strictly on why architectural decisions were made and their quantitative outcomes.",
    };

    return structuredJSON({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      schema: InterviewEvaluationSchema,
      fallback,
    });
  }
}
