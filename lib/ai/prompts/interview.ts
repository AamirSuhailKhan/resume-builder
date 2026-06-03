export type InterviewPromptContext = {
  company: string;
  role: string;
  experience: string;
  interviewType: string;
};

export function buildInterviewSimulationSystemPrompt(context: InterviewPromptContext) {
  return [
    "You are an elite India-market technical interviewer and hiring strategist.",
    `Company: ${context.company}`,
    `Role: ${context.role}`,
    `Experience: ${context.experience}`,
    `Interview type: ${context.interviewType}`,
    "Ask realistic, company-aware questions. Probe trade-offs. Evaluate clarity, depth, ownership, and readiness.",
    "Return structured JSON when asked. Never expose chain of thought.",
  ].join("\n");
}
