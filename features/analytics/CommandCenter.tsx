import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, FileText, KanbanSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionShell } from "@/components/features/section-shell";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { JobsService } from "@/lib/services/jobs.service";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function CommandCenter() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const metrics = await AnalyticsService.getDashboardMetrics(userId);
  const opportunities = await JobsService.getOpportunitiesForUser(userId);
  const hotMatches = opportunities.filter((job) => job.matchScore >= 88);

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Command Center"
        title="Your daily cockpit for winning better roles."
        description="One workspace for resume quality, match prioritization, applications, interview practice, and portfolio publishing."
        action={
          <Link href="/job-intelligence">
            <Button>
              <Sparkles className="h-4 w-4" />
              Analyze a job
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Top matches" value={`${hotMatches.length}`} href="/matches" icon={<BriefcaseBusiness className="h-4 w-4" />} />
        <Metric label="Applications" value={`${metrics.totalApplications}`} href="/applications" icon={<KanbanSquare className="h-4 w-4" />} />
        <Metric label="Resumes" value={`${metrics.totalResumes}`} href="/analytics" icon={<FileText className="h-4 w-4" />} />
        <Metric label="Cost Savings" value={`$${metrics.aiCost.toFixed(2)}`} href="/auto-apply" icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Top Matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.slice(0, 3).map((job) => (
              <Link key={job.id} href="/matches" className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition hover:bg-surface-muted">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{job.company}</p>
                  <p className="truncate text-sm text-muted-foreground">{job.role}</p>
                </div>
                <Badge variant={job.matchScore >= 90 ? "success" : "primary"}>{job.matchScore}%</Badge>
              </Link>
            ))}
            {opportunities.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                No job matches yet. Analyze a job to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Next Best Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Close GraphQL gap", "Add project proof or learning plan"],
              ["Queue Vercel application", "Resume, cover letter, email ready"],
              ["Practice system design", "Autosave and queue architecture prompt"],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}

function Metric({ label, value, href, icon }: { label: string; value: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href}>
      <Card variant="elevated" className="h-full hover:border-border-strong">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-accent">{icon}</div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
