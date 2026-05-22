"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Clock, ExternalLink, Ghost, MapPin, Pause, ShieldAlert, ShieldCheck, Shield, Sparkles, Zap, Flag, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { PageHeader, SectionShell } from "@/components/features/section-shell";
import { CompanyIntelligencePanel } from "@/components/jobs/CompanyIntelligencePanel";
import { CareerPathPanel } from "@/components/career/CareerPathPanel";

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
  scamScore?: number | null;
  scamVerdict?: string | null;
  scamSignals?: string[] | null;
  scamReports?: number;
  sourceUrl?: string | null;
  description?: string;
  healthScore?: number | null;
  timingAdvice?: {
    recommendation: "apply_now" | "apply_soon" | "wait";
    urgency: string;
    reasoning: string;
    fillSpeedDays: number | null;
  };
  isIndia?: boolean;
  source?: string;
  indiaTrackSlug?: string | null;
  careerAlignment?: number | null;
};

export function JobMatchDashboard({
  initialJobs = [],
  defaultIndiaOnly = false,
}: {
  initialJobs?: MatchResult[];
  defaultIndiaOnly?: boolean;
}) {
  const router = useRouter();
  const [sort, setSort] = useState("match");
  const [filter, setFilter] = useState("all");
  const [showGhostJobs, setShowGhostJobs] = useState(true);
  const [indiaOnly, setIndiaOnly] = useState(defaultIndiaOnly);
  const [selectedJob, setSelectedJob] = useState<MatchResult | null>(
    defaultIndiaOnly ? initialJobs.find((job) => job.isIndia) ?? initialJobs[0] ?? null : initialJobs[0] ?? null
  );
  const [activeTab, setActiveTab] = useState<"details" | "intel" | "connections" | "career">("details");
  const [showScamBanner, setShowScamBanner] = useState(false);
  const [expandedScams, setExpandedScams] = useState<Set<string>>(new Set());
  const [reportingJob, setReportingJob] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("scam-banner-dismissed")) {
      setShowScamBanner(true);
    }
  }, []);

  const dismissScamBanner = () => {
    localStorage.setItem("scam-banner-dismissed", "true");
    setShowScamBanner(false);
  };

  const reportScam = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to flag this job as a potential scam? This will notify the community.")) {
      setReportingJob(jobId);
      try {
        const res = await fetch(`/api/v1/jobs/${jobId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "user_reported" }),
        });
        if (!res.ok) throw new Error(await res.text());
        alert("Report submitted. Thank you for keeping the community safe.");
      } catch (err) {
        alert("Failed to submit report or you already reported this job.");
      } finally {
        setReportingJob(null);
      }
    }
  };

  const toggleScamExpand = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedScams((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const jobs = useMemo(() => {
    return [...initialJobs]
      .filter((job) => filter === "all" || job.stage === filter)
      .filter((job) => showGhostJobs || job.ghostVerdict !== "ghost")
      .filter((job) => !indiaOnly || Boolean(job.isIndia))
      .sort((a, b) => (sort === "match" ? b.match - a.match : a.company.localeCompare(b.company)));
  }, [filter, sort, showGhostJobs, indiaOnly, initialJobs]);

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
              variant={indiaOnly ? "primary" : "outline"}
              onClick={() => setIndiaOnly(!indiaOnly)}
              size="sm"
            >
              India jobs
            </Button>
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

      {showScamBanner && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <p className="text-sm font-medium text-indigo-900">
              Career OS scans every job for scam signals. <span className="text-emerald-600 font-bold">🛡 Green</span> = safe. <span className="text-amber-600 font-bold">⚠ Yellow</span> = verify. <span className="text-red-600 font-bold">🚨 Red</span> = avoid.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={dismissScamBanner} className="text-indigo-600 bg-white border-indigo-200 hover:bg-indigo-100">Got it</Button>
        </div>
      )}

      <div className="flex gap-6 flex-col">
        {/* List View */}
        <div className="flex-1 space-y-4">
          {jobs.map((job, index) => {
            const isScam = job.scamVerdict === "scam";
            const isExpanded = expandedScams.has(job.id);
            return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`${job.ghostVerdict === "ghost" ? "opacity-60 grayscale-[0.3] hover:grayscale-0 hover:opacity-100 transition-all" : ""} ${isScam && !isExpanded ? "opacity-50" : ""} cursor-pointer`}
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
                          {job.scamVerdict === "safe" && (
                            <span className="flex items-center text-xs font-medium text-emerald-600" title="No scam indicators detected">
                              <ShieldCheck className="mr-1 h-3 w-3" /> Safe
                            </span>
                          )}
                          {(job.scamVerdict === "unknown" || !job.scamVerdict) && (
                            <span className="flex items-center text-xs font-medium text-gray-400" title="Scam risk unknown">
                              <Shield className="mr-1 h-3 w-3" /> Unknown
                            </span>
                          )}
                          {job.scamVerdict === "suspicious" && (
                            <span className="flex items-center text-xs font-medium text-amber-500" title="Limited company info — verify before applying">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Suspicious
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
                      {job.isIndia && <Badge variant="success">India</Badge>}
                      {job.source && <Badge variant="neutral">{job.source}</Badge>}
                      {job.skills.map((skill) => (
                        <Badge key={skill} variant="neutral">{skill}</Badge>
                      ))}
                      {job.missing?.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="warning">{skill}</Badge>
                      ))}
                      {job.missing?.length > 0 && (
                        <div
                          className="flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/skill-gap?role=${encodeURIComponent(job.role)}`);
                          }}
                        >
                          📚 {job.missing.length} skills to learn →
                        </div>
                      )}
                      {job.indiaTrackSlug && (
                        <div
                          className="flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/india-track/${job.indiaTrackSlug}`);
                          }}
                        >
                          📖 Interview guide available
                        </div>
                      )}
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
                    <Button variant="ghost" size="sm" onClick={(e) => reportScam(job.id, e)} disabled={reportingJob === job.id} className="text-gray-400 hover:text-red-500">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
                {job.scamVerdict === "scam" && (
                  <div className="bg-red-50 border-t border-red-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                        <AlertTriangle className="h-4 w-4" /> ⚠ HIGH SCAM RISK
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 h-7 text-xs" onClick={(e) => toggleScamExpand(job.id, e)}>
                        {expandedScams.has(job.id) ? "Hide evidence" : "Why was this flagged? →"}
                      </Button>
                    </div>
                    {expandedScams.has(job.id) && (
                      <div className="mt-3 space-y-1">
                        {job.scamSignals?.map((sig, i) => (
                          <p key={i} className="text-xs text-red-600 flex items-start gap-1.5"><span className="mt-0.5">•</span> {sig}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          )})}
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
                <Tab active={activeTab === "career"} onClick={() => setActiveTab("career")}>Career fit</Tab>
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
              {activeTab === "career" && (
                <CareerPathPanel
                  jobOpportunityId={selectedJob.id}
                  jobTitle={selectedJob.role}
                  company={selectedJob.company}
                />
              )}
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
