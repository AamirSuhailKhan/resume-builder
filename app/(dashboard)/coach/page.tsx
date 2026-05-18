import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CoachShell } from "@/components/coach/CoachShell";
import { getCoachName } from "@/lib/coach/prompts";
import { getUserPlan } from "@/lib/auth/require-pro";
import { CoachService } from "@/lib/services/coach.service";

export default async function CoachPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const plan = await getUserPlan(userId);
  const teaser = await CoachService.getTeaserForUser(userId);
  const userInitial = session.user.email?.[0]?.toUpperCase() ?? "U";
  const coachName = getCoachName();

  return (
    <CoachShell
      plan={plan}
      userInitial={userInitial}
      coachName={coachName}
      initialTeaser={teaser}
    />
  );
}
