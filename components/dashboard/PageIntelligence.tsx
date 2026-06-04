"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { 
  BrainCircuit, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp,
  Target,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

type IntelligenceData = {
  situation: string;
  blocking: string;
  nextStep: string;
  insights: string[];
  predictions: string[];
  recommendations: string[];
  actions: string[];
};

const PAGE_INTEL: Record<string, IntelligenceData> = {
  "/dashboard": {
    situation: "Alex Chen is tracking 3 active pipelines (Stripe, OpenAI, Cohere) with a 71% readiness score and target base of 240k–300k INR.",
    blocking: "High ratio of cold outbox applications (Cohere rejected) vs referral submissions. Resume ATS matching is below 80% for stretch Staff roles.",
    nextStep: "Optimize the resume for the Anthropic MTS role (current match is 96% on paper but needs system design tailoring) and get a warm referral for Stripe.",
    insights: [
      "AI queue is processing background company matches.",
      "Standard cold applications have a <5% response rate in the current hiring climate."
    ],
    predictions: [
      "Offer probability for Stripe is 35% without referrals, 78% with referrals.",
      "Expected timeline to first interview is 11 days if referral action is triggered."
    ],
    recommendations: [
      "Convert cold pipelines to referral pipelines immediately.",
      "Shift preparation focus toward distributed AI serving questions."
    ],
    actions: [
      "Request warm intro for Stripe Staff role.",
      "Run ATS optimizer for Anthropic MTS."
    ]
  },
  "/opportunities": {
    situation: "6 matching roles identified (Anthropic MTS, Stripe Staff, Vercel Principal) with high baseline match scores (82%–96%).",
    blocking: "0 referral networks activated for top 3 high-fit opportunities. Target salary ranges require active leverage.",
    nextStep: "Trigger direct outbound warm introductions to engineering managers at Anthropic.",
    insights: [
      "Anthropic serving stack (vLLM, Ray) aligns perfectly with Alex's background.",
      "Opportunity list contains 3 roles with active internal hiring managers linked."
    ],
    predictions: [
      "Response rate for Anthropic MTS is predicted at 88% if referral route is utilized.",
      "Average time-to-first-round is 8 days for high-match opportunities."
    ],
    recommendations: [
      "Prioritize Stripe and Anthropic applications first.",
      "Leverage the internal referral engine before submitting application forms."
    ],
    actions: [
      "Select 'Ask for Referral' on Anthropic MTS role.",
      "Bookmark Vercel Principal AI path."
    ]
  },
  "/market-weather": {
    situation: "Analyzing AI/ML Platform track. Labor market hiring is stable (+2.4% job post growth).",
    blocking: "Q3 budget shifts are causing minor hiring cycle delays for growth-stage startups.",
    nextStep: "Focus on Series C+ or public companies (e.g. Stripe, OpenAI) that have active headcount.",
    insights: [
      "LLM serving optimization and vLLM are top fast-filling skills (+14% MoM demand).",
      "Traditional web-framework roles are slowing, whereas infrastructure engineering remains hot."
    ],
    predictions: [
      "Demand for distributed AI serving engineers will spike in next 45 days.",
      "Startup hiring budgets are expected to open up by 15% next quarter."
    ],
    recommendations: [
      "Feature LLM serving metric improvements on primary resume header.",
      "Target locations with high-concentration tech clusters (SF/Remote)."
    ],
    actions: [
      "Add vLLM benchmark data to project experience section.",
      "Subscribe to weekly market digest alerts."
    ]
  },
  "/agent": {
    situation: "Supervised auto-apply mode is active (max 5 applications/day).",
    blocking: "Approval blocks pending for Stripe and OpenAI applications due to missing target salary parameters.",
    nextStep: "Approve the application drafts in the Agent Queue.",
    insights: [
      "Agent has scanned 14 listings, matching 2 to target parameters.",
      "Supervised mode prevents misaligned submissions but introduces manual latency."
    ],
    predictions: [
      "Running agent in supervised mode will secure 2 interviews within 14 days.",
      "Automating applications will increase weekly volume by 4.2x."
    ],
    recommendations: [
      "Adjust autonomy policy to allow automatic application submission for matches >90%.",
      "Provide more detailed salary floor parameters to avoid manual blocks."
    ],
    actions: [
      "Toggle 'Auto-Submit for >90% Matches' to true in Settings.",
      "Clear pending application queue."
    ]
  },
  "/skill-gap": {
    situation: "Target Staff/Principal roles require deep proficiency in GPU serving, Triton Inference Server, and speculative decoding.",
    blocking: "Profile shows 2 critical skill gaps: Triton Inference Server and Speculative Decoding implementation.",
    nextStep: "Complete the interactive system design mock simulation on Triton optimization.",
    insights: [
      "4 out of 5 target companies list Triton in their preferred requirements.",
      "Closing skill gaps improves resume match scoring by average +12 points."
    ],
    predictions: [
      "Closing the Triton skill gap will increase interview conversion probability by 28%.",
      "Reaching 95% readiness will trigger premium high-paying job alerts."
    ],
    recommendations: [
      "Create a mock project repository demonstrating Triton multi-model orchestration.",
      "Spend 30 minutes daily on system design drills."
    ],
    actions: [
      "Start Triton mock module in Prep portal.",
      "Link GitHub repo to verify existing distributed systems projects."
    ]
  },
  "/career-graph": {
    situation: "Career roadmap visualizes trajectory to Staff AI Platform Engineer.",
    blocking: "Transition path requires validated projects in high-concurrency systems.",
    nextStep: "Link current experience items to the verified project graph nodes.",
    insights: [
      "Linear paths that bypass senior-to-staff mock rounds have higher rejection rates.",
      "Visual graphs help recruiters parse architectural experience in <5 seconds."
    ],
    predictions: [
      "A validated graph increases overall platform credibility score to 84%.",
      "Reaching Staff role level within 12 months is highly probable (72%)."
    ],
    recommendations: [
      "Sync graph data with your LinkedIn profile to attract inbound recruiters.",
      "Add architectural trade-off nodes to project pathways."
    ],
    actions: [
      "Export updated Career Graph nodes to resume.",
      "Connect Graph to active job opportunities list."
    ]
  },
  "/builder": {
    situation: "Managing 1 active resume version tailored for Anthropic MTS.",
    blocking: "Current resume bullet points lack specific metrics on GPU serving efficiency.",
    nextStep: "Tailor experience descriptions with metrics (e.g. 'reduced latency by 40%').",
    insights: [
      "Top ATS engines score this resume 96% for Anthropic, but only 74% for general Staff SDE.",
      "Dynamic tailoring is missing for Vercel AI Platform role."
    ],
    predictions: [
      "Tailoring bullets will increase screening success rate to 92%.",
      "ATS scoring will improve to 95% with specific infrastructure keywords."
    ],
    recommendations: [
      "Ensure first 3 bullets of latest experience contain quantitative latency and cost numbers.",
      "Keep resume clean and single-page for fast recruiter parsing."
    ],
    actions: [
      "Open ATS Optimizer modal to run a score simulation.",
      "Export PDF version of tailored Anthropic resume."
    ]
  },
  "/ats": {
    situation: "Resume screening score is currently 79%.",
    blocking: "Missing keywords: 'speculative decoding', 'KV caching', 'Triton'.",
    nextStep: "Inject missing keywords naturally into skills section.",
    insights: [
      "Anthropic MTS resume scanner weights KV caching and inference serving heavily.",
      "Keyword density is high, but placement lacks hierarchical emphasis."
    ],
    predictions: [
      "Adding these 3 keywords will boost ATS score to 94%.",
      "Chances of passing initial screening rise by 3.5x with a score >85%."
    ],
    recommendations: [
      "Utilize the AI suggestions to insert missing keywords into the experience bullets.",
      "Run optimizer on each tailored role separately."
    ],
    actions: [
      "Apply 'speculative decoding' suggested edit block.",
      "Re-run ATS analyzer model."
    ]
  },
  "/applications": {
    situation: "Tracking 3 active applications (Stripe: Interview, OpenAI: Applied, Cohere: Rejected).",
    blocking: "Cohere application was rejected due to ATS misalignment. Stripe is pending interview slot scheduling.",
    nextStep: "Confirm the interview availability slots for Stripe.",
    insights: [
      "Average response time for Stripe in Q2 is 4 days.",
      "No communication detected on OpenAI application for 7 days."
    ],
    predictions: [
      "Probability of receiving an offer from Stripe is 62% if next round is scheduled within 48 hours.",
      "OpenAI response likelihood is 23% unless direct recruiter contact is initiated."
    ],
    recommendations: [
      "Set up Google Calendar sync to prevent double-booking.",
      "Follow up with OpenAI recruiter via automated recruiter email templates."
    ],
    actions: [
      "Connect calendar and choose availability slots.",
      "Generate OpenAI follow-up email template."
    ]
  },
  "/interview-ai": {
    situation: "0 mock sessions completed this week. Last session score: 70%.",
    blocking: "Mock prep is lagging; system design responses lack concrete architectural trade-offs.",
    nextStep: "Start a mock interview drill for 'Distributed Serving & speculative decoding'.",
    insights: [
      "Focus areas: Model quantization, serving cost analysis.",
      "Communication speed is good, but vocabulary lacks staff-level design patterns."
    ],
    predictions: [
      "Completing 3 mocks will boost communication score to 85%.",
      "Target interview pass rate jumps to 78% after 5 mock scenarios."
    ],
    recommendations: [
      "Record video to analyze posture and hesitation markers.",
      "Practice drawing system components on virtual whiteboard."
    ],
    actions: [
      "Click 'Start Mock Interview' button.",
      "Select 'Distributed Systems' drill track."
    ]
  },
  "/negotiation": {
    situation: "0 active offer letters received; Stripe pipeline is in the final stages.",
    blocking: "Lacks competing offers to leverage higher base salary bands ($320k+).",
    nextStep: "Accelerate Anthropic and OpenAI interview pipelines to align final rounds.",
    insights: [
      "Stripe standard base for Staff is $280k, stretch is $350k.",
      "Hiring timing analysis indicates high budget flexibility this month."
    ],
    predictions: [
      "Having a competing Anthropic offer will increase base salary offer by $40k.",
      "Stripe offer package probability is 64%."
    ],
    recommendations: [
      "Do not share salary expectations first; ask Stripe for their approved budget band.",
      "Focus on signing bonus leverage during negotiations."
    ],
    actions: [
      "Review CTC Decoder model benchmarks.",
      "Prepare salary script for final conversation with recruiter."
    ]
  },
  "/analytics": {
    situation: "Application conversion funnel is: 12% Interview rate, 4% Offer rate.",
    blocking: "Rejection at initial resume screening (70% rejection rate) is dragging down conversions.",
    nextStep: "Focus on warm referral applications to increase conversion rates.",
    insights: [
      "Referrals have a 4.5x higher conversion to interview than cold applications.",
      "Ready score of 71% translates to 1.8x interview conversions over last month."
    ],
    predictions: [
      "Moving to a 50% referral mix will boost interview rate to 35%.",
      "Estimated offer count is 1.6 within the next 60 days."
    ],
    recommendations: [
      "Focus outreach on alumni and first-degree connections.",
      "De-prioritize cold portals and focus strictly on verified listings."
    ],
    actions: [
      "View Opportunity Intelligence to find roles with referral connections.",
      "Synchronize resume database versions."
    ]
  },
  "/forecasting": {
    situation: "Visualizing 12-month salary trajectories for Current, Aggressive, and Optimized tracks.",
    blocking: "Current path limits salary adjustments to standard hikes (+12% per year).",
    nextStep: "Activate the Optimized Path to aim for a +60% compensation bump.",
    insights: [
      "Optimized path depends on referral entries and closing 2 skill gaps.",
      "Aggressive path targets stretch roles with slightly lower initial conversion rates."
    ],
    predictions: [
      "Optimized path yields 29 LPA in 12 months with 92% goal completion odds.",
      "Aggressive path yields 26 LPA with 40% goal completion odds."
    ],
    recommendations: [
      "Initiate the referral pipeline immediately to support the Optimized trajectory.",
      "Schedule mock interview system design drills weekly."
    ],
    actions: [
      "Activate the Optimized Path configuration.",
      "Schedule a mock system design interview."
    ]
  }
};

