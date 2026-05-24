"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calculator, Clipboard, Copy, FileText, IndianRupee, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type TaxRegime = "new" | "old";
type Mode = "paste" | "manual";

type ManualForm = {
  company: string;
  quotedCtc: string;
  fixedComponent: string;
  variableComponent: string;
  variablePct: string;
  basicSalary: string;
  hra: string;
  specialAllowance: string;
  pfEmployer: string;
  gratuityAnnual: string;
  esop: string;
};

type Breakdown = {
  quotedCtc: number;
  fixedComponent: number;
  variableComponent: number;
  variablePct: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  pfEmployee: number;
  pfEmployer: number;
  gratuityAnnual: number;
  bonus: number;
  esop: number;
  grossAnnual: number;
  netAnnual: number;
  grossMonthly: number;
  netMonthly: number;
  taxAnnual: number;
  taxRegime: TaxRegime;
  effectiveCtc: number;
};

const emptyManual: ManualForm = {
  company: "",
  quotedCtc: "",
  fixedComponent: "",
  variableComponent: "",
  variablePct: "",
  basicSalary: "",
  hra: "",
  specialAllowance: "",
  pfEmployer: "",
  gratuityAnnual: "",
  esop: "",
};

const rupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));

const lakhs = (value: number) => `${Math.round((value || 0) / 100000)}L`;
const numberFrom = (value: string) => Number(value.replace(/,/g, "")) || 0;

