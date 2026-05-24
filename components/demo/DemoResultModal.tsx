"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShieldCheck, Mail, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface DemoResultModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export function DemoResultModal({ isOpen, onDismiss }: DemoResultModalProps) {
  const router = useRouter();

  const handleSave = () => {
    router.push("/auth/signup?redirect=/ats&demo=true");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-violet-500/30 bg-zinc-950 p-6 text-zinc-100 shadow-2xl"
          >
            {/* Corner Close Button */}
            <button
              onClick={onDismiss}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200 transition"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Glowing Accent */}
            <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-violet-600/30 blur-2xl pointer-events-none" />

            <div className="space-y-6">
              {/* Header Icon */}
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Sparkles className="h-6 w-6" />
              </div>

              {/* Title & Body */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Your analysis is ready!
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Save these results permanently, track 100+ applications, and unlock weekly Indian developer compensation & market intelligence.
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-3 rounded-lg bg-zinc-900/60 p-4 border border-white/5">
                <div className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Permanent backup of your baseline and optimized resume scores.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <Mail className="mt-0.5 h-4 w-4 text-violet-400 shrink-0" />
                  <span>Receive Sunday Night India Hiring Trends & salary matrix digests.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold flex items-center justify-center gap-2 py-5 text-sm"
                >
                  Save free — takes 30 seconds
                  <ArrowRight className="h-4 w-4" />
                </Button>
                
                <button
                  onClick={onDismiss}
                  className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition py-2"
                >
                  Continue without saving
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
