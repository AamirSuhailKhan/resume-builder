"use client";

import { motion } from "framer-motion";

interface MatchScoreCardProps {
  score: number;
  matchedSkills: string[];
}

function scoreColor(score: number) {
  if (score >= 75) return { ring: "stroke-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", label: "Strong Match" };
  if (score >= 50) return { ring: "stroke-amber-400",  text: "text-amber-600",  bg: "bg-amber-50",  label: "Moderate Match" };
  return               { ring: "stroke-rose-500",    text: "text-rose-600",    bg: "bg-rose-50",    label: "Low Match"  };
}

export function MatchScoreCard({ score, matchedSkills }: MatchScoreCardProps) {
  const { ring, text, bg, label } = scoreColor(score);

  // SVG circle gauge
  const R = 52;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm flex flex-col items-center text-center">
      {/* Gauge */}
      <div className="relative mb-6">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Track */}
          <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          {/* Progress */}
          <motion.circle
            cx="70"
            cy="70"
            r={R}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className={ring}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            transform="rotate(-90 70 70)"
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-black tabular-nums ${text}`}>{score}%</span>
          <span className="text-xs font-semibold text-gray-400 mt-0.5">match</span>
        </div>
      </div>

      {/* Label badge */}
      <span className={`rounded-full px-4 py-1.5 text-xs font-black tracking-widest uppercase ${bg} ${text} mb-4`}>
        {label}
      </span>

      <p className="text-sm text-gray-500 mb-5 max-w-xs leading-relaxed">
        Your profile matches <strong className={text}>{score}%</strong> of the top skills recruiters are looking for across analyzed roles.
      </p>

      {/* Matched skills */}
      {matchedSkills.length > 0 && (
        <div className="w-full">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">✅ You have</p>
          <div className="flex flex-wrap justify-center gap-2">
            {matchedSkills.map((s) => (
              <span key={s} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MatchScoreCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm flex flex-col items-center animate-pulse">
      <div className="h-36 w-36 rounded-full bg-gray-100 mb-6" />
      <div className="h-6 w-28 rounded-full bg-gray-100 mb-4" />
      <div className="h-4 w-48 rounded bg-gray-100 mb-2" />
      <div className="h-4 w-36 rounded bg-gray-100" />
    </div>
  );
}
