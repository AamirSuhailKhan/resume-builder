"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Check,
  Copy,
  Plus,
  Scale,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OfferAnalysis, OfferInput, OfferPriorities, ProcessedOffer } from "@/types/offers";

const currencies: OfferInput["currency"][] = ["INR", "USD", "EUR", "GBP"];
const companyStages: OfferInput["companyStage"][] = ["seed", "series_a", "series_b", "growth", "public", "enterprise"];
const workModes: OfferInput["workMode"][] = ["remote", "hybrid", "onsite"];
const equityTypes: NonNullable<OfferInput["equity"]>["type"][] = ["none", "rsu", "options", "esop"];

const defaultPriorities: OfferPriorities = {
  compensation: 8,
  growth: 6,
  stability: 6,
  workLife: 5,
};

function blankOffer(index: number): OfferInput {
  return {
    id: `offer-${index}`,
    company: `Company ${index}`,
    role: "",
    base: 0,
    currency: "INR",
    equity: { type: "none", vestingYears: 4 },
    bonus: 0,
    benefits: {
      healthInsurance: true,
      pf: true,
      gratuity: true,
      remoteFriendly: true,
      stockRefresher: false,
      learningBudget: 0,
    },
    location: "Bangalore",
    workMode: "hybrid",
    companyStage: "growth",
    notes: "",
  };
}

