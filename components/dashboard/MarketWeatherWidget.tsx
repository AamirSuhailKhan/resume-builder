"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Flame, TrendingUp, TrendingDown, Minus, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketWeatherReport {
  headline: string;
  hiringTrend: string;
  trendPct: number;
  hotSkills: string[];
}

export function MarketWeatherWidget() {
  const [report, setReport] = useState<MarketWeatherReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch("/api/v1/market/weather");
        const text = await response.text();

        console.log("[RAW RESPONSE]", {
          status: response.status,
          body: text.slice(0, 500),
        });

        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (error) {
          console.error("[MARKET WEATHER JSON ERROR]", {
            error,
            raw: text,
          });
          throw new Error("Invalid JSON response");
        }

        // API returns { data: { report, ... }, error: null }
        const envelope = data?.data ?? data;
        if (envelope?.report) {
          setReport(envelope.report);
        } else if (data?.error) {
          console.error("[MARKET WEATHER API ERROR]", data.error);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm animate-pulse min-h-[140px]">
        <div className="h-4 bg-surface-muted rounded w-1/3 mb-4"></div>
        <div className="h-6 bg-surface-muted rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-surface-muted rounded w-1/2"></div>
      </div>
    );
  }

  if (!report) return null;

  const getTrendConfig = (trend: string) => {
    switch (trend.toLowerCase()) {
      case "surging": return { icon: Flame, color: "text-teal-500", bg: "bg-teal-500/10", label: "Surging" };
      case "growing": return { icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", label: "Growing" };
      case "declining": return { icon: TrendingDown, color: "text-amber-500", bg: "bg-amber-500/10", label: "Slowing" };
      case "frozen": return { icon: Snowflake, color: "text-slate-500", bg: "bg-slate-500/10", label: "Frozen" };
      default: return { icon: Minus, color: "text-gray-500", bg: "bg-gray-500/10", label: "Stable" };
    }
  };

  const trend = getTrendConfig(report.hiringTrend);
  const TrendIcon = trend.icon;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", trend.bg)}>
            <TrendIcon className={cn("w-4 h-4", trend.color)} />
          </div>
          <span className="text-sm font-semibold text-foreground">Market Weather</span>
        </div>
        <Link href="/market-weather" className="text-xs text-muted-foreground hover:text-accent transition flex items-center gap-1">
          Full report <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-foreground mb-1">{report.headline}</h3>
        
        {report.hotSkills.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Trending:</span>
            {report.hotSkills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 bg-surface-muted rounded-full text-foreground border border-border">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
