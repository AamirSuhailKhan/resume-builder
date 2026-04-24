import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { resumeData, jobDescription } = await req.json();

    if (!resumeData || !jobDescription) {
      return NextResponse.json({ error: 'Missing resume data or job description' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
You are an expert resume writer and ATS optimization specialist.
I will provide you with a candidate's resume and a target job description.

Your task:
1. Analyze the job description for critical keywords, skills, and qualifications.
2. Rewrite the resume's "summary" to naturally align with the job's core focus and include top keywords.
3. Rewrite the "experience" bullets to emphasize relevant achievements that match the job description, seamlessly weaving in missing keywords. DO NOT invent fake jobs, but DO rephrase existing experience to highlight transferable skills.
4. Update the "skills" array by adding any highly relevant missing skills from the job description if they logically align with the candidate's background.

Return ONLY valid JSON.
RULES:
- skills must be an array of strings
- experience must be an array of objects
- do not return text outside JSON

Return format:
{
  "summary": "...",
  "experience": [
    {
      "role": "...",
      "company": "...",
      "description": "..." 
    }
  ],
  "skills": ["...", "..."]
}

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Target Job Description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    const optimizedData = JSON.parse(resultText);

    return NextResponse.json({ optimizedData });
  } catch (error: any) {
    console.error("AI Optimize Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to optimize resume' }, { status: 500 });
  }
}
