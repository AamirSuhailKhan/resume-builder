"use client";

import { useState } from "react";
import { Sparkles, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface InterviewContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCompany?: string;
  defaultRole?: string;
  onSuccess?: () => void;
}

export function InterviewContributionModal({
  isOpen,
  onClose,
  defaultCompany = "",
  defaultRole = "",
  onSuccess,
}: InterviewContributionModalProps) {
  const [company, setCompany] = useState(defaultCompany);
  const [role, setRole] = useState(defaultRole);
  const [round, setRound] = useState("dsa");
  const [question, setQuestion] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [outcome, setOutcome] = useState("pending");
  const [timeline, setTimeline] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !question.trim()) {
      setError("Please fill in the company name and the questions asked.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/interview-intelligence/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "question",
          companyName: company.trim(),
          roleTitle: role.trim() || undefined,
          payload: {
            question: question.trim(),
            round,
            difficulty,
            outcome,
            timeline: timeline.trim() || "Recent",
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit contribution. Please try again.");
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setQuestion("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={submitted ? "Contribution Successful" : "Help Future Candidates Prepare"}
      description={
        submitted
          ? "Your submission makes CareerOS the living memory of India's tech ecosystem."
          : "Share your interview rounds. Help next-gen engineers bypass placement and recruitment tier bias."
      }
      className="max-w-xl"
    >
      {submitted ? (
        <div className="flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 animate-bounce">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="grid gap-2">
            <h3 className="text-lg font-bold text-foreground">Premium Intel Unlocked!</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Reciprocity Active: We have unlocked detailed questions, prep plans, and solutions for all companies.
            </p>
          </div>
          <Button onClick={handleClose} className="mt-4 w-full">
            Back to InterviewAI
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="company" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Company Name *
              </label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Swiggy, PhonePe"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="role" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Role / Title
              </label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. SDE-2 Frontend"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="round" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Round Type
              </label>
              <select
                id="round"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="online_assessment">OA / Test</option>
                <option value="dsa">DSA Coding</option>
                <option value="machine_coding">Machine Coding</option>
                <option value="system_design">System Design (HLD)</option>
                <option value="lld">Low-Level Design (LLD)</option>
                <option value="behavioral">Behavioral</option>
                <option value="hiring_manager">Hiring Manager</option>
                <option value="hr">HR</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="difficulty" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="outcome" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Outcome
              </label>
              <select
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="pending">Pending</option>
                <option value="offer">Offer Received</option>
                <option value="rejected">No Offer</option>
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="timeline" className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Timeline (When did it happen?)
            </label>
            <Input
              id="timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g. May 2026, Q2 2026"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="question" className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Questions / Problems Asked *
            </label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Construct an in-memory PubSub system with delivery guarantees, or: implement an optimized dynamic programming solution for the coin change problem."
              className="min-h-[120px]"
              required
            />
            <p className="text-[10px] text-muted-foreground leading-normal mt-1">
              Please avoid including highly specific project names or proprietary secrets to protect candidate confidentiality.
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} className="gap-2">
              <Send className="h-4 w-4" />
              Submit and Unlock Intel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
