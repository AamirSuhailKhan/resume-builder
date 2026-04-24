import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { resumeData, jobDescription } = await req.json();

    if (!resumeData) {
      return NextResponse.json({ error: 'Missing resume data' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
You are an enterprise ATS system like Workday or Greenhouse.

Analyze the resume against the job description VERY STRICTLY.

SCORING RULES:
- 90–100 → ONLY if near perfect match
- 70–89 → good but missing some important skills
- 50–69 → partial match
- below 50 → weak match

IMPORTANT:
- DO NOT give 100 unless ALL major skills are present
- Penalize missing tools (e.g. Docker, CI/CD, etc.)
- Penalize missing experience depth
- Penalize vague summaries

Return ONLY valid JSON:

{
  "score": number,
  "keywordMatchData": {
    "matched": string[],
    "missing": string[],
    "percentage": number
  },
  "suggestions": string[]
}

Resume:
${JSON.stringify(resumeData)}

Job Description:
${jobDescription || ""}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    const result = JSON.parse(resultText);

    if (typeof result.score === "number") {
      result.score = Math.min(result.score, 92);
    }

    console.log("ATS AI RESULT:", result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI ATS Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to analyze resume' }, { status: 500 });
  }
}
