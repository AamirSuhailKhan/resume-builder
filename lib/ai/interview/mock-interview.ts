import { z } from "zod";
import { structuredJSON } from "@/lib/ai/structured";

export const AdaptiveMockQuestionSchema = z.object({
  nextQuestion: z.string(),
  interviewerPersonaState: z.enum(["supportive", "neutral", "clarifying", "challenging", "pressure_testing"]),
  focusTopic: z.string(),
  rationale: z.string(),
  isInterviewComplete: z.boolean(),
});

export type AdaptiveMockQuestion = z.infer<typeof AdaptiveMockQuestionSchema>;

const INTERVIEW_SYSTEM_PROMPT = `You are an elite, highly experienced technical interviewer at a tier-1 Indian tech firm (e.g. Razorpay, Swiggy, Google India).
Your style is professional, sharp, and conversational. You do NOT just read questions from a list.
You listen to the candidate's response, assess its depth, and then ask an adaptive follow-up question.

RULES:
1. Probe deeper: if the candidate says "we used MongoDB", ask why MongoDB, what tradeoffs they evaluated, and how it handles consistency.
2. Pressure test: if the answer is solid, increase the difficulty. Ask: "How would this design change if traffic increased 100x?" or "How does this handle network partitions?"
3. Interrupt or challenge assumptions politely but firmly (e.g. "Wait, but wouldn't that cause a bottleneck at the write database?").
4. Keep questions concise and realistic — just like a real engineering leader would speak in an interview.
5. If the interview has gone on for 5+ rounds or has reached a natural conclusion, mark isInterviewComplete as true.`;

export class AdaptiveMockInterviewEngine {
  static async startSession(
    roleTitle: string,
    companyName: string | undefined,
    resumeSummary: string | undefined
  ): Promise<AdaptiveMockQuestion> {
    const userPrompt = `
Start a brand new mock interview session.
Role: ${roleTitle}
${companyName ? `Target Company: ${companyName}` : ""}
${resumeSummary ? `Candidate Resume Context: ${resumeSummary}` : ""}

Please ask a compelling, open-ended first question tailored to this role and company.
For example, for a Razorpay backend SDE2 role, ask about designing a payments queue, idempotency, or transaction handling. For a Google L4 role, ask an algorithmic or scalable design question.`;

    const fallback: AdaptiveMockQuestion = {
      nextQuestion: "Let's start. Tell me about a highly scalable backend feature you built. What were the key challenges and how did you resolve them?",
      interviewerPersonaState: "neutral",
      focusTopic: "Architecture & Scaling",
      rationale: "Standard open-ended warm-up question to probe past technical depth.",
      isInterviewComplete: false,
    };

    return structuredJSON({
      system: INTERVIEW_SYSTEM_PROMPT,
      user: userPrompt,
      schema: AdaptiveMockQuestionSchema,
      fallback,
    });
  }

  static async processResponse(
    roleTitle: string,
    companyName: string | undefined,
    transcript: Array<{ speaker: "interviewer" | "candidate"; text: string }>,
    candidateResponse: string
  ): Promise<AdaptiveMockQuestion> {
    const formattedTranscript = transcript
      .map((entry) => `${entry.speaker === "interviewer" ? "Interviewer" : "Candidate"}: ${entry.text}`)
      .join("\n");

    const userPrompt = `
Role: ${roleTitle}
${companyName ? `Target Company: ${companyName}` : ""}

Interview History:
${formattedTranscript}

Latest Candidate Response:
"${candidateResponse}"

Assess this response:
- Is it shallow, medium, or high depth?
- Did they gloss over details? (e.g. skipped scale, ignored tradeoffs, mentioned technologies without justification).
- Formulate the next adaptive follow-up question. Be a realistic interviewer. If they gave a great answer, challenge their architecture or push the limits of their system.
- If they have answered at least 3-4 deep questions, you can consider wrapping up the interview by setting isInterviewComplete: true.`;

    const fallback: AdaptiveMockQuestion = {
      nextQuestion: "That's interesting. Could you double click on the database choice? Why did you choose that over a transactional relational database, and how did you handle data consistency?",
      interviewerPersonaState: "challenging",
      focusTopic: "Database Tradeoffs",
      rationale: "Probing database consistency and rationale as candidate response lacked specific tradeoffs.",
      isInterviewComplete: false,
    };

    return structuredJSON({
      system: INTERVIEW_SYSTEM_PROMPT,
      user: userPrompt,
      schema: AdaptiveMockQuestionSchema,
      fallback,
    });
  }
}
