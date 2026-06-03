import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NetworkingDashboard } from "@/features/networking/NetworkingDashboard";

export default async function NetworkingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <NetworkingDashboard />;
}
