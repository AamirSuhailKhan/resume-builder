import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireUser } from "@/lib/auth/session";
import { applyRateLimit, getClientIdentifier } from "@/lib/security/ratelimit";
import { errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const limited = await applyRateLimit(req, getClientIdentifier(req), "ai");
    if (limited) return limited;

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
  "scores": {
    "before": number (0-100, original ATS match score),
    "after": number (0-100, projected ATS score after these optimizations)
  },
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
    const resultRecord = asRecord(result);
    const scores = asRecord(resultRecord.scores);
    const tailoredPackage = asRecord(resultRecord.tailored_package);
    const metricsAndProof = asRecord(resultRecord.metrics_and_proof);

    const payload = {
      scores: {
        before: typeof scores.before === 'number' ? scores.before : 45,
        after: typeof scores.after === 'number' ? scores.after : 85,
      },
      tailored_package: {
        resume: typeof tailoredPackage.resume === "string" ? tailoredPackage.resume : "",
        cover_letter: typeof tailoredPackage.cover_letter === "string" ? tailoredPackage.cover_letter : "",
        email: typeof tailoredPackage.email === "string" ? tailoredPackage.email : "",
      },
      optimizations: Array.isArray(resultRecord.optimizations) ? resultRecord.optimizations.map((opt) => {
        const optimization = asRecord(opt);
        return {
          original: String(optimization.original || ''),
          improved: String(optimization.improved || ''),
          reason: String(optimization.reason || ''),
          impact: String(optimization.impact || '')
        };
      }) : [],
      metrics_and_proof: {
        suggested_metrics: Array.isArray(metricsAndProof.suggested_metrics) ? metricsAndProof.suggested_metrics.map(String) : [],
        proof_suggestions: Array.isArray(metricsAndProof.proof_suggestions) ? metricsAndProof.proof_suggestions.map((p) => {
          const proof = asRecord(p);
          return {
            achievement: String(proof.achievement || ''),
            suggested_proof: String(proof.suggested_proof || '')
          };
        }) : []
      }
    };

    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        provider: "google",
        model: "gemini-2.5-flash",
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0.001,
      }
    }).catch(() => undefined);

    return NextResponse.json(payload);

  } catch (error) {
    return errorToResponse(error);
  }
}
