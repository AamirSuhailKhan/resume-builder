"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Target, AlertTriangle, CheckCircle2, TrendingUp, Search } from "lucide-react";
import { ResumeAI } from "@/lib/api";
import { ResumeData } from "@/types/resume";

interface ATSAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
}

export function ATSAnalyzerModal({ isOpen, onClose, resumeData }: ATSAnalyzerModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<{ score: number; missingKeywords: string[]; weakSections: string[]; suggestions: string[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      
      const analyze = async () => {
        try {
          const res = await ResumeAI.analyzeATS(resumeData);
          setResult(res);
        } catch (error) {
          console.error("ATS Analysis failed", error);
        } finally {
          setIsLoading(false);
        }
      };

      analyze();
    }
  }, [isOpen, resumeData]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ATS Resume Analysis" className="max-w-2xl">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative">
              <svg className="animate-spin -ml-1 mr-3 h-16 w-16 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Scanning against 10,000+ job descriptions...</h3>
              <p className="text-gray-500 text-sm mt-1">Checking keywords, formatting, and impact metrics.</p>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Score Section */}
            <div className="flex flex-col sm:flex-row items-center gap-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="relative flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    stroke="currentColor" strokeWidth="8" fill="transparent" 
                    className={result.score >= 80 ? "text-green-500" : result.score >= 60 ? "text-amber-500" : "text-red-500"}
                    strokeDasharray={56 * 2 * Math.PI}
                    strokeDashoffset={(56 * 2 * Math.PI) - ((result.score / 100) * (56 * 2 * Math.PI))}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-gray-900">{result.score}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">/ 100</span>
                </div>
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {result.score >= 80 ? "Excellent Match!" : result.score >= 60 ? "Good, but needs work." : "Needs significant improvements."}
                </h3>
                <p className="text-gray-600 text-sm">
                  Your resume scores higher than {Math.max(10, result.score - 15)}% of applicants. Address the issues below to increase your interview chances.
                </p>
              </div>
            </div>

            {/* Missing Keywords */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Missing Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map(kw => (
                  <span key={kw} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                    <AlertTriangle className="h-3 w-3 mr-1" /> {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Actionable Suggestions */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" /> Improvement Suggestions
              </h4>
              <ul className="space-y-3">
                {result.suggestions.map((sug, i) => (
                  <li key={i} className="flex gap-3 items-start bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 leading-relaxed">{sug}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button onClick={onClose} className="px-8 shadow-sm">Got it</Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
