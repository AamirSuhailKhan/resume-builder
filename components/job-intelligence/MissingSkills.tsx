"use client";

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface MissingSkillsProps {
  skills: string[];
}

export function MissingSkills({ skills }: MissingSkillsProps) {
  if (skills.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-700">🎉 You have all the top market skills!</p>
      </div>
    );
  }

  // Priority tiers: first 3 = critical, next 3 = important, rest = nice-to-have
  const critical = skills.slice(0, 3);
  const important = skills.slice(3, 6);
  const nicetohave = skills.slice(6);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Skill Gaps</h3>
          <p className="text-xs text-gray-400">{skills.length} skills to add to increase your score</p>
        </div>
      </div>

      {critical.length > 0 && (
        <Tier label="Critical — add these first" color="rose" skills={critical} delay={0} />
      )}
      {important.length > 0 && (
        <Tier label="Important" color="amber" skills={important} delay={0.1} />
      )}
      {nicetohave.length > 0 && (
        <Tier label="Nice to have" color="slate" skills={nicetohave} delay={0.2} />
      )}
    </div>
  );
}

function Tier({
  label,
  color,
  skills,
  delay,
}: {
  label: string;
  color: "rose" | "amber" | "slate";
  skills: string[];
  delay: number;
}) {
  const tagStyles = {
    rose:  "bg-rose-50  text-rose-700  border border-rose-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    slate: "bg-slate-50 text-slate-600 border border-slate-200",
  };

  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <motion.div
        className="flex flex-wrap gap-2"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
      >
        {skills.map((s) => (
          <motion.span
            key={s}
            variants={{ hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1 } }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${tagStyles[color]}`}
          >
            {s}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

export function MissingSkillsSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-5 w-32 rounded bg-gray-200 mb-5" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
