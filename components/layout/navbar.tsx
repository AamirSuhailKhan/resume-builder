"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useAuthStore, selectSignIn, useSessionUser } from "@/store/useAuthStore";

export function Navbar() {
  const { user } = useSessionUser();
  const signIn = useAuthStore(selectSignIn);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span className="hidden font-bold sm:inline-block text-gray-900 tracking-tight">
              CareerOS
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            // Already signed in — go to dashboard
            <Link href="/dashboard">
              <Button className="font-bold">Go to Dashboard</Button>
            </Link>
          ) : (
            // Not signed in — show Sign In + Get Started
            <>
              <Button
                variant="ghost"
                className="hidden sm:inline-flex font-medium"
                onClick={signIn}
              >
                Sign In
              </Button>
              <Button className="font-bold" onClick={signIn}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
