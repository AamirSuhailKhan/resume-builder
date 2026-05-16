"use client";

import { useState } from "react";
import { Copy, MessageSquare, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Counter = { amount: number; script: string; emailDraft: string };
type Analysis = {
  sessionId: string;
  marketAnalysis: { min: number; max: number; median: number; percentile: number };
  counterOffers: { conservative: Counter; standard: Counter; aggressive: Counter };
  walkawayNumber: number;
  leverage: string[];
  redFlags: string[];
};
type ChatMessage = { role: "user" | "assistant"; content: string; suggestion?: string };

const format = (currency: string, value: number) => new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

export default function NegotiationPage() {
  const [form, setForm] = useState({ jobTitle: "", companyName: "", offerBase: 0, currency: "INR", location: "", offerEquity: "", offerBonus: 0 });
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"strategy" | "simulator">("strategy");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [score, setScore] = useState<{ assertiveness: number; professionalism: number; outcome: number } | null>(null);

  async function analyze() {
    setLoading(true);
    const response = await fetch("/api/v1/negotiation/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    setAnalysis(payload);
    setLoading(false);
  }

  async function sendMessage() {
    if (!analysis || !draft.trim()) return;
    const userMessage = draft.trim();
    setDraft("");
    setMessages((current) => [...current, { role: "user", content: userMessage }]);
    const response = await fetch(`/api/v1/negotiation/${analysis.sessionId}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage, conversationHistory: messages }),
    });
    const payload = await response.json();
    setMessages((current) => [...current, { role: "assistant", content: payload.reply, suggestion: payload.suggestion }]);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6">
      <div>
        <p className="text-sm font-medium text-accent">Salary Negotiation Co-Pilot</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">Negotiate the offer, not your confidence.</h1>
      </div>

      {!analysis && (
        <Card variant="elevated">
          <CardHeader><CardTitle>Offer details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input label="Job title" value={form.jobTitle} onChange={(jobTitle) => setForm({ ...form, jobTitle })} />
            <Input label="Company" value={form.companyName} onChange={(companyName) => setForm({ ...form, companyName })} />
            <Input label="Base salary" type="number" value={String(form.offerBase || "")} onChange={(offerBase) => setForm({ ...form, offerBase: Number(offerBase) })} />
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Currency</span>
              <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm">
                <option>INR</option><option>USD</option><option>EUR</option>
              </select>
            </label>
            <Input label="Location" value={form.location} onChange={(location) => setForm({ ...form, location })} />
            <Input label="Equity" value={form.offerEquity} onChange={(offerEquity) => setForm({ ...form, offerEquity })} />
            <Input label="Bonus" type="number" value={String(form.offerBonus || "")} onChange={(offerBonus) => setForm({ ...form, offerBonus: Number(offerBonus) })} />
            <div className="md:col-span-2 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground">
              Never negotiate by lying about competing offers. Use real anchors: market data, role scope, and your proven impact.
            </div>
            <Button onClick={analyze} disabled={!form.jobTitle || !form.companyName || !form.offerBase} isLoading={loading} className="md:col-span-2">
              <Sparkles className="h-4 w-4" />
              Analyze my offer
            </Button>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <>
          <div className="flex gap-2">
            <Button variant={tab === "strategy" ? "primary" : "outline"} onClick={() => setTab("strategy")}>Strategy</Button>
            <Button variant={tab === "simulator" ? "primary" : "outline"} onClick={() => setTab("simulator")}>Simulator</Button>
          </div>

          {tab === "strategy" && (
            <div className="grid gap-6 lg:grid-cols-[280px_1fr_280px]">
              <Card variant="elevated">
                <CardHeader><CardTitle>Market position</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-3 rounded-full bg-surface-muted"><div className="h-3 rounded-full bg-accent" style={{ width: `${analysis.marketAnalysis.percentile}%` }} /></div>
                  <p className="mt-3 text-sm text-muted-foreground">{analysis.marketAnalysis.percentile}th percentile</p>
                  <p className="mt-2 text-sm text-muted-foreground">Median: {format(form.currency, analysis.marketAnalysis.median)}</p>
                </CardContent>
              </Card>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(analysis.counterOffers).map(([label, counter]) => (
                  <Card key={label} variant="elevated">
                    <CardHeader><CardTitle className="capitalize">{label}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-2xl font-semibold">{format(form.currency, counter.amount)}</p>
                      <details className="text-sm leading-6 text-muted-foreground"><summary>Script</summary>{counter.script}</details>
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(counter.emailDraft)}><Copy className="h-4 w-4" /> Copy email</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card variant="elevated">
                <CardHeader><CardTitle>Leverage</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Badge>Walkaway: {format(form.currency, analysis.walkawayNumber)}</Badge>
                  {analysis.leverage.map((item) => <p key={item} className="text-sm text-muted-foreground">{item}</p>)}
                  {analysis.redFlags.map((item) => <p key={item} className="text-sm text-danger">{item}</p>)}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "simulator" && (
            <Card variant="elevated">
              <CardHeader><CardTitle><MessageSquare className="mr-2 inline h-4 w-4 text-accent" />Practice with AI HR</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="min-h-72 space-y-3 rounded-lg border border-border bg-surface p-4">
                  {messages.map((message, index) => (
                    <div key={index} className={message.role === "user" ? "ml-auto max-w-[80%] rounded-lg bg-accent/10 p-3" : "max-w-[80%] rounded-lg bg-surface-muted p-3"}>
                      <p className="text-sm leading-6">{message.content}</p>
                      {message.suggestion && <p className="mt-2 rounded-lg bg-success/10 p-2 text-xs text-success">Coaching tip: {message.suggestion}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm" placeholder="Type your negotiation response..." />
                  <Button onClick={sendMessage}><Send className="h-4 w-4" /> Send</Button>
                  <Button variant="outline" onClick={() => setScore({ assertiveness: 7, professionalism: 8, outcome: 7 })}>How'd I do?</Button>
                </div>
                {score && <div className="grid gap-3 md:grid-cols-3">{Object.entries(score).map(([key, value]) => <Badge key={key}>{key}: {value}/10</Badge>)}</div>}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm" />
    </label>
  );
}
