import React from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { JobOpportunityCard } from "@/features/job-intelligence/JobOpportunityCard";
import { redirect } from "next/navigation";

export default async function JobIntelligencePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch the 5 most recent job opportunities to display intelligence for
  const recentJobs = await prisma.jobOpportunity.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return (
    <div style={{ padding: "32px", fontFamily: "Inter, sans-serif", color: "#f3f4f6" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#fff" }}>Job Intelligence Engine</h1>
      <p style={{ color: "#9ca3af", marginBottom: 32 }}>Comprehensive opportunity scoring based on market data, growth potential, and stability.</p>
      
      {recentJobs.length === 0 ? (
        <div style={{ background: "#0a0a0f", padding: 40, borderRadius: 16, border: "1px dashed #374151", textAlign: "center" }}>
          <p>No job opportunities found. Save some jobs to see intelligence scores.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))", gap: 24 }}>
          {recentJobs.map((job: any) => (
            <JobOpportunityCard 
              key={job.id} 
              jobId={job.id} 
              role={job.role} 
              company={job.company} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
