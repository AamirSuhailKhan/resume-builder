"use client";

import Link from "next/link";
import { ArrowRight, Settings2, BookOpen, FileText } from "lucide-react";

interface ActionLayerProps {
  activeResumeId: string;
}

export function ActionLayer({ activeResumeId }: ActionLayerProps) {
  return (
    <div className="pt-10 border-t border-gray-100 mt-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Next Steps</h2>
          <p className="text-gray-500 text-sm mt-1">Take action based on your market insights to improve your match score.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Action 1 */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 flex flex-col items-start transition-all hover:shadow-md hover:bg-indigo-50/80">
          <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
            <Settings2 className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Optimize Resume</h3>
          <p className="text-sm text-gray-600 mb-6 flex-1">
            Let AI rewrite your current resume bullets to highlight the missing skills discovered in this analysis.
          </p>
          <Link href={`/job-optimizer?id=${activeResumeId}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors">
            Optimize Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Action 2 */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-6 flex flex-col items-start transition-all hover:shadow-md hover:bg-emerald-50/80">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Improve Skills</h3>
          <p className="text-sm text-gray-600 mb-6 flex-1">
            Browse learning resources and project ideas to build the critical market skills you are currently missing.
          </p>
          <button disabled className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border-2 border-emerald-200 px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm opacity-60 cursor-not-allowed">
            Coming Soon
          </button>
        </div>

        {/* Action 3 */}
        <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-6 flex flex-col items-start transition-all hover:shadow-md hover:bg-violet-50/80">
          <div className="h-12 w-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-5">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Generate Cover Letter</h3>
          <p className="text-sm text-gray-600 mb-6 flex-1">
            Create a targeted cover letter that explains your skill gaps positively and highlights your strengths.
          </p>
          <Link href={`/builder?id=${activeResumeId}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border-2 border-violet-200 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm hover:bg-violet-100 transition-colors">
            Open Builder <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
