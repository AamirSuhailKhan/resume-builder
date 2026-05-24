"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  selectAuthError,
  selectSignIn,
  selectSignInWithCredentials,
  useAuthStore,
  useSessionUser,
} from "@/store/useAuthStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSessionExpired = searchParams?.get("error") === "SessionExpired";
  const redirectParam = searchParams?.get("redirect") || "/dashboard";
  const { user, loading } = useSessionUser();
  const error = useAuthStore(selectAuthError);
  const signInWithGoogle = useAuthStore(selectSignIn);
  const signInWithCredentials = useAuthStore(selectSignInWithCredentials);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace(redirectParam);
  }, [user, router, redirectParam]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const ok = await signInWithCredentials(email, password);
    setSubmitting(false);
    if (ok) router.replace(redirectParam);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-indigo-100/60 border border-gray-100 p-10 text-center">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tight">CareerOS</span>
          </div>
        </div>

        {isSessionExpired ? (
          <>
            <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
              Reconnecting workspace...
            </h1>
            <p className="text-gray-500 mb-8 font-medium max-w-sm mx-auto leading-relaxed">
              Your secure session expired after a system update. Please log back in to reconnect your AI Career OS.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              Sign in to continue
            </h1>
            <p className="text-gray-500 mb-8 font-medium">Your AI-powered resume builder</p>
          </>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <Button disabled={loading || submitting} size="lg" className="w-full h-12 font-bold rounded-2xl">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="my-6 text-xs font-bold uppercase tracking-widest text-gray-400">or</div>

        <Button
          onClick={signInWithGoogle}
          disabled={loading || submitting}
          size="lg"
          className="w-full h-14 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 font-bold text-base rounded-2xl"
        >
          <FcGoogle className="h-6 w-6 mr-3" />
          Continue with Google
        </Button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