function formatMoney(amount: number, currency: OfferInput["currency"]) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function stageLabel(stage: OfferInput["companyStage"]) {
  return stage.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function prettyLabel(value: string) {
  return value.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CompareOffersPage() {
  const [offers, setOffers] = useState<OfferInput[]>([blankOffer(1), blankOffer(2)]);
  const [priorities, setPriorities] = useState<OfferPriorities>(defaultPriorities);
  const [analysis, setAnalysis] = useState<OfferAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null);

  const winner = useMemo(
    () => analysis?.offers.find((offer) => offer.id === analysis.winner) ?? null,
    [analysis]
  );

  async function compare() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/offers/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers: sanitizeOffers(offers), priorities }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not compare these offers.");
      }

      setAnalysis(payload as OfferAnalysis);
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : "Could not compare these offers.");
    } finally {
      setLoading(false);
    }
  }

  function updateOffer(index: number, patch: Partial<OfferInput>) {
    setOffers((current) => current.map((offer, offerIndex) => offerIndex === index ? { ...offer, ...patch } : offer));
  }

  function updateEquity(index: number, patch: Partial<NonNullable<OfferInput["equity"]>>) {
    setOffers((current) => current.map((offer, offerIndex) => {
      if (offerIndex !== index) return offer;
      return { ...offer, equity: { type: "none", vestingYears: 4, ...offer.equity, ...patch } };
    }));
  }

  function updateBenefit(index: number, key: keyof OfferInput["benefits"], value: boolean | number) {
    setOffers((current) => current.map((offer, offerIndex) => (
      offerIndex === index ? { ...offer, benefits: { ...offer.benefits, [key]: value } } : offer
    )));
  }

  function addOffer() {
    setOffers((current) => [...current, { ...blankOffer(current.length + 1), id: crypto.randomUUID() }]);
  }

  function removeOffer(id: string) {
    setOffers((current) => current.length > 2 ? current.filter((offer) => offer.id !== id) : current);
  }

  async function copyOfferSummary(offer: ProcessedOffer) {
    await navigator.clipboard.writeText(`${offer.company} ${offer.role}: ${offer.overallScore}/100 overall, year-one comp ${formatMoney(offer.totalCompYear1, offer.currency)}, monthly take-home ${formatMoney(offer.takehomeMonthly, offer.currency)}.`);
    setCopiedOfferId(offer.id);
    window.setTimeout(() => setCopiedOfferId(null), 1500);
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1 text-sm font-medium text-accent">
            <Scale className="h-4 w-4" />
            Offer Comparison
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal text-foreground">
            Compare compensation, growth, stability, and lifestyle.
          </h1>
        </div>
        <Button onClick={compare} isLoading={loading} disabled={offers.some((offer) => !offer.company.trim() || !offer.role.trim() || offer.base <= 0)}>
          <Sparkles className="h-4 w-4" />
          Compare offers
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/25 bg-danger/10 p-4 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {offers.map((offer, index) => (
            <Card key={offer.id} variant="elevated">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-4 w-4 text-accent" />
                    {offer.company || `Offer ${index + 1}`}
                  </CardTitle>
                  <CardDescription>{offer.role || "Role title pending"}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeOffer(offer.id)} disabled={offers.length <= 2} title="Remove offer">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Company" value={offer.company} onChange={(company) => updateOffer(index, { company })} />
                  <Field label="Role" value={offer.role} onChange={(role) => updateOffer(index, { role })} />
                  <NumberField label="Base salary" value={offer.base} onChange={(base) => updateOffer(index, { base })} />
                  <Select label="Currency" value={offer.currency} options={currencies} onChange={(currency) => updateOffer(index, { currency: currency as OfferInput["currency"] })} />
                  <NumberField label="Target bonus %" value={offer.bonus ?? 0} onChange={(bonus) => updateOffer(index, { bonus })} />
                  <Field label="Location" value={offer.location} onChange={(location) => updateOffer(index, { location })} />
                  <Select label="Company stage" value={offer.companyStage} options={companyStages} format={stageLabel} onChange={(companyStage) => updateOffer(index, { companyStage: companyStage as OfferInput["companyStage"] })} />
                  <Select label="Work mode" value={offer.workMode} options={workModes} format={prettyLabel} onChange={(workMode) => updateOffer(index, { workMode: workMode as OfferInput["workMode"] })} />
                  <NumberField label="Learning budget" value={offer.benefits.learningBudget} onChange={(learningBudget) => updateBenefit(index, "learningBudget", learningBudget)} />
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-sm font-medium text-foreground">Equity</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <Select label="Type" value={offer.equity?.type ?? "none"} options={equityTypes} format={prettyLabel} onChange={(type) => updateEquity(index, { type: type as NonNullable<OfferInput["equity"]>["type"] })} />
                      <NumberField label="Shares" value={offer.equity?.shares ?? 0} onChange={(shares) => updateEquity(index, { shares })} />
                      <NumberField label="Strike price" value={offer.equity?.strikePrice ?? 0} onChange={(strikePrice) => updateEquity(index, { strikePrice })} />
                      <NumberField label="Current FMV" value={offer.equity?.currentFMV ?? 0} onChange={(currentFMV) => updateEquity(index, { currentFMV })} />
                      <NumberField label="Vesting years" value={offer.equity?.vestingYears ?? 4} onChange={(vestingYears) => updateEquity(index, { vestingYears })} />
                      <NumberField label="Cliff months" value={offer.equity?.cliffMonths ?? 12} onChange={(cliffMonths) => updateEquity(index, { cliffMonths })} />
                      <NumberField label="Valuation" value={offer.equity?.companyValuation ?? 0} onChange={(companyValuation) => updateEquity(index, { companyValuation })} />
                      <NumberField label="Last round price" value={offer.equity?.lastRoundPricePerShare ?? 0} onChange={(lastRoundPricePerShare) => updateEquity(index, { lastRoundPricePerShare })} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-sm font-medium text-foreground">Benefits</p>
                    <div className="mt-3 grid gap-2">
                      <Checkbox label="Health insurance" checked={offer.benefits.healthInsurance} onChange={(checked) => updateBenefit(index, "healthInsurance", checked)} />
                      <Checkbox label="PF" checked={offer.benefits.pf} onChange={(checked) => updateBenefit(index, "pf", checked)} />
                      <Checkbox label="Gratuity" checked={offer.benefits.gratuity} onChange={(checked) => updateBenefit(index, "gratuity", checked)} />
                      <Checkbox label="Remote friendly" checked={offer.benefits.remoteFriendly} onChange={(checked) => updateBenefit(index, "remoteFriendly", checked)} />
                      <Checkbox label="Stock refresher" checked={offer.benefits.stockRefresher} onChange={(checked) => updateBenefit(index, "stockRefresher", checked)} />
                    </div>
                  </div>
                </div>

                <Textarea
                  value={offer.notes ?? ""}
                  onChange={(event) => updateOffer(index, { notes: event.target.value })}
                  placeholder="Notes, constraints, commute, manager signals, visa details..."
                />
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addOffer} disabled={offers.length >= 6}>
            <Plus className="h-4 w-4" />
            Add offer
          </Button>
        </div>

        <aside className="space-y-4">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Decision priorities</CardTitle>
              <CardDescription>Weights are 0 to 10.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Priority label="Compensation" value={priorities.compensation} onChange={(compensation) => setPriorities((current) => ({ ...current, compensation }))} />
              <Priority label="Growth" value={priorities.growth} onChange={(growth) => setPriorities((current) => ({ ...current, growth }))} />
              <Priority label="Stability" value={priorities.stability} onChange={(stability) => setPriorities((current) => ({ ...current, stability }))} />
              <Priority label="Work-life" value={priorities.workLife} onChange={(workLife) => setPriorities((current) => ({ ...current, workLife }))} />
            </CardContent>
          </Card>

          {winner && (
            <Card variant="elevated">
              <CardHeader>
                <Badge variant="success" className="w-fit">Current winner</Badge>
                <CardTitle>{winner.company}</CardTitle>
                <CardDescription>{analysis?.winnerReasoning}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <ScoreRow label="Overall" value={winner.overallScore} />
                <ScoreRow label="Growth" value={winner.growthScore} />
                <ScoreRow label="Stability" value={winner.stabilityScore} />
                <p className="rounded-lg border border-border bg-surface p-3 text-muted-foreground">{analysis?.negotiationLeverage}</p>
              </CardContent>
            </Card>
          )}
        </aside>
      </section>

      {analysis && (
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {analysis.offers.map((offer) => (
              <Card key={offer.id} variant="elevated" className={offer.id === analysis.winner ? "ring-2 ring-success/40" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{offer.company}</CardTitle>
                      <CardDescription>{offer.role}</CardDescription>
                    </div>
                    {offer.id === analysis.winner && <Badge variant="success">Winner</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Overall" value={`${offer.overallScore}/100`} />
                    <Metric label="Year one" value={formatMoney(offer.totalCompYear1, offer.currency)} />
                    <Metric label="Four years" value={formatMoney(offer.totalCompYear4, offer.currency)} />
                    <Metric label="Monthly take-home" value={formatMoney(offer.takehomeMonthly, offer.currency)} />
                    <Metric label="Location adjusted" value={formatMoney(offer.locationAdjustedValue, offer.currency)} />
                    <Metric label="Equity upside" value={formatMoney(offer.equityValueOptimistic, offer.currency)} />
                  </div>
                  <div className="space-y-2">
                    <ScoreRow label="Growth" value={offer.growthScore} />
                    <ScoreRow label="Stability" value={offer.stabilityScore} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyOfferSummary(offer)}>
                    {copiedOfferId === offer.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedOfferId === offer.id ? "Copied" : "Copy summary"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Tradeoffs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.tradeoffs.map((tradeoff) => (
                  <p key={tradeoff} className="rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">{tradeoff}</p>
                ))}
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Red flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analysis.redFlags?.length ? analysis.redFlags : ["No major red flags were detected from the structured offer inputs."]).map((flag) => (
                  <p key={flag} className="rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">{flag}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </main>
  );
}

function sanitizeOffers(offers: OfferInput[]): OfferInput[] {
  return offers.map((offer) => ({
    ...offer,
    company: offer.company.trim(),
    role: offer.role.trim(),
    location: offer.location.trim(),
    notes: offer.notes?.trim(),
    equity: offer.equity?.type === "none" ? { type: "none", vestingYears: offer.equity.vestingYears } : offer.equity,
  }));
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input type="number" min={0} value={Number.isFinite(value) && value > 0 ? value : ""} onChange={(event) => onChange(Number(event.target.value) || 0)} />
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  format = (option: T) => option,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  format?: (option: T) => string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-premium">
        {options.map((option) => <option key={option} value={option}>{format(option)}</option>)}
      </select>
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:bg-surface-muted">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-border bg-surface" />
      <span>{label}</span>
    </label>
  );
}

function Priority({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2">
      <span className="flex items-center justify-between text-sm font-medium text-foreground">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </span>
      <input type="range" min={0} max={10} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[var(--accent)]" />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-20 rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