export function PageIntelligence() {
  const pathname = usePathname() || "/dashboard";
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Find match or default to dashboard
  const cleanPath = Object.keys(PAGE_INTEL).find(
    (key) => pathname === key || pathname.startsWith(`${key}/`)
  ) || "/dashboard";
  
  const [data, setData] = useState<IntelligenceData>(
    (PAGE_INTEL[cleanPath] || PAGE_INTEL["/dashboard"]) as IntelligenceData
  );
  
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let active = true;
    fetch(`/api/v1/page-intel?pathname=${encodeURIComponent(pathname)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load intel");
        return res.json();
      })
      .then((resData) => {
        if (active) {
          setData(resData);
        }
      })
      .catch((err) => {
        console.warn("Failed to load dynamic page intelligence, using default:", err);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  const toggleAction = (action: string) => {
    setCompletedActions(prev => ({
      ...prev,
      [action]: !prev[action]
    }));
  };

  return (
    <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-[#0b0d1b] to-slate-950 shadow-lg shadow-indigo-950/20 overflow-hidden transition-all duration-300">
      {/* Header section */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-900/40 select-none transition-colors border-b border-slate-800/60"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <BrainCircuit className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
              AI Diagnostics & Telemetry
              <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time situational intelligence and next-step actions</p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Situation & Blocking & Next Step */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4.5 relative overflow-hidden group hover:border-slate-800 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300" />
              <div className="flex items-center gap-2 mb-2.5">
                <Target className="h-4 w-4 text-blue-400 shrink-0" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Current Situation</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {data.situation}
              </p>
            </div>

            <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4.5 relative overflow-hidden group hover:border-slate-800 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-300" />
              <div className="flex items-center gap-2 mb-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Blocking Factors</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {data.blocking}
              </p>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4.5 relative overflow-hidden group hover:border-indigo-500/30 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-300" />
              <div className="flex items-center gap-2 mb-2.5">
                <ArrowRight className="h-4 w-4 text-indigo-400 shrink-0" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Immediate Next Step</h4>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {data.nextStep}
              </p>
            </div>
          </div>

          {/* Predictions & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Insights & Predictions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Forecasts & Predictions</h4>
              </div>
              <ul className="space-y-3">
                {data.predictions.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-normal">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
                {data.insights.map((insight, idx) => (
                  <li key={`ins-${idx}`} className="flex items-start gap-2.5 text-xs text-slate-400 leading-normal">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Levers Checklist */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Recommended Action Levers</h4>
              </div>
              <div className="space-y-2">
                {data.actions.map((act, i) => {
                  const isDone = !!completedActions[act];
                  return (
                    <div 
                      key={i} 
                      onClick={() => toggleAction(act)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer select-none transition-all duration-200",
                        isDone 
                          ? "border-emerald-500/20 bg-emerald-500/5 text-slate-400 line-through" 
                          : "border-slate-800/80 bg-slate-900/20 text-slate-200 hover:border-slate-700/80 hover:bg-slate-900/40"
                      )}
                    >
                      {isDone ? (
                        <CheckSquare className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="h-4.5 w-4.5 text-slate-500 shrink-0 hover:text-indigo-400" />
                      )}
                      <span className="font-medium">{act}</span>
                    </div>
                  );
                })}
                {data.recommendations.map((rec, idx) => (
                  <p key={`rec-${idx}`} className="text-[11px] text-slate-400 italic pl-1 mt-1">
                    Tip: {rec}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
