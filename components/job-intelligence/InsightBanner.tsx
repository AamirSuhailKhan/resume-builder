"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface InsightBannerProps {
  insight: string;
}

export function InsightBanner({ insight }: InsightBannerProps) {
  if (!insight) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 shadow-lg shadow-indigo-200"
    >
      {/* Decorative background elements */}
      <div className="absolute -right-6 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      
      <div className="relative flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-indigo-200">
            AI Market Insight
          </h2>
          <p className="text-xl font-medium leading-relaxed text-white md:text-2xl">
            {insight}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function InsightBannerSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-100 p-8 shadow-sm animate-pulse flex gap-4">
      <div className="h-10 w-10 rounded-xl bg-gray-200 flex-shrink-0" />
      <div className="w-full">
        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2" />
        <div className="h-6 w-1/2 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
