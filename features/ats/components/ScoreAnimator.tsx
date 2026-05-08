"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Target } from "lucide-react";

export function ConfidenceBadge({ score }: { score: number }) {
  let level = "LOW";
  let colorClass = "bg-red-100 text-red-700 border-red-200";
  
  if (score >= 75) {
    level = "HIGH";
    colorClass = "bg-green-100 text-green-700 border-green-200";
  } else if (score >= 60) {
    level = "MEDIUM";
    colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black tracking-widest uppercase shadow-sm ${colorClass}`}>
      <Target className="h-3.5 w-3.5" /> Interview Chances: {level}
    </div>
  );
}

export function TransformationMessage({ after }: { after: number }) {
  const isAggressive = after > 70;
  
  return (
    <div className="mt-6 p-4 rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50">
      <p className="text-lg font-black text-indigo-900 tracking-tight">
        {isAggressive 
          ? "Your resume was likely getting rejected. This fixes the major issues."
          : "This version is significantly stronger than your original resume."}
      </p>
    </div>
  );
}

export function ScoreAnimator({ before, after }: { before: number, after: number }) {
  const [displayBefore, setDisplayBefore] = useState(0);
  const [displayAfter, setDisplayAfter] = useState(0);

  useEffect(() => {
    let startBefore = 0;
    let startAfter = 0;
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayBefore(Math.floor(startBefore + (before - startBefore) * easeOut));
      setDisplayAfter(Math.floor(startAfter + (after - startAfter) * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [before, after]);

  return (
    <div className="flex flex-col gap-6 bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800 text-white relative overflow-hidden h-full">
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 w-full">
        
        <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-center opacity-60 relative">
            <p className="text-xs uppercase tracking-widest font-bold text-red-400 mb-1">Before</p>
            <div className="text-4xl font-black text-red-400 font-mono">
              {displayBefore}%
            </div>
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-xl">❌</div>
          </div>
          
          <ArrowRight className="h-8 w-8 text-slate-600 hidden sm:block" />
          
          <div className="text-center relative">
            <p className="text-xs uppercase tracking-widest font-bold text-green-400 mb-1">After</p>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 font-mono drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {displayAfter}%
            </div>
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-2xl animate-bounce">✅</div>
          </div>
        </div>

        <div className="sm:text-right relative z-10">
          <ConfidenceBadge score={after} />
        </div>
      </div>
      
      <div className="relative z-10 mt-auto border-t border-slate-700/50 pt-6">
        <TransformationMessage after={after} />
      </div>
    </div>
  );
}
