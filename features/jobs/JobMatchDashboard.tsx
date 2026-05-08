"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Building2, MapPin, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { PageHeader, SectionShell } from "@/components/features/section-shell";

type JobMatch = {
  id: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  match: number;
  stage: string;
  skills: string[];
  missing: string[];
};

export function JobMatchDashboard({ initialJobs }: { initialJobs: JobMatch[] }) {
  const [sort, setSort] = useState("match");
  const [filter, setFilter] = useState("all");

  const jobs = useMemo(() => {
    return [...initialJobs]
      .filter((job) => filter === "all" || job.stage === filter)
      .sort((a, b) => (sort === "match" ? b.match - a.match : a.company.localeCompare(b.company)));
  }, [filter, sort, initialJobs]);

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Job Match Dashboard"
        title="Prioritize the roles worth your energy."
        description="Ranked matches combine resume fit, missing skills, seniority alignment, and application readiness."
        action={
          <div className="flex gap-2">
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
          </div>
        }
      />

      <div className="grid gap-4">
        {jobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card variant="elevated" className="overflow-hidden">
              <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-muted">
                      <Building2 className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{job.company}</p>
                      <h2 className="truncate text-xl font-semibold tracking-normal text-foreground">{job.role}</h2>
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
                  </div>
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="h-4 w-4" />
                    Tune
                  </Button>
                  <Button size="sm">
                    <ArrowUpDown className="h-4 w-4" />
                    Apply
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
    </SectionShell>
  );
}
