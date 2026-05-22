import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { MarketWeatherService } from "@/lib/services/market-weather.service";
import { Flame, TrendingUp, TrendingDown, Minus, Snowflake, Info, ShieldCheck, ShieldAlert, Shield, BriefcaseBusiness } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketWeatherForm } from "./_components/MarketWeatherForm";

export const metadata = {
  title: "Market Weather | CareerOS",
};

function getTrendConfig(trend: string) {
  switch (trend.toLowerCase()) {
    case "surging": return { icon: Flame, text: "Market is surging", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" };
    case "growing": return { icon: TrendingUp, text: "Market is growing", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" };
    case "declining": return { icon: TrendingDown, text: "Market is slowing", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    case "frozen": return { icon: Snowflake, text: "Hiring is frozen", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" };
    default: return { icon: Minus, text: "Market is stable", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20" };
  }
}

function getConfidenceConfig(signal: string | null) {
  switch (signal?.toLowerCase()) {
    case "high": return { icon: ShieldCheck, text: "High Confidence", color: "text-emerald-500" };
    case "low": return { icon: ShieldAlert, text: "Low Confidence", color: "text-amber-500" };
    default: return { icon: Shield, text: "Medium Confidence", color: "text-blue-500" };
  }
}

export default async function MarketWeatherPage({ searchParams }: { searchParams: { role?: string; location?: string; industry?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let { role, location, industry } = searchParams;
  industry = industry || "Technology";

  const profile = await prisma.careerProfile.findUnique({
    where: { userId: session.user.id },
    include: { 
      user: { 
        include: { 
          resumes: { take: 1, orderBy: { updatedAt: 'desc' } }, 
          applications: { take: 1, orderBy: { createdAt: 'desc' } } 
        } 
      } 
    }
  });

  const prefs = (profile?.preferences as Record<string, unknown>) || {};
  const isSubscribed = Boolean(prefs.marketDigestEnabled);

  if (!role || !location) {
    if (!role) {
      role = profile?.headline || 
             (profile?.user.resumes[0]?.data as any)?.personalInfo?.title ||
             profile?.user.applications[0]?.role ||
             "Software Engineer";
    }

    if (!location) {
      const locations = prefs.locations as string[];
      location = locations?.[0] || 
                 (profile?.user.resumes[0]?.data as any)?.personalInfo?.location ||
                 "Remote";
    }
  }

  // Fetch report
  const { report } = await MarketWeatherService.generateWeeklyReport(role!, industry, location!);
  const trendConfig = getTrendConfig(report.hiringTrend);
  const TrendIcon = trendConfig.icon;
  const confidenceConfig = getConfidenceConfig(report.signalStrength);
  const ConfidenceIcon = confidenceConfig.icon;

  const trendSign = report.trendPct > 0 ? "+" : "";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Market Weather</h1>
          <p className="text-muted-foreground mt-2">Real-time labor market intelligence & forecasting.</p>
        </div>
        
        <MarketWeatherForm defaultRole={role!} defaultLocation={location!} defaultIndustry={industry} isSubscribed={isSubscribed} />
      </div>

      <div className={cn("rounded-2xl border p-8 flex items-center gap-6", trendConfig.bg, trendConfig.border)}>
        <div className={cn("p-4 rounded-xl bg-background shadow-sm border border-border")}>
          <TrendIcon className={cn("w-10 h-10", trendConfig.color)} />
        </div>
        <div className="flex-1">
          <h2 className={cn("text-2xl font-bold mb-2", trendConfig.color)}>{trendConfig.text}</h2>
          <p className="text-lg font-medium text-foreground">{report.headline}</p>
        </div>
        <div className="hidden md:flex flex-col items-end text-right">
          <div className="text-3xl font-bold text-foreground">
            {trendSign}{(report.trendPct ?? 0).toFixed(1)}%
          </div>
          <p className="text-sm text-muted-foreground">jobs posted vs last week</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground bg-surface px-4 py-3 rounded-lg border border-border">
        <ConfidenceIcon className={cn("w-4 h-4", confidenceConfig.color)} />
        <span className="font-medium text-foreground">{confidenceConfig.text}</span>
        <span className="opacity-50">|</span>
        <span>Based on {((report.signalMetadata as any)?.internalJobs || 0)} internal jobs & {((report.signalMetadata as any)?.webSources || 0)} external sources</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Hot Skills
          </h3>
          <ul className="space-y-2">
            {(report.hotSkills ?? []).slice(0, 5).map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span> {s}
              </li>
            ))}
            {(report.hotSkills ?? []).length === 0 && <p className="text-sm text-muted-foreground">No prominent skills detected.</p>}
          </ul>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Fast Filling Roles
          </h3>
          <ul className="space-y-2">
            {(report.fastFillRoles ?? []).slice(0, 5).map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {r}
              </li>
            ))}
            {(report.fastFillRoles ?? []).length === 0 && <p className="text-sm text-muted-foreground">No specific roles surging.</p>}
          </ul>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BriefcaseBusiness className="w-4 h-4 text-purple-500" /> Top Hiring Companies
          </h3>
          <ul className="space-y-2">
            {(report.topHiringCompanies ?? []).slice(0, 5).map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {c}
              </li>
            ))}
            {(report.topHiringCompanies ?? []).length === 0 && <p className="text-sm text-muted-foreground">No outlier companies detected.</p>}
          </ul>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-accent" /> Market Summary
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {report.detailedSummary}
        </div>
      </div>
    </div>
  );
}
