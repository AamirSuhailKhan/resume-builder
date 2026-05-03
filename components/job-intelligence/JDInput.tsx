"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AnalyzeButton } from "./AnalyzeButton";

interface JDInputProps {
  onAnalyze: (jds: string[]) => Promise<void>;
  step: "idle" | "parsing" | "analyzing" | "computing" | "success";
}

// Lightweight heuristic parser for live preview
const COMMON_SKILLS = [
  "React", "Node.js", "Python", "AWS", "TypeScript", "JavaScript",
  "Docker", "Kubernetes", "Next.js", "SQL", "MongoDB", "PostgreSQL",
  "GraphQL", "REST API", "CI/CD", "Git", "Azure", "GCP", "Vue", "Angular",
  "System Design", "Agile", "Java", "C++", "Go"
];

function extractPreviewSkills(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return COMMON_SKILLS.filter(s => lower.includes(s.toLowerCase()));
}

export function JDInput({ onAnalyze, step }: JDInputProps) {
  const [jds, setJds] = useState<string[]>(["", "", ""]);

  const update = (i: number, val: string) => {
    setJds((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  };

  const addSlot = () => {
    if (jds.length >= 10) return;
    setJds((prev) => [...prev, ""]);
  };

  const removeSlot = (i: number) => {
    if (jds.length <= 1) return;
    setJds((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = useCallback(() => {
    const filled = jds.map((j) => j.trim()).filter(Boolean);
    if (filled.length === 0) return;
    onAnalyze(filled);
  }, [jds, onAnalyze]);

  const filledCount = jds.filter((j) => j.trim()).length;
  const isValid = filledCount >= 3;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Job Descriptions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Paste 3–10 JDs to build a real market picture — more = better accuracy.
          </p>
        </div>
        <button
          onClick={addSlot}
          disabled={jds.length >= 10}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add JD
        </button>
      </div>

      {/* Textarea Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jds.map((jd, i) => (
          <div key={i} className="relative group">
            <textarea
              value={jd}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Job Description ${i + 1}\n\nPaste the full JD here...`}
              rows={9}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm transition-shadow"
            />
            {jds.length > 1 && (
              <button
                onClick={() => removeSlot(i)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Quick Preview extracted skills */}
            {jd.trim() && extractPreviewSkills(jd).length > 0 && (
              <div className="absolute bottom-3 left-4 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                Detected: {extractPreviewSkills(jd).slice(0, 3).join(", ")}
                {extractPreviewSkills(jd).length > 3 && "..."}
              </div>
            )}
            
            {/* Character count */}
            {jd.trim() && (
              <span className="absolute bottom-4 right-4 text-[10px] text-gray-300">
                {jd.length} chars
              </span>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-2">
        <p className={`text-sm ${isValid ? "text-emerald-600 font-medium" : "text-amber-500 font-medium"}`}>
          {isValid 
            ? `${filledCount} of ${jds.length} filled — ready to analyze` 
            : `Add at least ${3 - filledCount} more job(s) for accurate insights`}
        </p>
        <AnalyzeButton 
          onClick={handleSubmit} 
          disabled={!isValid} 
          step={step} 
        />
      </div>
    </div>
  );
}
