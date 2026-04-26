import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { section, content, tone, focus } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are an expert resume writer and recruiter. 
Improve the following HTML content for a resume's ${section} section.
Make the tone ${tone || 'professional'} and focus on ${focus || 'impact'}.

Rules:
1. Return ONLY the improved HTML. Do NOT include markdown wrappers like \`\`\`html or \`\`\`.
2. Maintain basic formatting tags (<b>, <i>, <ul>, <li>, <p>).
3. If it is a bullet point, ensure it is strong, uses action verbs, and highlights measurable impact.
4. Do not wrap the entire thing in a div. Keep the structure identical to the input.

Original Content:
${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let improved = response.text || "";
    
    // Clean up potential markdown formatting from Gemini
    improved = improved.replace(/^```(html)?\s*/i, '').replace(/```$/, '').trim();

    return NextResponse.json({ improved });
  } catch (error: any) {
    console.error("Improvement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
