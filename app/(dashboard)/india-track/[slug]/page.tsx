import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, BookOpen, ChevronDown, ExternalLink, Flame, Lightbulb, Snowflake, Target, CheckCircle2, Clock, MessageSquare, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatL(num: number) {
  return `₹${Math.round(num / 100000)}L`;
}

function getTierStyle(tier: string) {
  if (tier === "faang_india") return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300";
  if (tier === "tier1_india") return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-300";
  if (tier === "unicorn") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function formatTier(tier: string) {
  const map: Record<string, string> = {
    faang_india: "FAANG India",
    tier1_india: "Tier 1 India",
    unicorn: "Unicorn",
    soonicorn: "Soonicorn",
    product_startup: "Product Startup",
  };
  return map[tier] ?? tier;
}

function getDifficultyStyle(d: string) {
  if (d === "hard" || d === "very_hard") return "text-red-500";
  if (d === "medium") return "text-amber-500";
  return "text-green-500";
}

function QuestionTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    dsa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    system_design: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    behavioral: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    machine_coding: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };
  const labels: Record<string, string> = {
    dsa: "DSA",
    system_design: "System Design",
    behavioral: "Behavioral",
    machine_coding: "Machine Coding",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border", map[type] ?? "bg-gray-100 text-gray-700")}>
      {labels[type] ?? type}
    </span>
  );
}

export default async function IndiaTrackDetailPage({ params }: { params: { slug: string } }) {
  const company = await prisma.indiaCompanyTrack.findUnique({
    where: { companySlug: params.slug },
  });

  if (!company) notFound();

  const hp = company.hiringProcess as any;
  const rounds: any[] = hp?.rounds ?? [];
  const salaryRanges = company.salaryRanges as Record<string, { min: number; max: number }> | null;
  const knownQuestions = company.knownQuestions as any[];
  const prepResources = company.prepResources as any[];

  const isHighHiring = company.hiringStatus === "high";
  const isFrozen = company.hiringStatus === "frozen";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-semibold">Disclaimer:</span> Data sourced from Glassdoor, GeeksForGeeks, and community reports. Questions are{" "}
          <span className="font-semibold">reported by candidates</span>, not confirmed or guaranteed. Verify all information before your interview.
        </p>
      </div>

      {/* Back nav */}
      <Link href="/india-track" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to all companies
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-muted border border-border flex items-center justify-center text-3xl">
            {company.logoEmoji}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{company.companyName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={getTierStyle(company.tier)}>{formatTier(company.tier)}</Badge>
              {isHighHiring && (
                <Badge variant="success" className="flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Actively Hiring
                </Badge>
              )}
              {isFrozen && (
                <Badge variant="neutral" className="flex items-center gap-1">
                  <Snowflake className="w-3 h-3" /> Hiring Frozen
                </Badge>
              )}
              {!isHighHiring && !isFrozen && (
                <Badge variant="secondary">Normal Hiring</Badge>
              )}
            </div>
          </div>
        </div>
        <Link href={`/interview?company=${encodeURIComponent(company.companyName)}`}>
          <Button>
            <Target className="w-4 h-4 mr-2" />
            Practice Interview
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "DSA Difficulty", value: company.dsaDifficulty, icon: Target, className: getDifficultyStyle(company.dsaDifficulty) },
          { label: "Total Rounds", value: hp?.totalRounds ?? rounds.length, icon: CheckCircle2, className: "" },
          { label: "Avg Timeline", value: `${company.avgTimelineDays} days`, icon: Clock, className: "" },
        ].map(({ label, value, icon: Icon, className }) => (
          <Card key={label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <Icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
              <span className={cn("text-lg font-bold capitalize", className)}>{String(value)}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interview Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent" /> Interview Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <details className="group" open>
            <summary className="hidden" />
            <div className="space-y-3">
              {rounds.map((r: any, i: number) => (
                <details key={i} className="group/round border border-border rounded-lg overflow-hidden">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-muted transition-colors list-none">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold shrink-0">
                        {r.round}
                      </span>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{r.type}</p>
                        <p className="text-xs text-muted-foreground">{r.duration}</p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-open/round:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 pt-1 border-t border-border bg-surface-muted/30">
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.prep}</p>
                  </div>
                </details>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Salary Table */}
      {salaryRanges && (
        <Card>
          <CardHeader>
            <CardTitle>Salary Ranges (INR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Level</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Min</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(salaryRanges).map(([level, range]) => (
                    <tr key={level}>
                      <td className="py-3 font-semibold text-foreground">{level}</td>
                      <td className="py-3 text-right text-muted-foreground">{formatL(range.min)}</td>
                      <td className="py-3 text-right font-semibold text-foreground">{formatL(range.max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Known Questions */}
      {knownQuestions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" /> Reported Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {knownQuestions.map((q: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-surface-muted/30 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{q.question}</p>
                  <p className="text-xs text-muted-foreground">Reported by candidates via {q.source}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <QuestionTypeBadge type={q.type} />
                  <Badge variant={q.difficulty === "hard" ? "danger" : q.difficulty === "medium" ? "warning" : "success"} className="text-xs">
                    {q.difficulty}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Prep Resources */}
      {prepResources?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-accent" /> Prep Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prepResources.map((r: any, i: number) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-surface-muted/50 transition-all group block">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="neutral" className="capitalize text-xs">{r.type}</Badge>
                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{r.title}</p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interview Tips */}
      {company.interviewTips?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" /> Interview Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {company.interviewTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Community Notes */}
      {company.communityNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" /> Community Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{company.communityNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* CTA + disclaimer */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-5 rounded-xl border border-border bg-surface-muted/30">
        <p className="text-sm text-muted-foreground">Ready to start preparing?</p>
        <Link href={`/interview?company=${encodeURIComponent(company.companyName)}`}>
          <Button size="lg">
            <Target className="w-4 h-4 mr-2" />
            Practice Interview for {company.companyName}
          </Button>
        </Link>
      </div>
    </div>
  );
}
