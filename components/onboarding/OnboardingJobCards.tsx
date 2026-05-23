import Link from "next/link";
import { ArrowRight, Building2, MapPin, CircleDollarSign, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type OnboardingJobMatch = {
  id: string;
  company: string;
  role: string;
  location: string;
  description: string;
  matchScore: number;
  sourceUrl?: string | null;
  salaryEstimate?: string;
  interviewIntel?: string;
  intelSource?: string;
};

export function OnboardingJobCards({ jobs }: { jobs: OnboardingJobMatch[] }) {
  return (
    <div className="grid gap-4">
      {jobs.map((job) => (
        <Card key={job.id} variant="elevated" className="border border-border hover:border-primary/20 transition-all">
          <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted">
                  <Building2 className="h-4 w-4 text-accent" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-muted-foreground">{job.company}</p>
                  <h2 className="truncate text-xl font-semibold tracking-normal text-foreground">{job.role}</h2>
                </div>
                <Badge variant={job.matchScore >= 85 ? "success" : "primary"}>{job.matchScore}% match</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-surface-muted border border-border text-foreground hover:bg-surface-muted">
                  <MapPin className="mr-1 h-3 w-3" aria-hidden="true" />
                  {job.location}
                </Badge>
                {job.salaryEstimate && (
                  <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20">
                    <CircleDollarSign className="mr-1 h-3 w-3" aria-hidden="true" />
                    {job.salaryEstimate}
                  </Badge>
                )}
              </div>

              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{job.description}</p>

              {job.interviewIntel && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground leading-relaxed flex flex-col gap-2.5 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <Brain className="h-4 w-4 shrink-0" /> Interview Intelligence
                    </span>
                    {job.intelSource && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/70 bg-primary/10 px-2 py-0.5 rounded border border-primary/10">
                        {job.intelSource}
                      </span>
                    )}
                  </div>
                  <span>{job.interviewIntel}</span>
                </div>
              )}
            </div>

            <Link href={job.sourceUrl ?? "/dashboard/matches"}>
              <Button size="sm" variant="outline" className="w-full md:w-auto mt-3 md:mt-0 justify-center">
                Review Details
                <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
