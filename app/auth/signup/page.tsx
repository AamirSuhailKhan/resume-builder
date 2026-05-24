"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/useAuthStore";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse parameters
  const redirectParam = searchParams?.get("redirect") || "/dashboard";
  const emailParam = searchParams?.get("email") || "";
  const isDemo = searchParams?.get("demo") === "true";

  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithCredentials = useAuthStore((s) => s.signInWithCredentials);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync email parameter if it changes
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(false);
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create account
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          demo: isDemo,
        }),
      });

      const registerPayload = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerPayload.error ?? "Failed to create account.");
      }

      // 2. Automatically log them in
      const loggedIn = await signInWithCredentials(email, password);
      
      if (loggedIn) {
        // Redirect to original page
        router.replace(redirectParam);
      } else {
        setErrorMsg("Account created, but automatic sign-in failed. Please sign in manually.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090b0f] flex items-center justify-center p-4">
      {/* Dynamic ambient backdrop light */}
      <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute -right-1/4 -bottom-1/4 h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-950/80 rounded-2xl shadow-2xl border border-white/5 p-8 sm:p-10 text-center relative backdrop-blur-md">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">CareerOS</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
          {isDemo ? "Save your analysis!" : "Create your account"}
        </h1>
        
        <p className="text-xs text-zinc-400 mb-6 max-w-xs mx-auto leading-relaxed">
          {isDemo 
            ? "Lock in your Razorpay optimization score & NIT sample profile history to your active workspace."
            : "Sign up free to begin building, analyzing, and auto-applying with your AI career twin."}
        </p>

        {isDemo && (
          <div className="mb-6 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3.5 py-2.5 text-left text-xs text-violet-400 flex items-start gap-2 font-mono">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Smart redirect enabled: lands in active /ats with pre-calculated data loaded.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-semibold font-mono text-left">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left font-mono">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Your Name</label>
            <Input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Aditya Verma"
              required
              className="bg-zinc-900 border-white/10 text-white placeholder-zinc-600 text-xs focus:border-violet-500 h-10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="aditya@nit.in"
              autoComplete="email"
              required
              className="bg-zinc-900 border-white/10 text-white placeholder-zinc-600 text-xs focus:border-violet-500 h-10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Create Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              className="bg-zinc-900 border-white/10 text-white placeholder-zinc-600 text-xs focus:border-violet-500 h-10"
            />
          </div>

          <Button 
            disabled={submitting} 
            className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-2 mt-4"
          >
            {submitting ? "Creating account..." : "Generate free profile"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="my-5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 font-mono">or</div>

        <Button
          onClick={signInWithGoogle}
          disabled={submitting}
          className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-all font-mono text-xs flex items-center justify-center gap-2"
        >
          <FcGoogle className="h-5 w-5" />
          Continue with Google
        </Button>

        <p className="mt-6 text-[10px] text-zinc-500 font-mono">
          Already have an account?{" "}
          <button 
            type="button"
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(redirectParam)}`)}
            className="text-violet-400 hover:underline font-bold"
          >
            Log in
          </button>
        </p>

      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090b0f] flex items-center justify-center text-xs font-mono text-zinc-500">Initializing...</div>}>
      <SignupForm />
    </Suspense>
  );
}
