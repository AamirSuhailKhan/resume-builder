"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, Clipboard, Copy, FileText, IndianRupee } from "lucide-react";
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

export default function CtcDecoderPage() {
  const [mode, setMode] = useState<Mode>("paste");
  const [taxRegime, setTaxRegime] = useState<TaxRegime>("new");
  const [rawText, setRawText] = useState("");
  const [manual, setManual] = useState<ManualForm>(emptyManual);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const canSubmit = mode === "paste" ? rawText.trim().length > 20 : Boolean(manual.fixedComponent || manual.quotedCtc);

  const shareText = useMemo(() => {
    if (!breakdown) return "";
    return [
      "Decoded my offer using Career OS:",
      `Quoted CTC: INR ${lakhs(breakdown.quotedCtc)}`,
      `Actual take-home: ${rupees(breakdown.netMonthly)}/month`,
      "Decode yours: careeros.in/ctc-decoder",
    ].join("\n");
  }, [breakdown]);

  async function decode() {
    setLoading(true);
    setError("");
    setCopied(false);

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

    const response = await fetch("/api/v1/ctc/decode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Could not decode this CTC. Check the numbers and try again.");
      setLoading(false);
      return;
    }

    setBreakdown(payload);
    setLoading(false);
  }

  async function copyShareText() {
    if (!shareText) return;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-accent">CTC Decoder</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">Know the monthly take-home before you say yes.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Decode Indian offer letters into fixed pay, variable pay, PF, tax, and actual monthly income.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
          <IndianRupee className="h-4 w-4 text-accent" />
          INR formatting uses Indian numbering.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Offer input</CardTitle>
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
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Offer letter text</span>
                <textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  className="min-h-[220px] w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm leading-6 outline-none transition focus:border-accent"
                  placeholder="Paste your offer letter or appointment letter text here"
                />
              </label>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <MoneyInput label="Company" value={manual.company} onChange={(company) => setManual({ ...manual, company })} text />
                <MoneyInput label="Quoted CTC per year" value={manual.quotedCtc} onChange={(quotedCtc) => setManual({ ...manual, quotedCtc })} />
                <MoneyInput label="Fixed component per year" value={manual.fixedComponent} onChange={(fixedComponent) => setManual({ ...manual, fixedComponent })} />
                <MoneyInput label="Variable or bonus per year" value={manual.variableComponent} onChange={(variableComponent) => setManual({ ...manual, variableComponent })} />
                <MoneyInput label="Variable percentage" value={manual.variablePct} onChange={(variablePct) => setManual({ ...manual, variablePct })} />
                <MoneyInput label="Basic salary per year" value={manual.basicSalary} onChange={(basicSalary) => setManual({ ...manual, basicSalary })} />
                <MoneyInput label="HRA per year" value={manual.hra} onChange={(hra) => setManual({ ...manual, hra })} />
                <MoneyInput label="Special allowance per year" value={manual.specialAllowance} onChange={(specialAllowance) => setManual({ ...manual, specialAllowance })} />
                <MoneyInput label="PF employer contribution" value={manual.pfEmployer} onChange={(pfEmployer) => setManual({ ...manual, pfEmployer })} />
                <MoneyInput label="Gratuity per year" value={manual.gratuityAnnual} onChange={(gratuityAnnual) => setManual({ ...manual, gratuityAnnual })} />
                <MoneyInput label="ESOP or RSU per year" value={manual.esop} onChange={(esop) => setManual({ ...manual, esop })} />
              </div>
            )}

            <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-2">
              <RegimeOption
                active={taxRegime === "new"}
                title="New regime"
                description="Default 2024-25 calculation with standard deduction."
                onClick={() => setTaxRegime("new")}
              />
              <RegimeOption
                active={taxRegime === "old"}
                title="Old regime"
                description="Uses PF 80C and simplified HRA deduction."
                onClick={() => setTaxRegime("old")}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <Button onClick={decode} disabled={!canSubmit} isLoading={loading} className="w-full">
              {mode === "paste" ? <FileText className="h-4 w-4" /> : <Calculator className="h-4 w-4" />}
              {mode === "paste" ? "Decode my salary" : "Calculate take-home"}
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-6">
          <Card variant="elevated" className="overflow-hidden">
            <div className="border-b border-border bg-accent/10 p-5">
              <p className="text-sm font-medium text-muted-foreground">Your actual monthly take-home</p>
              <p className="mt-3 text-4xl font-semibold tracking-normal text-foreground">
                {breakdown ? rupees(breakdown.netMonthly) : "INR 0"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">After tax and employee PF deductions</p>
            </div>
            <CardContent className="space-y-3 pt-5">
              {breakdown ? (
                <>
                  <BreakdownRow label="Company's quoted CTC" value={`${rupees(breakdown.quotedCtc)}/year`} />
                  <BreakdownRow label="Fixed component" value={`${rupees(breakdown.fixedComponent)}/year`} strong />
                  <BreakdownRow
                    label="Variable pay"
                    value={`${rupees(breakdown.variableComponent)}/year`}
                    note="Not guaranteed"
                    tone="warning"
                  />
                  <BreakdownRow label="PF deduction, your share" value={`-${rupees(breakdown.pfEmployee)}/year`} muted />
                  <BreakdownRow label={`Income tax, ${breakdown.taxRegime} regime`} value={`-${rupees(breakdown.taxAnnual)}/year`} tone="danger" />
                  <div className="my-2 border-t border-border" />
                  <BreakdownRow label="Net annual take-home" value={`${rupees(breakdown.netAnnual)}/year`} tone="success" strong />
                  <BreakdownRow label="Net monthly take-home" value={`${rupees(breakdown.netMonthly)}/month`} tone="success" large />
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-surface p-5 text-sm leading-6 text-muted-foreground">
                  Enter the offer details to see your annual and monthly breakdown here.
                </div>
              )}
            </CardContent>
          </Card>

          {breakdown && (
            <>
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Variable pay and company costs
                </div>
                PF employer ({rupees(breakdown.pfEmployer)}/year) and gratuity ({rupees(breakdown.gratuityAnnual)}/year) are company costs,
                not monthly income. Gratuity is generally payable only after 5 years of continuous service. Variable pay depends on performance
                and company policy.
              </div>

              <div className="rounded-lg border border-border bg-surface p-4 text-xs leading-5 text-muted-foreground">
                Approximate calculation. Consult a CA for tax planning. Actual tax may vary based on investments and exemptions.
              </div>

              <Button variant="outline" onClick={copyShareText} className="w-full">
                {copied ? <Clipboard className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Result copied" : "Share result"}
              </Button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  text = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  text?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={text ? "text" : "number"}
        min={text ? undefined : 0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent"
      />
    </label>
  );
}

function RegimeOption({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition",
        active ? "border-accent bg-accent/10" : "border-border bg-surface-muted hover:bg-surface-elevated"
      )}
    >
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
    </button>
  );
}

function BreakdownRow({
  label,
  value,
  note,
  muted,
  strong,
  large,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  muted?: boolean;
  strong?: boolean;
  large?: boolean;
  tone?: "warning" | "danger" | "success";
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg px-2 py-2">
      <div>
        <p className={cn("text-sm", muted ? "text-muted-foreground" : "text-foreground")}>{label}</p>
        {note && <p className="mt-1 text-xs italic text-warning">{note} - depends on performance and company policy.</p>}
      </div>
      <p
        className={cn(
          "shrink-0 text-right text-sm",
          strong && "font-semibold",
          large && "text-lg font-semibold",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success"
        )}
      >
        {value}
      </p>
    </div>
  );
}
