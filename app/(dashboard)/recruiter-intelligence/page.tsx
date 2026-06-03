import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RecruiterIntelligenceDashboard } from "@/features/recruiter/RecruiterIntelligenceDashboard";

export default async function RecruiterIntelligencePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <RecruiterIntelligenceDashboard />;
}
