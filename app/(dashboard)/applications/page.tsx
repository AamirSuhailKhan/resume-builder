import { ApplicationTracker } from "@/features/applications/ApplicationTracker";
import { ApplicationRecord, ApplicationStage } from "@/features/platform/data";
import { ApplicationService } from "@/lib/services/application.service";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  
  const applications = await ApplicationService.getApplicationsForUser(session.user.id);
  
  const mappedApps: ApplicationRecord[] = applications.map(app => {
    // map prisma enum to UI stage string
    let stageStr: ApplicationStage = "Applied";
    if (app.status === "applied") stageStr = "Applied";
    else if (app.status === "interview") stageStr = "Interview";
    else if (app.status === "rejected") stageStr = "Rejected";
    else if (app.status === "offer") stageStr = "Offer";

    return {
      id: app.id,
      company: app.company,
      role: app.role,
      stage: stageStr,
      owner: "You",
      nextStep: app.notes || "Follow up in 3 days",
      score: app.matchScore ?? 0,
    };
  });

  return <ApplicationTracker initialApplications={mappedApps} />;
}
