import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  companyName: z.string().min(1).max(160),
  jobTitle: z.string().min(1).max(160),
  rejectionType: z.enum(["no_response", "after_interview", "after_offer"]).optional(),
});

type Reframe = { reframe: string; statContext: string; nextStep: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

  const input = parsed.data;
  let result: Reframe = {
    reframe: `Getting rejected from ${input.companyName} is disappointing, and it does not mean your search is broken.`,
    statContext: "Most job searches include many no-responses or rejections before a strong fit converts.",
    nextStep: "Write down one thing you learned from this role, then choose one next application to tailor with that lesson.",
  };

  try {
    const { data } = await callClaudeJson<Reframe>({
      system: "You are a career coach. Return ONLY JSON. Reframe a job rejection in a compassionate, realistic, growth-oriented way. No toxic positivity.",
      user: JSON.stringify({
        rejectedFrom: `${input.jobTitle} at ${input.companyName}`,
        rejectionType: input.rejectionType ?? "no_response",
        instruction: "Give context, statistical perspective, and one next step in 2-3 sentences total across fields.",
      }),
      maxTokens: 500,
    });
    result = data;
  } catch {
    // Fallback result above.
  }

  return NextResponse.json(result);
}
