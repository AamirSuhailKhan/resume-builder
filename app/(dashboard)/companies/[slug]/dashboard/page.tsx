import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyDashboardService } from "@/lib/services/company-dashboard.service";
import CompanyDashboardClient from "./components/CompanyDashboardClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function titleCase(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const companyName = titleCase(slug);
  const title = `${companyName} Hiring Intelligence Dashboard | CareerOS`;
  return {
    title,
    description: `Bloomberg-style operational hiring dashboard for ${companyName}. Track selection weights, median interview timelines, recruiter behaviors, and verified compensation benchmarks.`,
    alternates: {
      canonical: `/companies/${slug}/dashboard`,
    },
  };
}

export default async function CompanyDashboardPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) {
    notFound();
  }

  let dashboardData;
  try {
    dashboardData = await CompanyDashboardService.getDashboard(slug);
  } catch (error) {
    console.error(`Failed to load company dashboard for ${slug}:`, error);
    notFound();
  }

  return (
    <div className="container-premium py-4">
      <CompanyDashboardClient initialData={dashboardData} slug={slug} />
    </div>
  );
}
