import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { FaGithub } from "react-icons/fa";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span className="hidden font-bold sm:inline-block text-gray-900 tracking-tight">
              ResumeAI
            </span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="#features" className="hover:text-gray-900 transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-gray-900 transition-colors">How it Works</Link>
          <Link href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="https://github.com" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
            <FaGithub className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
            </Link>
            <Link href="/dashboard">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
