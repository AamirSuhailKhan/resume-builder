"use client";

import { motion } from "framer-motion";

interface SkillFreq {
  skill: string;
  percentage: number;
}

interface MarketOverviewProps {
  topSkills: SkillFreq[];
  topTools: SkillFreq[];
  totalJobs: number;
}

function FrequencyBar({ skill, percentage, delay }: SkillFreq & { delay: number }) {
  const colorClass =
    percentage >= 70
      ? "bg-indigo-500"
      : percentage >= 45
      ? "bg-violet-400"
      : "bg-purple-300";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-700">{skill}</span>
        <span className="tabular-nums font-bold text-gray-900">{percentage}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function SkeletonBar() {
  return (
    <div className="space-y-1.5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="h-4 w-8 rounded bg-gray-200" />
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100" />
    </div>
  );
}

export function MarketOverview({ topSkills, topTools, totalJobs }: MarketOverviewProps) {
  if (!topSkills.length && !topTools.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-400">No market data yet. Analyze job descriptions above.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Skills */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Top Skills</h3>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
            {totalJobs} JDs analyzed
          </span>
        </div>
        <div className="space-y-4">
          {topSkills.map((s, i) => (
            <FrequencyBar key={s.skill} {...s} delay={i * 0.06} />
          ))}
        </div>
        {/* Badge cloud */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-50 pt-5">
          {topSkills.map((s) => (
            <span
              key={s.skill}
              className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
            >
              {s.skill}
            </span>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Top Tools & Platforms</h3>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
            By demand
          </span>
        </div>
        <div className="space-y-4">
          {topTools.length > 0 ? (
            topTools.map((t, i) => (
              <FrequencyBar key={t.skill} {...t} delay={i * 0.06} />
            ))
          ) : (
            <p className="text-sm text-gray-400">No tool data extracted yet.</p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-50 pt-5">
          {topTools.map((t) => (
            <span
              key={t.skill}
              className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
            >
              {t.skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarketOverviewSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[0, 1].map((n) => (
        <div key={n} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between animate-pulse">
            <div className="h-5 w-28 rounded bg-gray-200" />
            <div className="h-5 w-20 rounded-full bg-gray-100" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonBar key={i} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
