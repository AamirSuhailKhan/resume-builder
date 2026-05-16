"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Clock, ExternalLink, Ghost, MapPin, Pause, ShieldAlert, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { PageHeader, SectionShell } from "@/components/features/section-shell";
import { CompanyIntelligencePanel } from "@/components/jobs/CompanyIntelligencePanel";

export type MatchResult = {
  id: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  match: number;
  stage: string;
  skills: string[];
  missing: string[];
  ghostScore?: number;
  ghostVerdict?: string;
  sourceUrl?: string | null;
  description?: string;
  healthScore?: number | null;
  timingAdvice?: {
    recommendation: "apply_now" | "apply_soon" | "wait";
    urgency: string;
    reasoning: string;
    fillSpeedDays: number | null;
  };
};

export function JobMatchDashboard({ initialJobs = [] }: { initialJobs?: MatchResult[] }) {
  const router = useRouter();
  const [sort, setSort] = useState("match");
  const [filter, setFilter] = useState("all");
  const [showGhostJobs, setShowGhostJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState<MatchResult | null>(initialJobs[0] ?? null);
  const [activeTab, setActiveTab] = useState<"details" | "intel" | "connections">("details");

  const jobs = useMemo(() => {
    return [...initialJobs]
      .filter((job) => filter === "all" || job.stage === filter)
      .filter((job) => showGhostJobs || job.ghostVerdict !== "ghost")
      .sort((a, b) => (sort === "match" ? b.match - a.match : a.company.localeCompare(b.company)));
  }, [filter, sort, showGhostJobs, initialJobs]);

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Job Match Dashboard"
        title="Prioritize the roles worth your energy."
        description="Ranked matches combine resume fit, missing skills, seniority alignment, and application readiness."
        action={
          <div className="flex flex-wrap gap-2">
            <Dropdown
              className="w-36"
              items={[
                { label: "All roles", value: "all" },
                { label: "Hot", value: "hot" },
                { label: "Warm", value: "warm" },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <Dropdown
              className="w-40"
              items={[
                { label: "Match score", value: "match" },
                { label: "Company", value: "company" },
              ]}
              value={sort}
              onChange={setSort}
            />
            <Button
              variant={showGhostJobs ? "outline" : "secondary"}
              onClick={() => setShowGhostJobs(!showGhostJobs)}
              size="sm"
            >
              <Ghost className="mr-2 h-4 w-4" />
              {showGhostJobs ? "Hide Ghosts" : "Ghosts Hidden"}
            </Button>
          </div>
        }
      />

      <div className="flex gap-6 flex-col">
        {/* List View */}
        <div className="flex-1 space-y-4">
          {jobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`${job.ghostVerdict === "ghost" ? "opacity-60 grayscale-[0.3] hover:grayscale-0 hover:opacity-100 transition-all" : ""} cursor-pointer`}
              onClick={() => {
                setSelectedJob(job);
                setActiveTab("details");
              }}
            >
              <Card variant="elevated" className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
                <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-muted">
                        <Building2 className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={healthDot(job.healthScore)} title={job.healthScore == null ? "Company health unknown" : `Company health: ${Math.round(job.healthScore)}/100`} />
                          <p className="truncate text-sm font-semibold text-foreground">{job.company}</p>
                          {job.ghostVerdict === "real" && (
                            <span className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400" title={`Verified Real (Score: ${job.ghostScore})`}>
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              Real
                            </span>
                          )}
                          {job.ghostVerdict === "suspicious" && (
                            <span className="flex items-center text-xs font-medium text-amber-600 dark:text-amber-400" title={`Suspicious Job (Score: ${job.ghostScore})`}>
                              <ShieldAlert className="mr-1 h-3 w-3" />
                              Suspicious
                            </span>
                          )}
                          {job.ghostVerdict === "ghost" && (
                            <span className="flex items-center text-xs font-medium text-red-500" title={`Probable Ghost Job (Score: ${job.ghostScore})`}>
                              <Ghost className="mr-1 h-3 w-3" />
                              Ghost
                            </span>
                          )}
                        </div>
                        <h2 className="truncate text-xl font-semibold tracking-normal text-foreground">{job.role}</h2>
                        {job.timingAdvice && <TimingIndicator advice={job.timingAdvice} />}
                      </div>
                      <Badge variant={job.stage === "hot" ? "success" : "primary"}>{job.match}% match</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>
                        <MapPin className="mr-1 h-3 w-3" />
                        {job.location}
                      </Badge>
                      <Badge>{job.salary}</Badge>
                      {job.skills.map((skill) => (
                        <Badge key={skill} variant="neutral">{skill}</Badge>
                      ))}
                      {job.missing?.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="warning">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => job.sourceUrl && window.open(job.sourceUrl, "_blank", "noopener,noreferrer")} disabled={!job.sourceUrl}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button size="sm" onClick={() => router.push(`/workspace/${job.id}`)}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Open Workspace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {jobs.length === 0 && (
            <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              No jobs match your criteria. Expand your search or check back later.
            </div>
          )}
        </div>

        {selectedJob && (
          <Card variant="elevated">
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <Tab active={activeTab === "details"} onClick={() => setActiveTab("details")}>Job details</Tab>
                <Tab active={activeTab === "intel"} onClick={() => setActiveTab("intel")}>Company intel</Tab>
                <Tab active={activeTab === "connections"} onClick={() => setActiveTab("connections")}>Connections</Tab>
              </div>
              {activeTab === "details" && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">{selectedJob.role} at {selectedJob.company}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{selectedJob.description ?? "No description provided."}</p>
                  {selectedJob.timingAdvice && (
                    <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
                      {selectedJob.timingAdvice.reasoning}
                      {selectedJob.timingAdvice.fillSpeedDays && <p className="mt-2">Roles like this fill in avg. {selectedJob.timingAdvice.fillSpeedDays} days.</p>}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "intel" && <CompanyIntelligencePanel companyName={selectedJob.company} />}
              {activeTab === "connections" && <p className="text-sm text-muted-foreground">Warm-path connections will appear here when available.</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </SectionShell>
  );
}

function healthDot(score?: number | null) {
  if (score == null) return "h-2.5 w-2.5 rounded-full bg-muted-foreground/40";
  if (score >= 70) return "h-2.5 w-2.5 rounded-full bg-success";
  if (score >= 40) return "h-2.5 w-2.5 rounded-full bg-warning";
  return "h-2.5 w-2.5 rounded-full bg-danger";
}

function TimingIndicator({ advice }: { advice: NonNullable<MatchResult["timingAdvice"]> }) {
  const Icon = advice.recommendation === "apply_now" ? Zap : advice.recommendation === "apply_soon" ? Clock : Pause;
  const text = advice.recommendation === "apply_now"
    ? "Apply today - peak hiring season"
    : advice.recommendation === "apply_soon"
      ? "Apply this week - hiring picks up soon"
      : "Consider waiting - slow hiring period";
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground" title={advice.reasoning}>
      <Icon className="h-3 w-3" />
      {text}
      {advice.fillSpeedDays && advice.fillSpeedDays <= 10 ? " - fills fast" : ""}
    </p>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={active ? "rounded-lg bg-foreground px-3 py-2 text-sm text-background" : "rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"}>
      {children}
    </button>
  );
}
