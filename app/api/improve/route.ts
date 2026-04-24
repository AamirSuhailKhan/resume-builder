import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { resumeData } = await req.json();

    if (!resumeData) {
      return NextResponse.json({ error: 'Missing resume data' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
You are a professional resume writer.

Improve the following resume and return ONLY valid JSON.

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

Resume:
${JSON.stringify(resumeData, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    const improvedData = JSON.parse(resultText);

    return NextResponse.json({ improvedData });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to improve resume' }, { status: 500 });
  }
}
