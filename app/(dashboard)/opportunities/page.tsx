import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { OpportunityIntelligenceDashboard } from "@/features/job-intelligence/OpportunityIntelligenceDashboard";

export const metadata = {
  title: "Opportunity Intelligence | CareerOS",
  description: "Ranked opportunities using 7 key telemetry factors.",
};

export default async function OpportunitiesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <OpportunityIntelligenceDashboard />;
}