export default function DemoCtcPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("paste");
  const [taxRegime, setTaxRegime] = useState<TaxRegime>("new");
  const [rawText, setRawText] = useState("");
  const [manual, setManual] = useState<ManualForm>(emptyManual);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [captureError, setCaptureError] = useState("");

  const canSubmit = mode === "paste" ? rawText.trim().length > 20 : Boolean(manual.fixedComponent || manual.quotedCtc);

  const shareText = useMemo(() => {
    if (!breakdown) return "";
    return [
      "Decoded my offer using CareerOS:",
      `Quoted CTC: INR ${lakhs(breakdown.quotedCtc)}`,
      `Actual take-home: ${rupees(breakdown.netMonthly)}/month`,
      "Decode yours: careeros.in/demo/ctc",
    ].join("\n");
  }, [breakdown]);

  async function decode() {
    setLoading(true);
    setError("");
    setCopied(false);
    setCaptureSuccess(false);

    const body =
      mode === "paste"
        ? { rawText, taxRegime }
        : {
            company: manual.company || undefined,
            taxRegime,
            manualBreakdown: {
              quotedCtc: numberFrom(manual.quotedCtc),
              fixedComponent: numberFrom(manual.fixedComponent),
              variableComponent: numberFrom(manual.variableComponent),
              variablePct: numberFrom(manual.variablePct),
              basicSalary: numberFrom(manual.basicSalary),
              hra: numberFrom(manual.hra),
              specialAllowance: numberFrom(manual.specialAllowance),
              pfEmployer: numberFrom(manual.pfEmployer),
              gratuityAnnual: numberFrom(manual.gratuityAnnual),
              esop: numberFrom(manual.esop),
            },
          };

    try {
      const response = await fetch("/api/v1/ctc/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not decode this CTC.");
      setBreakdown(payload);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveLead(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !breakdown) return;
    setCapturing(true);
    setCaptureError("");

    try {
      const response = await fetch("/api/v1/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "ctc_decoded_demo",
          payload: {
            quotedCtc: breakdown.quotedCtc,
            netMonthly: breakdown.netMonthly,
            taxAnnual: breakdown.taxAnnual,
            company: manual.company || "unknown",
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Failed to save results.");
      }

      setCaptureSuccess(true);
      setTimeout(() => {
        router.push(`/auth/signup?email=${encodeURIComponent(email)}&redirect=/salary&demo=true`);
      }, 1500);
    } catch (err: any) {
      setCaptureError(err.message || "Could not register email.");
    } finally {
      setCapturing(false);
    }
  }

  async function copyShareText() {
    if (!shareText) return;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
            Guest Mode Calculator
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            Know the monthly take-home{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
              before you say yes.
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Decode Indian offer letters into fixed pay, variable pay, PF, tax, and actual monthly cash-in-hand.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
          <IndianRupee className="h-4 w-4 text-violet-500" />
          INR formatting uses Indian numbering.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="border-white/5 bg-zinc-950/40">
          <CardHeader>
            <CardTitle className="text-zinc-100">Offer component breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Tabs
              activeTab={mode}
              onChange={(id) => setMode(id as Mode)}
              tabs={[
                { id: "paste", label: "Paste offer letter" },
                { id: "manual", label: "Enter manually" },
              ]}
            />

            {mode === "paste" ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">Offer letter text</span>
                <textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  className="min-h-[220px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-3 text-sm leading-6 text-zinc-200 outline-none transition focus:border-violet-500"
                  placeholder="Paste your offer letter or appointment letter text here..."
                />
              </label>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <MoneyInput label="Company Name" value={manual.company} onChange={(company) => setManual({ ...manual, company })} text />
                <MoneyInput label="Quoted CTC per year (LPA)" value={manual.quotedCtc} onChange={(quotedCtc) => setManual({ ...manual, quotedCtc })} />
                <MoneyInput label="Fixed component per year" value={manual.fixedComponent} onChange={(fixedComponent) => setManual({ ...manual, fixedComponent })} />
                <MoneyInput label="Variable or bonus per year" value={manual.variableComponent} onChange={(variableComponent) => setManual({ ...manual, variableComponent })} />
                <MoneyInput label="Basic salary per year" value={manual.basicSalary} onChange={(basicSalary) => setManual({ ...manual, basicSalary })} />
                <MoneyInput label="HRA per year" value={manual.hra} onChange={(hra) => setManual({ ...manual, hra })} />
                <MoneyInput label="Special allowance per year" value={manual.specialAllowance} onChange={(specialAllowance) => setManual({ ...manual, specialAllowance })} />
                <MoneyInput label="PF employer contribution" value={manual.pfEmployer} onChange={(pfEmployer) => setManual({ ...manual, pfEmployer })} />
                <MoneyInput label="Gratuity per year" value={manual.gratuityAnnual} onChange={(gratuityAnnual) => setManual({ ...manual, gratuityAnnual })} />
                <MoneyInput label="ESOP or RSU per year" value={manual.esop} onChange={(esop) => setManual({ ...manual, esop })} />
              </div>
            )}

            <div className="grid gap-3 rounded-lg border border-white/5 bg-zinc-900/60 p-4 md:grid-cols-2">
              <RegimeOption active={taxRegime === "new"} title="New Regime" description="Default 2024-25 calculation with standard deduction." onClick={() => setTaxRegime("new")} />
              <RegimeOption active={taxRegime === "old"} title="Old Regime" description="Uses PF 80C and simplified HRA deduction." onClick={() => setTaxRegime("old")} />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button onClick={decode} disabled={!canSubmit} isLoading={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              {mode === "paste" ? <FileText className="mr-2 h-4 w-4" /> : <Calculator className="mr-2 h-4 w-4" />}
              {mode === "paste" ? "Decode my salary" : "Calculate take-home"}
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-6">
          <Card className="overflow-hidden border-white/5 bg-zinc-950/40">
            <div className="border-b border-white/5 bg-violet-500/10 p-5">
              <p className="text-sm font-medium text-zinc-400">Your actual monthly take-home</p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight text-white">
                {breakdown ? rupees(breakdown.netMonthly) : "INR 0"}
              </p>
              <p className="mt-2 text-xs text-zinc-500">After tax and employee PF deductions</p>
            </div>
            <CardContent className="space-y-3 pt-5">
              {breakdown ? (
                <>
                  <BreakdownRow label="Company's quoted CTC" value={`${rupees(breakdown.quotedCtc)}/year`} />
                  <BreakdownRow label="Fixed component" value={`${rupees(breakdown.fixedComponent)}/year`} strong />
                  <BreakdownRow label="Variable pay" value={`${rupees(breakdown.variableComponent)}/year`} note="Not guaranteed" tone="warning" />
                  <BreakdownRow label="PF deduction, your share" value={`-${rupees(breakdown.pfEmployee)}/year`} muted />
                  <BreakdownRow label={`Income tax, ${breakdown.taxRegime} regime`} value={`-${rupees(breakdown.taxAnnual)}/year`} tone="danger" />
                  <div className="my-2 border-t border-white/5" />
                  <BreakdownRow label="Net annual take-home" value={`${rupees(breakdown.netAnnual)}/year`} tone="success" strong />
                  <BreakdownRow label="Net monthly take-home" value={`${rupees(breakdown.netMonthly)}/month`} tone="success" large />
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-zinc-900/30 p-5 text-sm leading-6 text-zinc-500">
                  Enter the offer details or paste your letter to see your annual and monthly breakdown here.
                </div>
              )}
            </CardContent>
          </Card>

          {breakdown && (
            <>
              <Card className="border-violet-500/20 bg-gradient-to-br from-zinc-950 via-zinc-950 to-violet-950/20 shadow-2xl">
                <CardContent className="p-6">
                  {captureSuccess ? (
                    <div className="text-center space-y-3 py-2">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <h4 className="text-base font-semibold text-white">Results Saved!</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Taking you to your account setup...
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={saveLead} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-violet-400" />
                        <h4 className="text-sm font-semibold text-white">Save Results + Unlock Career Timeline</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Store these decoded calculations safely. Unlock a 2-year compensation roadmap.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="h-10 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 text-xs text-zinc-200 outline-none focus:border-violet-500 transition"
                        />
                        <Button type="submit" isLoading={capturing} className="bg-violet-600 hover:bg-violet-700 text-xs font-semibold px-4">
                          Lock In Plan
                        </Button>
                      </div>
                      {captureError && <p className="text-[11px] text-red-400">{captureError}</p>}
                    </form>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-zinc-400">
                <div className="mb-2 flex items-center gap-2 font-semibold text-zinc-200">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Variable pay and company costs
                </div>
                PF employer ({rupees(breakdown.pfEmployer)}/year) and gratuity ({rupees(breakdown.gratuityAnnual)}/year) are company costs.
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={copyShareText} className="flex-1 border-white/5 bg-zinc-950 text-zinc-300 hover:bg-zinc-900">
                  {copied ? <Clipboard className="mr-2 h-4 w-4 text-emerald-400" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copied" : "Share results"}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function MoneyInput({ label, value, onChange, text = false }: { label: string; value: string; onChange: (value: string) => void; text?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <input
        type={text ? "text" : "number"}
        min={text ? undefined : 0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
      />
    </label>
  );
}

function RegimeOption({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition duration-200",
        active ? "border-violet-500 bg-violet-500/10" : "border-white/5 bg-zinc-950 hover:bg-zinc-900"
      )}
    >
      <span className="text-sm font-semibold text-zinc-200">{title}</span>
      <span className="mt-1 block text-[10px] leading-4 text-zinc-500">{description}</span>
    </button>
  );
}

function BreakdownRow({ label, value, note, muted, strong, large, tone }: { label: string; value: string; note?: string; muted?: boolean; strong?: boolean; large?: boolean; tone?: "warning" | "danger" | "success" }) {
  return (
    <div className="flex items-start justify-between gap-4 px-2 py-2">
      <div>
        <p className={cn("text-xs", muted ? "text-zinc-500" : "text-zinc-300")}>{label}</p>
        {note && <p className="mt-1 text-[10px] italic text-amber-500">{note} - depends on company policies.</p>}
      </div>
      <p className={cn("shrink-0 text-right text-xs", strong && "font-semibold text-zinc-100", large && "text-base font-bold text-white", tone === "warning" && "text-amber-500", tone === "danger" && "text-red-500", tone === "success" && "text-emerald-500")}>
        {value}
      </p>
    </div>
  );
}
