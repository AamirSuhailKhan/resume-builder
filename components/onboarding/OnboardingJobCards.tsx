import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";
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
};

export function OnboardingJobCards({ jobs }: { jobs: OnboardingJobMatch[] }) {
  return (
    <div className="grid gap-4">
      {jobs.map((job) => (
        <Card key={job.id} variant="elevated">
          <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted">
                  <Building2 className="h-4 w-4 text-accent" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{job.company}</p>
                  <h2 className="truncate text-xl font-semibold tracking-normal text-foreground">{job.role}</h2>
                </div>
                <Badge variant={job.matchScore >= 85 ? "success" : "primary"}>{job.matchScore}% match</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>
                  <MapPin className="mr-1 h-3 w-3" aria-hidden="true" />
                  {job.location}
                </Badge>
              </div>
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{job.description}</p>
            </div>
            <Link href={job.sourceUrl ?? "/dashboard/matches"}>
              <Button size="sm" variant="outline">
                Review
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
