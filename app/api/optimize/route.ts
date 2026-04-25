import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { resumeData, jobDescription } = await req.json();

    if (!resumeData || !jobDescription?.trim()) {
      return NextResponse.json({ error: 'Missing resumeData or jobDescription' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an enterprise-grade ATS system AND expert resume writer.

Analyze the candidate resume against the job description. Then rewrite the resume to maximize ATS score.

STRICT RULES:
- Return ONLY valid JSON. No prose outside JSON.
- "score" must be 0-100 integer (AFTER optimization, not before)
- "matched" and "missing" are keyword arrays from the job description
- "percentage" is matched / total job keywords * 100
- "improved.summary" must be a single string
- "improved.experience" is indexed by position in the original experience array
- "improved.experience[].points" must be a string (bullet points separated by newlines)
- "improved.skills" must be string[]
- DO NOT invent jobs or companies. Only rephrase existing content.
- Score 90-100 ONLY for near-perfect matches. Be strict.

Return this EXACT JSON structure:
{
  "score": 82,
  "keywordMatchData": {
    "matched": ["React", "TypeScript"],
    "missing": ["Docker", "CI/CD"],
    "percentage": 71
  },
  "improved": {
    "summary": "Rewritten professional summary here...",
    "experience": [
      {
        "index": 0,
        "points": "• Achievement one with metrics\\n• Achievement two aligned to job"
      }
    ],
    "skills": ["React", "TypeScript", "Docker"]
  }
}

Resume:
${JSON.stringify(resumeData)}

Job Description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const raw = response.text ?? '{}';
    const result = JSON.parse(raw);

    // ── Validate and sanitize the AI response ─────────────────────────────
    const score = typeof result?.score === 'number'
      ? Math.max(0, Math.min(92, result.score)) // cap at 92
      : 60;

    const keywordMatchData = {
      matched: Array.isArray(result?.keywordMatchData?.matched) ? result.keywordMatchData.matched : [],
      missing: Array.isArray(result?.keywordMatchData?.missing) ? result.keywordMatchData.missing : [],
      percentage: typeof result?.keywordMatchData?.percentage === 'number' ? result.keywordMatchData.percentage : 0,
    };

    const improved = {
      summary: typeof result?.improved?.summary === 'string' ? result.improved.summary : '',
      experience: Array.isArray(result?.improved?.experience) ? result.improved.experience.map((e: any) => ({
        index: typeof e?.index === 'number' ? e.index : 0,
        points: typeof e?.points === 'string' ? e.points
          : Array.isArray(e?.points) ? e.points.join('\n')
          : '',
      })) : [],
      skills: Array.isArray(result?.improved?.skills) ? result.improved.skills.map(String) : [],
    };

    return NextResponse.json({ score, keywordMatchData, improved });

  } catch (error: any) {
    console.error('Optimize Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to optimize resume' },
      { status: 500 }
    );
  }
}
