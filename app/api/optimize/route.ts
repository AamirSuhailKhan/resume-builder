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
You are an expert Career Coach and Application Maximizer.

Your goal is to completely rewrite and optimize the user's resume for the provided job description, maximize their shortlist chances, and generate a complete application package.

Rules:
- Tailor strictly to the job description.
- Remove generic content and improve clarity.
- Add strong action verbs and measurable impact to bullet points.
- Suggest realistic metrics (do NOT fabricate unrealistic numbers, suggest ranges if unsure).
- Keep it believable, professional, human, and natural.
- Recommend proof links or artifacts for achievements.
- Generate a final tailored resume, a cover letter, and a short professional HR email.
- Tone should be confident, concise, and role-specific.

-------------------------------------
INPUTS:
1. Resume Text
2. Job Description Text
-------------------------------------

OUTPUT FORMAT (STRICT JSON ONLY):

{
  "tailored_package": {
    "resume": "Full rewritten resume text tailored to the job",
    "cover_letter": "Confident, tailored cover letter",
    "email": "Short, professional HR email"
  },
  "optimizations": [
    {
      "original": "Exact original line from resume",
      "improved": "Rewritten line with action verbs and metrics",
      "reason": "Explanation for the change",
      "impact": "How this improves shortlist chances"
    }
  ],
  "metrics_and_proof": {
    "suggested_metrics": [
      "Specific realistic metric suggestion (e.g. 'Improved performance by 15-20%')"
    ],
    "proof_suggestions": [
      {
        "achievement": "The stated achievement",
        "suggested_proof": "What artifact to link (e.g., GitHub repo, Figma file)"
      }
    ]
  }
}

-------------------------------------
FINAL RULE:
Return ONLY valid JSON.
No markdown.
No explanation.
No extra text.

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

    // Validate and sanitize the AI response
    return NextResponse.json({
      tailored_package: {
        resume: result?.tailored_package?.resume || "",
        cover_letter: result?.tailored_package?.cover_letter || "",
        email: result?.tailored_package?.email || "",
      },
      optimizations: Array.isArray(result?.optimizations) ? result.optimizations.map((opt: any) => ({
        original: String(opt?.original || ''),
        improved: String(opt?.improved || ''),
        reason: String(opt?.reason || ''),
        impact: String(opt?.impact || '')
      })) : [],
      metrics_and_proof: {
        suggested_metrics: Array.isArray(result?.metrics_and_proof?.suggested_metrics) ? result.metrics_and_proof.suggested_metrics.map(String) : [],
        proof_suggestions: Array.isArray(result?.metrics_and_proof?.proof_suggestions) ? result.metrics_and_proof.proof_suggestions.map((p: any) => ({
          achievement: String(p?.achievement || ''),
          suggested_proof: String(p?.suggested_proof || '')
        })) : []
      }
    });

  } catch (error: any) {
    console.error('Optimize Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate application package' },
      { status: 500 }
    );
  }
}
