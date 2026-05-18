import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const enabled = Boolean(body.enabled);

    const profile = await prisma.careerProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
       return new NextResponse("Profile not found", { status: 404 });
    }

    const prefs = (profile.preferences as Record<string, unknown>) || {};
    prefs.marketDigestEnabled = enabled;

    await prisma.careerProfile.update({
      where: { userId: session.user.id },
      data: { preferences: prefs }
    });

    return NextResponse.json({ success: true, enabled });
  } catch (e) {
    console.error("[PreferencesAPI] Error updating market-digest", e);
    return new NextResponse("Error updating preferences", { status: 500 });
  }
}
