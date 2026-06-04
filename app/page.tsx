import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { ArrowRight, Target, Zap, FileText, CheckCircle2, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-indigo-500/20 overflow-hidden font-sans">
      <Navbar />
      
      <main className="flex-1">
        
        {/* =========================================
            SECTION 1 — HERO
        ========================================= */}
        <section className="relative overflow-visible pt-28 pb-32 lg:pt-40 lg:pb-48 bg-white">
          {/* Subtle radial gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-50/80 to-transparent blur-[100px] rounded-full pointer-events-none -z-10"></div>
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-pulse duration-[5000ms]"></div>
          
          <div className="container mx-auto px-4 md:px-6 text-center relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            
            <h1 className="mx-auto max-w-5xl text-5xl font-black tracking-tight text-gray-900 sm:text-7xl lg:text-8xl leading-[1.05]">
              Stop getting rejected. <br className="hidden md:block"/>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-black drop-shadow-sm">Fix your resume instantly.</span>
            </h1>
            
            <p className="mx-auto mt-8 max-w-3xl text-xl md:text-2xl text-gray-600 leading-relaxed font-medium">
              Upload your resume and job description to see exactly why you're getting rejected — and fix it in seconds.
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/ats">
                <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-black shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] transition-all duration-300 hover:-translate-y-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl">
                  🚀 Analyze My Resume
                  <ArrowRight className="ml-3 h-6 w-6 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Button>
              </Link>
              <Link href="/ats">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-bold bg-white border-2 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1">
                  <Zap className="mr-3 h-5 w-5" /> Try Demo (No Resume Needed)
                </Button>
              </Link>
            </div>
            
            <p className="mt-6 text-sm font-bold text-gray-400 uppercase tracking-widest">
              No signup required • Takes less than 2 minutes
            </p>
          </div>
        </section>

        {/* =========================================
            SECTION 2 — VISUAL PROOF
        ========================================= */}
        <section className="py-24 bg-slate-50 border-y border-gray-200/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              
              <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-900 p-10 md:p-14 rounded-[2.5rem] shadow-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                
                <div className="flex-1 text-center md:text-left relative z-10 w-full">
                  <p className="text-xs uppercase tracking-widest font-bold text-red-400 mb-2">Before Optimization</p>
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-5xl md:text-6xl font-black text-red-400 font-mono tracking-tighter">52%</span>
                    <span className="text-2xl animate-pulse">❌</span>
                  </div>
                  <p className="text-slate-400 font-medium mt-2">Missing critical keywords</p>
                </div>
                
                <div className="hidden md:flex relative z-10">
                  <ArrowRight className="h-12 w-12 text-slate-600" />
                </div>
                
                <div className="flex-1 text-center md:text-left relative z-10 w-full border-t border-slate-700 pt-8 md:border-t-0 md:pt-0 md:border-l md:pl-12">
                  <p className="text-xs uppercase tracking-widest font-bold text-green-400 mb-2">After AI Fixes</p>
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]">81%</span>
                    <span className="text-3xl animate-bounce">✅</span>
                  </div>
                  <p className="text-emerald-400 font-bold mt-2">Strong Candidate</p>
                </div>

              </div>

              <div className="mt-8 text-center bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                <p className="text-xl md:text-2xl font-black text-indigo-900 tracking-tight">
                  Your resume was likely getting rejected. <br className="hidden md:block"/>This fixes the major issues.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 3 — WHAT YOU GET (OUTCOME-BASED)
        ========================================= */}
        <section className="py-32 bg-white relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">What this fixes</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Card 1 */}
              <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 hover:-translate-y-2 transition-transform duration-300">
                <div className="h-14 w-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-6">
                  <Target className="h-7 w-7" />
                </div>
                <h3 className="mb-6 text-2xl font-black text-gray-900">Why you're getting rejected</h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gray-400" /> <span className="text-lg font-medium text-gray-700">Missing required skills</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gray-400" /> <span className="text-lg font-medium text-gray-700">Weak, generic bullet points</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gray-400" /> <span className="text-lg font-medium text-gray-700">Role & seniority mismatch</span></li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="rounded-3xl bg-indigo-50 border border-indigo-100 p-10 hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="h-32 w-32 text-indigo-500" /></div>
                <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 relative z-10">
                  <Zap className="h-7 w-7" />
                </div>
                <h3 className="mb-6 text-2xl font-black text-gray-900 relative z-10">Instant improvements</h3>
                <ul className="space-y-4 relative z-10">
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-indigo-500" /> <span className="text-lg font-bold text-gray-900">Strong bullet rewriting</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-indigo-500" /> <span className="text-lg font-bold text-gray-900">Deep ATS optimization</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-indigo-500" /> <span className="text-lg font-bold text-gray-900">Impact metrics injected</span></li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-10 hover:-translate-y-2 transition-transform duration-300">
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="mb-6 text-2xl font-black text-gray-900">Ready-to-apply package</h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> <span className="text-lg font-medium text-gray-800">Tailored Resume</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> <span className="text-lg font-medium text-gray-800">Personalized Cover Letter</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> <span className="text-lg font-medium text-gray-800">HR Outreach Email</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 4 — HOW IT WORKS
        ========================================= */}
        <section className="py-32 bg-gray-900 text-white relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">How it works</h2>
              <p className="mt-6 text-xl text-indigo-300 font-bold uppercase tracking-widest">Takes less than 2 minutes</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-gray-800 border-2 border-gray-700 rounded-full flex items-center justify-center text-3xl font-black mb-6">1</div>
                <h3 className="text-2xl font-bold mb-3">Upload resume</h3>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-gray-800 border-2 border-indigo-500 text-indigo-400 rounded-full flex items-center justify-center text-3xl font-black mb-6">2</div>
                <h3 className="text-2xl font-bold mb-3">Paste job description</h3>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-indigo-600 text-white rounded-full flex items-center justify-center text-3xl font-black mb-6 shadow-[0_0_30px_rgba(79,70,229,0.5)]">3</div>
                <h3 className="text-2xl font-bold mb-3">Get results + apply</h3>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 6 — SOCIAL PROOF
        ========================================= */}
        <section className="py-16 bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 text-center">
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
              <div className="flex items-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                <ShieldCheck className="h-8 w-8 text-slate-800" />
                <span className="text-xl font-black tracking-tight text-slate-800 uppercase">Built for real hiring scenarios</span>
              </div>
              <div className="hidden md:block w-px h-8 bg-gray-300"></div>
              <div className="flex items-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                <TrendingUp className="h-8 w-8 text-slate-800" />
                <span className="text-xl font-black tracking-tight text-slate-800 uppercase">Designed to maximize shortlists</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 5 — DEMO CTA
        ========================================= */}
        <section className="py-24 bg-gradient-to-b from-amber-50 to-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">See it in action</h2>
            <Link href="/ats">
              <Button size="lg" className="h-16 px-12 text-lg font-black bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                <Zap className="mr-3 h-6 w-6" /> Try Demo Resume
              </Button>
            </Link>
            <p className="mt-5 text-amber-700 font-bold uppercase tracking-widest text-sm">No resume needed</p>
          </div>
        </section>

        {/* =========================================
            SECTION 7 — FINAL CTA
        ========================================= */}
        <section className="py-32 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
          
          <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 mb-10 max-w-4xl mx-auto leading-tight">
              Fix your resume before your next application.
            </h2>
            
            <Link href="/dashboard">
              <Button size="lg" className="h-20 px-16 text-xl md:text-2xl font-black shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] transition-all duration-300 hover:-translate-y-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl">
                🚀 Start Now
              </Button>
            </Link>
            
            <p className="mt-6 text-gray-500 font-bold uppercase tracking-widest text-sm">Most users apply within 2 minutes</p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="container mx-auto px-4 md:px-6 text-center text-gray-400">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-black text-gray-900 text-xl tracking-tight">CareerOS</span>
          </div>
          <p className="text-sm font-medium">© {new Date().getFullYear()} CareerOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
