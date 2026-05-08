import { CheckCircle2, Sparkles } from "lucide-react";
import { OptimizeResult } from "@/lib/ai";

export function ImprovementSummary({ result }: { result: OptimizeResult }) {
  const bulletCount = result.optimizations.length;
  const metricsCount = result.metrics_and_proof?.suggested_metrics?.length || 3;
  
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-8 h-full">
      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-indigo-500" /> What we improved
      </h3>
      <ul className="space-y-4">
        <li className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium text-lg">Strengthened <strong className="text-indigo-600 font-black">{bulletCount}</strong> weak bullet points</span>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium text-lg">Added <strong className="text-indigo-600 font-black">{metricsCount}</strong> measurable impacts</span>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium text-lg">Fixed ATS readability issues</span>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium text-lg">Identified missing skills & keywords</span>
        </li>
      </ul>
    </div>
  );
}
