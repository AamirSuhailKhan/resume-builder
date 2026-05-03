"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";

interface ProgressIndicatorProps {
  step: "idle" | "parsing" | "analyzing" | "computing" | "success";
}

const STEPS = [
  { id: "parsing", label: "Parsing job descriptions" },
  { id: "analyzing", label: "Analyzing market demand" },
  { id: "computing", label: "Computing insights" },
];

export function ProgressIndicator({ step }: ProgressIndicatorProps) {
  if (step === "idle") return null;

  const currentIdx = step === "success" ? 3 : STEPS.findIndex(s => s.id === step);

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto relative">
        
        {/* Background Track */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-indigo-100 rounded-full z-0" />
        
        {/* Active Track */}
        <motion.div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full z-0 origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(0, currentIdx) / (STEPS.length - 1) }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {STEPS.map((s, idx) => {
          const isCompleted = currentIdx > idx;
          const isActive = currentIdx === idx;

          return (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted || isActive ? "#6366f1" : "#ffffff", // indigo-500
                  borderColor: isCompleted || isActive ? "#6366f1" : "#e0e7ff", // indigo-100
                  scale: isActive ? 1.2 : 1
                }}
                className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors duration-300 shadow-sm ${
                  isCompleted || isActive ? 'text-white' : 'text-indigo-200'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-2.5 w-2.5 fill-current" />
                )}
              </motion.div>
              <div className="absolute top-10 w-32 text-center">
                <span className={`text-xs font-semibold ${isActive ? 'text-indigo-700' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
