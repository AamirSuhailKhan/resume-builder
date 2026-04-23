import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { ArrowRight, Sparkles, Target, Zap, FileText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20 overflow-hidden">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-visible pt-24 pb-32 lg:pt-36 lg:pb-40 bg-white">
          {/* Subtle radial gradients & floating shapes */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-primary-50/80 to-transparent blur-[100px] rounded-full pointer-events-none -z-10"></div>
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-pulse duration-[5000ms]"></div>
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-pulse duration-[7000ms]"></div>
          
          <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_20%,#000_70%,transparent_100%)]"></div>
          
          <div className="container mx-auto px-4 md:px-6 text-center relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-white/60 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
              <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
              AI-Powered Resume Builder is live
            </div>
            
            <h1 className="mx-auto max-w-5xl text-6xl font-extrabold tracking-tight text-gray-950 sm:text-7xl lg:text-8xl leading-[1.1]">
              Land your dream job with a <br className="hidden md:block"/>
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-extrabold drop-shadow-sm">perfect resume</span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600 leading-relaxed font-medium">
              Create professional, ATS-friendly resumes in minutes. Our AI helps you highlight your strengths and optimize for the roles you want.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-base group font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
                  Build Your Resume Now
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-10 text-base font-semibold bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300">
                  See how it works
                </Button>
              </Link>
            </div>
            
            {/* Realistic Resume Mockup with 3D Tilt */}
            <div className="relative mx-auto mt-16 max-w-5xl group animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 fill-mode-both">
              {/* Blurred background glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary via-purple-500 to-pink-500 rounded-3xl blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
              
              <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl ring-1 ring-gray-900/5 p-2 md:p-4 [transform:perspective(2000px)_rotateX(4deg)_rotateY(-4deg)] group-hover:[transform:perspective(2000px)_rotateX(0deg)_rotateY(0deg)] transition-all duration-700 ease-out flex overflow-hidden">
                
                {/* App UI Wrapper */}
                <div className="w-full h-full bg-gray-50/80 rounded-2xl overflow-hidden border border-gray-100 flex shadow-inner relative">
                  
                  {/* Left Sidebar (Editor) */}
                  <div className="w-72 bg-white border-r border-gray-100 hidden md:flex flex-col p-6 z-10">
                    <div className="h-6 w-32 bg-gray-200 rounded-md mb-8"></div>
                    <div className="space-y-5">
                      <div>
                        <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-50 border border-gray-200 rounded-lg"></div>
                      </div>
                      <div>
                        <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-50 border border-gray-200 rounded-lg"></div>
                      </div>
                      <div>
                        <div className="h-3 w-16 bg-gray-200 rounded mb-2"></div>
                        <div className="h-24 w-full bg-gray-50 border border-gray-200 rounded-lg"></div>
                      </div>
                    </div>
                    <div className="mt-auto h-12 w-full bg-primary/10 rounded-xl flex items-center justify-center">
                      <div className="h-4 w-24 bg-primary/30 rounded"></div>
                    </div>
                  </div>

                  {/* Right Preview Area */}
                  <div className="flex-1 bg-gray-200/50 p-4 sm:p-8 flex items-start justify-center overflow-hidden relative">
                    {/* The A4 Document */}
                    <div className="w-full max-w-[500px] aspect-[1/1.414] bg-white shadow-xl shadow-black/10 border border-gray-100/50 p-6 sm:p-10 flex flex-col font-serif group-hover:-translate-y-2 transition-transform duration-700">
                      
                      <div className="border-b-[1.5px] border-gray-800 pb-3 mb-4 text-left">
                        <h3 className="font-bold text-2xl sm:text-3xl uppercase tracking-widest text-gray-900">Alex Morgan</h3>
                        <p className="text-primary-700 font-sans font-medium text-sm sm:text-base mt-1">Senior Frontend Developer</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-gray-500 font-sans text-[9px] sm:text-[11px]">
                          <span>alex.morgan@example.com</span>•<span>+1 (555) 123-4567</span>•<span>San Francisco, CA</span>
                        </div>
                      </div>
                      
                      <div className="mb-4 text-left">
                        <h4 className="font-bold uppercase tracking-widest text-gray-800 border-b border-gray-200 pb-1 mb-2 font-sans text-[10px] sm:text-xs">Experience</h4>
                        <div className="mb-3">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="font-bold text-gray-900 text-[11px] sm:text-sm">TechCorp Inc.</span>
                            <span className="font-sans text-gray-500 text-[9px] sm:text-[11px]">2021 — Present</span>
                          </div>
                          <div className="text-primary-700 font-sans font-medium text-[10px] sm:text-xs mb-1">Senior Developer</div>
                          <ul className="list-disc ml-4 text-gray-600 space-y-1 text-[9px] sm:text-[11px]">
                            <li>Led frontend team to migrate legacy React app to Next.js, improving load time by 40%.</li>
                            <li>Implemented a cohesive design system used across 5 internal products.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="mb-4 text-left">
                        <h4 className="font-bold uppercase tracking-widest text-gray-800 border-b border-gray-200 pb-1 mb-2 font-sans text-[10px] sm:text-xs">Skills</h4>
                        <div className="text-[9px] sm:text-[11px] text-gray-600 leading-relaxed">
                          <span className="font-bold text-gray-800">Frameworks:</span> React, Next.js, Tailwind CSS, Framer Motion <br/>
                          <span className="font-bold text-gray-800">Languages:</span> JavaScript, TypeScript, HTML/CSS, GraphQL
                        </div>
                      </div>
                      
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 bg-white relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">Everything you need to succeed</h2>
              <p className="mt-6 text-xl text-gray-600">Our platform provides all the tools necessary to craft a standout application.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <div key={i} className="group relative rounded-[2rem] bg-gradient-to-b from-gray-100 to-gray-50 p-px transition-all duration-500 hover:from-primary/40 hover:to-purple-500/40 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)]">
                  <div className="relative h-full rounded-[calc(2rem-1px)] bg-white p-10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      <div className="relative inline-flex mb-8">
                        {/* Icon Background Glow */}
                        <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full group-hover:bg-primary/50 transition-colors duration-500 scale-150"></div>
                        <div className="relative h-14 w-14 items-center justify-center flex rounded-2xl bg-white border border-primary/10 text-primary shadow-sm group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          <feature.icon className="h-7 w-7" />
                        </div>
                      </div>
                      <h3 className="mb-4 text-2xl font-bold text-gray-950">{feature.title}</h3>
                      <p className="text-gray-600 text-lg leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-32 bg-gray-50 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-24">
              <h2 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">How it works</h2>
              <p className="mt-6 text-xl text-gray-600">Three simple steps to your next interview.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-[2.5rem] left-[15%] right-[15%] h-1 bg-gradient-to-r from-primary-100 via-primary-300 to-primary-100 rounded-full z-0 opacity-50"></div>

              {[
                { step: "01", title: "Fill in your details", desc: "Start from scratch or upload your existing resume." },
                { step: "02", title: "Let AI optimize it", desc: "Our AI suggests improvements and tailors your content." },
                { step: "03", title: "Download & Apply", desc: "Export to PDF and start applying with confidence." },
              ].map((item, i) => (
                <div key={i} className="relative flex flex-col items-center text-center group z-10">
                  <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl shadow-gray-200/50 text-2xl font-bold text-gray-900 group-hover:text-white group-hover:bg-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-110 border border-gray-100 group-hover:border-primary">
                    {item.step}
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-gray-950">{item.title}</h3>
                  <p className="text-gray-600 text-lg max-w-[280px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-16">
        <div className="container mx-auto px-4 md:px-6 text-center text-gray-500">
          <div className="flex justify-center items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <FileText className="h-6 w-6" />
            </div>
            <span className="font-bold text-gray-950 text-2xl tracking-tight">ResumeAI</span>
          </div>
          <p className="text-base text-gray-500">© {new Date().getFullYear()} ResumeAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Sparkles,
    title: "AI Resume Builder",
    description: "Generate professional bullet points and summaries instantly with our advanced AI.",
  },
  {
    icon: Target,
    title: "ATS Optimization",
    description: "Ensure your resume passes Applicant Tracking Systems with keyword suggestions.",
  },
  {
    icon: Zap,
    title: "Real-time Preview",
    description: "See your changes instantly as you type with our pixel-perfect live preview.",
  },
];

