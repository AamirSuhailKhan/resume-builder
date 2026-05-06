import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { jobTitle } = await req.json();

    if (!jobTitle || typeof jobTitle !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid jobTitle' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are a recruiter. Generate a realistic, detailed job description for the role: "${jobTitle}". Include required skills, tools, and responsibilities. Return ONLY valid JSON in this format:
{
  "jobDescription": "Full job description text here..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const resultText = response.text || '{}';
    const result = JSON.parse(resultText);

    if (!result.jobDescription) {
      throw new Error('AI did not return a valid job description');
    }

    return NextResponse.json({ jobDescription: result.jobDescription });
  } catch (error: any) {
    console.error('Generate Job Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate job description' }, { status: 500 });
  }
}
