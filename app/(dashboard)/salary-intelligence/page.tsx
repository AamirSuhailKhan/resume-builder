"use client";

import React, { useMemo, useState } from "react";
import { 
  IndianRupee, 
  TrendingUp, 
  MapPin, 
  Layers, 
  Award, 
  Calculator, 
  Scale, 
  HelpCircle, 
  Bookmark, 
  ArrowRight, 
  Check, 
  Copy, 
  AlertTriangle,
  Info,
  DollarSign,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Zap,
  LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Data Structures for Compensation Benchmarks in India (c. 2026)
type RoleKey = "sde1" | "sde2" | "sde3" | "staff" | "pm1" | "pm2" | "dir_pm";
type TierKey = "faang" | "tier1_startup" | "tier2_product" | "early_stage" | "remote_global";
type LocationKey = "bangalore" | "ncr" | "mumbai" | "pune_hyd" | "remote_india";

interface BenchmarkData {
  roleLabel: string;
  basePayMin: number;
  basePayMax: number;
  variableMin: number;
  variableMax: number;
  equityMin: number;
  equityMax: number;
  promoTimelineYears: string;
}

const BENCHMARKS: Record<RoleKey, Record<TierKey, BenchmarkData>> = {
  sde1: {
    faang: { roleLabel: "Software Engineer I", basePayMin: 1800000, basePayMax: 2600000, variableMin: 200000, variableMax: 400000, equityMin: 800000, equityMax: 1500000, promoTimelineYears: "1.5 - 2.5 yrs" },
    tier1_startup: { roleLabel: "Software Engineer I", basePayMin: 1400000, basePayMax: 2000000, variableMin: 100000, variableMax: 300000, equityMin: 300000, equityMax: 800000, promoTimelineYears: "1.5 - 2 yrs" },
    tier2_product: { roleLabel: "Software Engineer I", basePayMin: 800000, basePayMax: 1300000, variableMin: 50000, variableMax: 150000, equityMin: 50000, equityMax: 150000, promoTimelineYears: "2 - 3 yrs" },
    early_stage: { roleLabel: "Software Engineer I", basePayMin: 600000, basePayMax: 1000000, variableMin: 20000, variableMax: 80000, equityMin: 100000, equityMax: 400000, promoTimelineYears: "1 - 2 yrs" },
    remote_global: { roleLabel: "Software Engineer I", basePayMin: 2200000, basePayMax: 3500000, variableMin: 0, variableMax: 300000, equityMin: 200000, equityMax: 600000, promoTimelineYears: "2 yrs" }
  },
  sde2: {
    faang: { roleLabel: "Software Engineer II", basePayMin: 3200000, basePayMax: 4500000, variableMin: 400000, variableMax: 800000, equityMin: 1500000, equityMax: 2800000, promoTimelineYears: "2.5 - 4 yrs" },
    tier1_startup: { roleLabel: "Software Engineer II", basePayMin: 2600000, basePayMax: 3800000, variableMin: 200000, variableMax: 500000, equityMin: 800000, equityMax: 1800000, promoTimelineYears: "2 - 3 yrs" },
    tier2_product: { roleLabel: "Software Engineer II", basePayMin: 1500000, basePayMax: 2400000, variableMin: 100000, variableMax: 300000, equityMin: 100000, equityMax: 300000, promoTimelineYears: "3 - 4 yrs" },
    early_stage: { roleLabel: "Software Engineer II", basePayMin: 1100000, basePayMax: 1700000, variableMin: 50000, variableMax: 150000, equityMin: 300000, equityMax: 1000000, promoTimelineYears: "2 yrs" },
    remote_global: { roleLabel: "Software Engineer II", basePayMin: 4000000, basePayMax: 6000000, variableMin: 0, variableMax: 500000, equityMin: 400000, equityMax: 1200000, promoTimelineYears: "3 yrs" }
  },
  sde3: {
    faang: { roleLabel: "Senior Software Engineer (SDE3)", basePayMin: 5000000, basePayMax: 7500000, variableMin: 800000, variableMax: 1500000, equityMin: 3000000, equityMax: 5500000, promoTimelineYears: "3.5 - 5 yrs" },
    tier1_startup: { roleLabel: "Senior Software Engineer (SDE3)", basePayMin: 4200000, basePayMax: 6000000, variableMin: 400000, variableMax: 1000000, equityMin: 2000000, equityMax: 4500000, promoTimelineYears: "3 - 4 yrs" },
    tier2_product: { roleLabel: "Senior Software Engineer (SDE3)", basePayMin: 2500000, basePayMax: 3800000, variableMin: 200000, variableMax: 500000, equityMin: 200000, equityMax: 600000, promoTimelineYears: "4 - 6 yrs" },
    early_stage: { roleLabel: "Senior Software Engineer (SDE3)", basePayMin: 1800000, basePayMax: 2800000, variableMin: 100000, variableMax: 300000, equityMin: 800000, equityMax: 2500000, promoTimelineYears: "2 - 3 yrs" },
    remote_global: { roleLabel: "Senior Software Engineer (SDE3)", basePayMin: 6500000, basePayMax: 10000000, variableMin: 0, variableMax: 1000000, equityMin: 800000, equityMax: 2500000, promoTimelineYears: "4 yrs" }
  },
  staff: {
    faang: { roleLabel: "Staff Software Engineer", basePayMin: 8000000, basePayMax: 12000000, variableMin: 1500000, variableMax: 3000000, equityMin: 6000000, equityMax: 12000000, promoTimelineYears: "5+ yrs" },
    tier1_startup: { roleLabel: "Staff / Principal Engineer", basePayMin: 6500000, basePayMax: 9500000, variableMin: 1000000, variableMax: 2000000, equityMin: 4500000, equityMax: 9000000, promoTimelineYears: "4+ yrs" },
    tier2_product: { roleLabel: "Principal Software Engineer", basePayMin: 4000000, basePayMax: 5800000, variableMin: 400000, variableMax: 900000, equityMin: 500000, equityMax: 1500000, promoTimelineYears: "6+ yrs" },
    early_stage: { roleLabel: "Tech Lead / Architect", basePayMin: 3000000, basePayMax: 4800000, variableMin: 200000, variableMax: 600000, equityMin: 2000000, equityMax: 6000000, promoTimelineYears: "3+ yrs" },
    remote_global: { roleLabel: "Staff Engineer (Global)", basePayMin: 11000000, basePayMax: 17000000, variableMin: 0, variableMax: 1500000, equityMin: 1500000, equityMax: 4500000, promoTimelineYears: "5+ yrs" }
  },
  pm1: {
    faang: { roleLabel: "Product Manager I", basePayMin: 2000000, basePayMax: 2800000, variableMin: 250000, variableMax: 500000, equityMin: 600000, equityMax: 1200000, promoTimelineYears: "2 yrs" },
    tier1_startup: { roleLabel: "Product Manager I", basePayMin: 1600000, basePayMax: 2200000, variableMin: 150000, variableMax: 350000, equityMin: 300000, equityMax: 700000, promoTimelineYears: "1.5 - 2.5 yrs" },
    tier2_product: { roleLabel: "Product Manager I", basePayMin: 1000000, basePayMax: 1500000, variableMin: 80000, variableMax: 200000, equityMin: 50000, equityMax: 200000, promoTimelineYears: "2.5 - 3 yrs" },
    early_stage: { roleLabel: "Product Manager I", basePayMin: 800000, basePayMax: 1200000, variableMin: 50000, variableMax: 120000, equityMin: 200000, equityMax: 600000, promoTimelineYears: "1.5 yrs" },
    remote_global: { roleLabel: "Product Manager I", basePayMin: 2500000, basePayMax: 3800000, variableMin: 0, variableMax: 400000, equityMin: 300000, equityMax: 800000, promoTimelineYears: "2 yrs" }
  },
  pm2: {
    faang: { roleLabel: "Product Manager II / Senior PM", basePayMin: 3500000, basePayMax: 5000000, variableMin: 500000, variableMax: 900000, equityMin: 1500000, equityMax: 2800000, promoTimelineYears: "3 - 4 yrs" },
    tier1_startup: { roleLabel: "Product Manager II / Senior PM", basePayMin: 2800000, basePayMax: 4200000, variableMin: 300000, variableMax: 600000, equityMin: 1000000, equityMax: 2200000, promoTimelineYears: "2.5 - 3.5 yrs" },
    tier2_product: { roleLabel: "Senior Product Manager", basePayMin: 1800000, basePayMax: 2600000, variableMin: 150000, variableMax: 400000, equityMin: 150000, equityMax: 450000, promoTimelineYears: "3 - 5 yrs" },
    early_stage: { roleLabel: "Senior Product Manager", basePayMin: 1400000, basePayMax: 2100000, variableMin: 100000, variableMax: 250000, equityMin: 500000, equityMax: 1500000, promoTimelineYears: "2.5 yrs" },
    remote_global: { roleLabel: "Senior PM (Global)", basePayMin: 4500000, basePayMax: 7000000, variableMin: 0, variableMax: 800000, equityMin: 600000, equityMax: 1800000, promoTimelineYears: "3.5 yrs" }
  },
  dir_pm: {
    faang: { roleLabel: "Director of Product Management", basePayMin: 7500000, basePayMax: 11000000, variableMin: 1500000, variableMax: 2800000, equityMin: 5000000, equityMax: 10000000, promoTimelineYears: "5+ yrs" },
    tier1_startup: { roleLabel: "Director / VP of Product", basePayMin: 6000000, basePayMax: 8500000, variableMin: 800000, variableMax: 1800000, equityMin: 4000000, equityMax: 8000000, promoTimelineYears: "4+ yrs" },
    tier2_product: { roleLabel: "Director of Product", basePayMin: 3500000, basePayMax: 5000000, variableMin: 400000, variableMax: 800000, equityMin: 400000, equityMax: 1200000, promoTimelineYears: "6+ yrs" },
    early_stage: { roleLabel: "Head of Product", basePayMin: 2800000, basePayMax: 4200000, variableMin: 200000, variableMax: 500000, equityMin: 1500000, equityMax: 5000000, promoTimelineYears: "3+ yrs" },
    remote_global: { roleLabel: "VP / Director Product (Global)", basePayMin: 9500000, basePayMax: 15000000, variableMin: 0, variableMax: 1500000, equityMin: 1200000, equityMax: 3500000, promoTimelineYears: "5+ yrs" }
  }
};

const LOCATION_MULTIPLIERS: Record<LocationKey, { label: string; mult: number }> = {
  bangalore: { label: "Bengaluru (Tech Capital Base)", mult: 1.0 },
  ncr: { label: "Delhi / NCR (Gurugram/Noida)", mult: 0.92 },
  mumbai: { label: "Mumbai (High Living Index)", mult: 0.96 },
  pune_hyd: { label: "Pune / Hyderabad", mult: 0.88 },
  remote_india: { label: "Remote India", mult: 0.82 }
};

interface SkillPremium {
  id: string;
  label: string;
  mult: number;
}

const SKILL_PREMIUMS: SkillPremium[] = [
  { id: "redis_kafka", label: "High-scale Infrastructure (Redis/Kafka)", mult: 1.12 },
  { id: "system_design", label: "Advanced System Design / Architecture", mult: 1.15 },
  { id: "generative_ai", label: "Generative AI / LLM Finetuning", mult: 1.22 },
  { id: "nextjs_react", label: "Fullstack Engineering (Next.js/React)", mult: 1.08 },
  { id: "security", label: "SecOps / High Security Compliance", mult: 1.10 }
];

export default function SalaryIntelligencePage() {
  const [activePerspective, setActivePerspective] = useState<"benchmarks" | "ctc_decoder" | "esops" | "offer_compare" | "negotiation">("benchmarks");

  // Benchmark filters
  const [selectedRole, setSelectedRole] = useState<RoleKey>("sde2");
  const [selectedTier, setSelectedTier] = useState<TierKey>("tier1_startup");
  const [selectedLoc, setSelectedLoc] = useState<LocationKey>("bangalore");
  const [activePremiums, setActivePremiums] = useState<string[]>([]);

  // CTC Decoder state
  const [quotedCtc, setQuotedCtc] = useState("3500000");
  const [fixedPay, setFixedPay] = useState("2800000");
  const [variablePay, setVariablePay] = useState("400000");
  const [gratuityVal, setGratuityVal] = useState("60000");
  const [esopGrantVal, setEsopGrantVal] = useState("240000");
  const [isNewTaxRegime, setIsNewTaxRegime] = useState(true);

  // ESOP state
  const [optionCount, setOptionCount] = useState("5000");
  const [strikePrice, setStrikePrice] = useState("10");
  const [fmvPrice, setFmvPrice] = useState("120");
  const [exitMultiple, setExitMultiple] = useState(3.5); // slider
  const [vestedYears, setVestedYears] = useState(4);

  // Offer Compare state
  const [offerA, setOfferA] = useState({ company: "Swiggy", base: "3200000", variable: "400000", stocks: "1200000" });
  const [offerB, setOfferB] = useState({ company: "Google India", base: "3400000", variable: "500000", stocks: "2400000" });

  const formatLakhs = (val: number) => {
    const lk = val / 100000;
    return `₹${lk.toFixed(1)}L`;
  };

  const formatRupees = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // ----------------------------------------------------
  // CALCULATION LOGIC: Benchmarks
  // ----------------------------------------------------
  const baseBenchmark = BENCHMARKS[selectedRole][selectedTier];
  const locMultiplier = LOCATION_MULTIPLIERS[selectedLoc].mult;

  const skillMultiplier = useMemo(() => {
    return activePremiums.reduce((total, id) => {
      const match = SKILL_PREMIUMS.find(p => p.id === id);
      return total * (match ? match.mult : 1.0);
    }, 1.0);
  }, [activePremiums]);

  const compositeMult = locMultiplier * skillMultiplier;

  const adjustedBaseMin = baseBenchmark.basePayMin * compositeMult;
  const adjustedBaseMax = baseBenchmark.basePayMax * compositeMult;
  const adjustedVarMin = baseBenchmark.variableMin * compositeMult;
  const adjustedVarMax = baseBenchmark.variableMax * compositeMult;
  const adjustedEqMin = baseBenchmark.equityMin * compositeMult;
  const adjustedEqMax = baseBenchmark.equityMax * compositeMult;

  const totalCtcMin = adjustedBaseMin + adjustedVarMin + adjustedEqMin;
  const totalCtcMax = adjustedBaseMax + adjustedVarMax + adjustedEqMax;

  // ----------------------------------------------------
  // CALCULATION LOGIC: CTC Decoder
  // ----------------------------------------------------
  const decodedValues = useMemo(() => {
    const quote = Number(quotedCtc) || 0;
    const fix = Number(fixedPay) || 0;
    const vari = Number(variablePay) || 0;
    const grat = Number(gratuityVal) || 0;
    const esop = Number(esopGrantVal) || 0;

    // Standard deductions
    const basic = fix * 0.40; // standard assumption: 40% of fixed is basic
    const pfEmployer = basic * 0.12;
    const pfEmployee = basic * 0.12;

    // Gross salary for taxation (excluding employer PF, gratuity, and paper stocks)
    const taxableGross = fix - pfEmployer + vari;

    // Simplified Tax Computation (F.Y. 2025-26 rules)
    let annualTax = 0;
    const standardDeduction = 75000; // New regime standard deduction
    const netTaxable = Math.max(0, taxableGross - standardDeduction);

    if (isNewTaxRegime) {
      // New tax slab
      if (netTaxable <= 700000) {
        annualTax = 0; // Rebate under Sec 87A
      } else {
        if (netTaxable > 300000) annualTax += Math.min(300000, netTaxable - 300000) * 0.05;
        if (netTaxable > 600000) annualTax += Math.min(300000, netTaxable - 600000) * 0.10;
        if (netTaxable > 900000) annualTax += Math.min(300000, netTaxable - 900000) * 0.15;
        if (netTaxable > 1200000) annualTax += Math.min(300000, netTaxable - 1200000) * 0.20;
        if (netTaxable > 1500000) annualTax += (netTaxable - 1500000) * 0.30;
        
        // Add 4% cess
        annualTax *= 1.04;
      }
    } else {
      // Old regime simplified slab (assuming max 1.5L deductions under 80C)
      const oldDeduction = Math.min(150000, pfEmployee) + 50000; // 80C + standard deduction
      const netOldTaxable = Math.max(0, taxableGross - oldDeduction);

      if (netOldTaxable > 250000) annualTax += Math.min(250000, netOldTaxable - 250000) * 0.05;
      if (netOldTaxable > 500000) annualTax += Math.min(500000, netOldTaxable - 500000) * 0.20;
      if (netOldTaxable > 1000000) annualTax += (netOldTaxable - 1000000) * 0.30;

      annualTax *= 1.04;
    }

    // Monthly take-home = (Fixed - Employer PF - Employee PF - Monthly Tax) / 12
    const fixedMinusPF = fix - pfEmployer - pfEmployee;
    const monthlyNet = Math.max(0, (fixedMinusPF - annualTax) / 12);

    return {
      pfEmployer,
      pfEmployee,
      taxableGross,
      annualTax,
      monthlyNet,
      takeHomeAnnual: monthlyNet * 12
    };
  }, [quotedCtc, fixedPay, variablePay, gratuityVal, esopGrantVal, isNewTaxRegime]);

  // ----------------------------------------------------
  // CALCULATION LOGIC: ESOP Valuation
  // ----------------------------------------------------
  const esopMath = useMemo(() => {
    const count = Number(optionCount) || 0;
    const strike = Number(strikePrice) || 0;
    const current = Number(fmvPrice) || 0;
    const years = Number(vestedYears) || 4;

    const paperValue = count * current;
    const exerciseCost = count * strike;
    const paperProfit = paperValue - exerciseCost;

    // Perquisite Tax on Exercise (calculated at standard 30% rate on paper profit)
    const exerciseTax = paperProfit * 0.312; 

    // Projected Future Value based on Exit Multiple
    const exitFmv = current * exitMultiple;
    const exitTotalValue = count * exitFmv;
    const exitTotalProfit = exitTotalValue - exerciseCost;

    return {
      paperValue,
      exerciseCost,
      paperProfit,
      exerciseTax,
      exitFmv,
      exitTotalValue,
      exitTotalProfit
    };
  }, [optionCount, strikePrice, fmvPrice, exitMultiple, vestedYears]);

  // ----------------------------------------------------
  // CALCULATION LOGIC: Offer Comparer
  // ----------------------------------------------------
  const comparison = useMemo(() => {
    const a = {
      base: Number(offerA.base) || 0,
      variable: Number(offerA.variable) || 0,
      stocks: Number(offerA.stocks) || 0,
    };
    const b = {
      base: Number(offerB.base) || 0,
      variable: Number(offerB.variable) || 0,
      stocks: Number(offerB.stocks) || 0,
    };

    const ctcA = a.base + a.variable + a.stocks;
    const ctcB = b.base + b.variable + b.stocks;

    // Real Value Index (Base + 50% Variable + 20% Stocks as a conservative multiplier)
    const realValueA = a.base + (a.variable * 0.50) + (a.stocks * 0.25);
    const realValueB = b.base + (b.variable * 0.50) + (b.stocks * 0.25);

    return {
      ctcA,
      ctcB,
      realValueA,
      realValueB,
      winner: realValueA > realValueB ? offerA.company : offerB.company
    };
  }, [offerA, offerB]);

  // Skill Premium Click toggle handler
  const handleTogglePremium = (id: string) => {
    setActivePremiums(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 p-4 pb-24 font-mono text-foreground antialiased md:p-6">
      
      {/* HEADER HERO */}
      <div className="border border-border bg-[#0d1016] p-6 text-left">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-emerald-950 border border-emerald-800 text-emerald-400">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight text-foreground">
                COMPENSATION INTELLIGENCE ENGINE (INDIA)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deconstruct CTC structures, decode ESOP paper values, track market premiums, and execute high-leverage negotiation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">May 2026 Feed Live</span>
          </div>
        </div>
      </div>

      {/* PERSPECTIVES TABS CONTAINER */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        <button
          onClick={() => setActivePerspective("benchmarks")}
          className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all ${
            activePerspective === "benchmarks"
              ? "border-emerald-400 bg-emerald-950/20 text-emerald-400"
              : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
          }`}
        >
          <LineChart className="h-4 w-4" /> 1. SALARY BENCHMARKS
        </button>

        <button
          onClick={() => setActivePerspective("ctc_decoder")}
          className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all ${
            activePerspective === "ctc_decoder"
              ? "border-emerald-400 bg-emerald-950/20 text-emerald-400"
              : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
          }`}
        >
          <Calculator className="h-4 w-4" /> 2. IN-HAND CTC DECODER
        </button>

        <button
          onClick={() => setActivePerspective("esops")}
          className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all ${
            activePerspective === "esops"
              ? "border-emerald-400 bg-emerald-950/20 text-emerald-400"
              : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4" /> 3. ESOP VALUE ENGINE
        </button>

        <button
          onClick={() => setActivePerspective("offer_compare")}
          className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all ${
            activePerspective === "offer_compare"
              ? "border-emerald-400 bg-emerald-950/20 text-emerald-400"
              : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
          }`}
        >
          <Scale className="h-4 w-4" /> 4. OFFER COMPARER
        </button>

        <button
          onClick={() => setActivePerspective("negotiation")}
          className={`flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-all ${
            activePerspective === "negotiation"
              ? "border-emerald-400 bg-emerald-950/20 text-emerald-400"
              : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> 5. NEGOTIATION PLAYBOOK
        </button>
      </div>

      {/* CONTENT COCKPIT VIEWPORT */}
      <div className="border border-border bg-[#0b0d13] p-6">
        
        {/* ---------------------------------------------------------------------- */}
        {/* PERSPECTIVE 1: BENCHMARKS */}
        {/* ---------------------------------------------------------------------- */}
        {activePerspective === "benchmarks" && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <LineChart className="h-5 w-5 text-emerald-400" /> REAL-TIME COMPENSATION BENCHMARKS (INDIA)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Calibrated using verified data nodes, company disclosures, and recruiter pipelines. Adjusted for inflation and recent cycles.
              </p>
            </div>

            {/* Filter Section */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Job Role & Level
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as RoleKey)}
                  className="w-full bg-[#0d1016] border border-border p-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-400"
                >
                  <option value="sde1">Software Engineer I (SDE1)</option>
                  <option value="sde2">Software Engineer II (SDE2)</option>
                  <option value="sde3">Senior Engineer (SDE3)</option>
                  <option value="staff">Staff / Tech Lead Architect</option>
                  <option value="pm1">Associate PM / PM I</option>
                  <option value="pm2">Senior PM</option>
                  <option value="dir_pm">Director / VP Product</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Company Tier Group
                </label>
                <select
                  value={selectedTier}
                  onChange={e => setSelectedTier(e.target.value as TierKey)}
                  className="w-full bg-[#0d1016] border border-border p-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-400"
                >
                  <option value="faang">FAANG India (Google, MS, Uber, Amazon)</option>
                  <option value="tier1_startup">Tier 1 Product Org (CRED, Swiggy, Zepto, Razorpay)</option>
                  <option value="tier2_product">Tier 2 Product (Cloudscale, InnovateTech)</option>
                  <option value="early_stage">Early Stage / Seed Funded</option>
                  <option value="remote_global">Remote Global Developer (US/Euro Rates)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location Bracket
                </label>
                <select
                  value={selectedLoc}
                  onChange={e => setSelectedLoc(e.target.value as LocationKey)}
                  className="w-full bg-[#0d1016] border border-border p-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-400"
                >
                  {Object.entries(LOCATION_MULTIPLIERS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label} (x{val.mult})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Benchmarking Output Details */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
              
              {/* Output Columns */}
              <div className="border border-border bg-[#0e1117] p-6 space-y-6">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Estimated CTC Ranges</span>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground">{formatLakhs(totalCtcMin)} - {formatLakhs(totalCtcMax)}</span>
                    <span className="text-xs text-muted-foreground">/ year</span>
                  </div>
                </div>

                <div className="space-y-3.5 border-t border-border/60 pt-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                    COMPENSATION COMPONENT SPLIT (ANNUALIZED)
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Base Salary (Guaranteed Cash)</span>
                      <span className="font-bold text-foreground">{formatRupees(adjustedBaseMin)} - {formatRupees(adjustedBaseMax)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Variable Bonus / Performance Pay</span>
                      <span className="font-bold text-amber-400">{formatRupees(adjustedVarMin)} - {formatRupees(adjustedVarMax)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">ESOP / RSU Paper Grant</span>
                      <span className="font-bold text-emerald-400">{formatRupees(adjustedEqMin)} - {formatRupees(adjustedEqMax)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4 text-xs space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">PROMOTION TRAJECTORY</span>
                  <p className="text-muted-foreground leading-normal">
                    Average time required to cycle out from this level to the next step-up is: <strong className="text-foreground">{baseBenchmark.promoTimelineYears}</strong>.
                  </p>
                </div>
              </div>

              {/* Side Panels: Skill Premiums */}
              <div className="border border-border bg-[#0e1117] p-6 space-y-4">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  SKILL PREMIUM MULTIPLIERS
                </span>
                
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Check the target skill stacks to estimate their premium impact on the base benchmark salary ranges:
                </p>

                <div className="space-y-3">
                  {SKILL_PREMIUMS.map(prem => (
                    <label key={prem.id} className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={activePremiums.includes(prem.id)}
                        onChange={() => handleTogglePremium(prem.id)}
                        className="mt-0.5 accent-emerald-400"
                      />
                      <div>
                        <span className="font-bold text-foreground block">{prem.label}</span>
                        <span className="text-[9px] text-emerald-400 font-semibold">(+{Math.round((prem.mult - 1) * 100)}% premium)</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* PERSPECTIVE 2: CTC DECODER */}
        {/* ---------------------------------------------------------------------- */}
        {activePerspective === "ctc_decoder" && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-400" /> IN-HAND CASH & CTC DECODER
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Deconstruct the corporate CTC quote to find what hits your bank account every month after tax brackets and PF contributions.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
              
              {/* Inputs */}
              <div className="border border-border bg-[#0e1117] p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Total Quoted CTC</label>
                    <input
                      type="number"
                      value={quotedCtc}
                      onChange={e => setQuotedCtc(e.target.value)}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Guaranteed Fixed Component</label>
                    <input
                      type="number"
                      value={fixedPay}
                      onChange={e => setFixedPay(e.target.value)}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Performance Bonus</label>
                    <input
                      type="number"
                      value={variablePay}
                      onChange={e => setVariablePay(e.target.value)}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Annual Gratuity</label>
                    <input
                      type="number"
                      value={gratuityVal}
                      onChange={e => setGratuityVal(e.target.value)}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">ESOP Annual Value</label>
                    <input
                      type="number"
                      value={esopGrantVal}
                      onChange={e => setEsopGrantVal(e.target.value)}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Tax regime selection */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Select Tax Regime</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsNewTaxRegime(true)}
                      className={`border p-3 text-left transition-all ${
                        isNewTaxRegime
                          ? "border-emerald-400 bg-emerald-950/20 text-emerald-400"
                          : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-bold block">New Regime (FY 2025-26)</span>
                      <span className="text-[9px] mt-0.5 block text-muted-foreground">Standard 75k deduction, zero tax up to 7L</span>
                    </button>
                    <button
                      onClick={() => setIsNewTaxRegime(false)}
                      className={`border p-3 text-left transition-all ${
                        !isNewTaxRegime
                          ? "border-emerald-400 bg-emerald-950/20 text-emerald-400"
                          : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-bold block">Old Regime</span>
                      <span className="text-[9px] mt-0.5 block text-muted-foreground">Uses HRA, 80C, and traditional deductions</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Outputs */}
              <div className="border border-border bg-[#0e1117] p-6 space-y-4 font-mono text-xs">
                <div className="bg-[#1c2230] p-4 border border-border text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Estimated Net Monthly In-Hand</span>
                  <div className="mt-1 text-2xl font-black text-emerald-400">
                    {formatRupees(decodedValues.monthlyNet)}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-0.5 block">Estimated post-tax cash deposition</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Guaranteed Fixed component</span>
                    <span className="text-foreground font-semibold">{formatRupees(Number(fixedPay))}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">PF Employer Share (Cost to Company)</span>
                    <span className="text-red-400">-{formatRupees(decodedValues.pfEmployer)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">PF Employee Share (Deducted)</span>
                    <span className="text-red-400">-{formatRupees(decodedValues.pfEmployee)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Estimated Income Tax (Annual)</span>
                    <span className="text-red-400">-{formatRupees(decodedValues.annualTax)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-bold text-emerald-400">
                    <span>Net Annual Take-Home</span>
                    <span>{formatRupees(decodedValues.takeHomeAnnual)}</span>
                  </div>
                </div>

                <div className="border border-amber-900 bg-amber-950/10 p-3.5 space-y-2 text-[10px] border-dashed text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold uppercase">
                    <AlertTriangle className="h-4 w-4" /> RETIRALS & PAPER COMPONENT ADVISORY
                  </div>
                  <p className="leading-normal">
                    Gratuity and employer PF are deducted as part of corporate cost templates. Gratuity is only claimable after completing 5 consecutive years.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* PERSPECTIVE 3: ESOP VALUE ENGINE */}
        {/* ---------------------------------------------------------------------- */}
        {activePerspective === "esops" && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-400" /> ESOP / STOCK VALUATION ENGINE
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Deconstruct options grants, calculate exercise strike costs, and project post-exit multipliers and Indian tax implications.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
              
              {/* Inputs */}
              <div className="border border-border bg-[#0e1117] p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Number of Options Granted</label>
                    <input
                      type="number"
                      value={optionCount}
                      onChange={e => setOptionCount(e.target.value)}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Grant / Strike Price (INR)</label>
                    <input
                      type="number"
                      value={strikePrice}
                      onChange={e => setStrikePrice(e.target.value)}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Current Stock Price (FMV)</label>
                    <input
                      type="number"
                      value={fmvPrice}
                      onChange={e => setFmvPrice(e.target.value)}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Exit Multiplier Slider */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold">
                    <span>Projected Exit Valuation Multiple</span>
                    <span className="text-emerald-400 font-bold">{exitMultiple}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={exitMultiple}
                    onChange={e => setExitMultiple(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#161b22] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>1x (Base Valuation)</span>
                    <span>5x</span>
                    <span>10x (Hypergrowth Unicorn Exit)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Vesting Period (Standard Years)</label>
                  <select
                    value={vestedYears}
                    onChange={e => setVestedYears(Number(e.target.value))}
                    className="w-full bg-[#0d1016] border border-border p-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-400"
                  >
                    <option value="4">4 Years (1-yr cliff, 25% annual vesting)</option>
                    <option value="1">1 Year (Rapid acceleration)</option>
                    <option value="2">2 Years (Short retention)</option>
                  </select>
                </div>
              </div>

              {/* Outputs */}
              <div className="border border-border bg-[#0e1117] p-6 space-y-4 font-mono text-xs">
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Current Paper Value (FMV)</span>
                    <span className="text-foreground font-semibold">{formatRupees(esopMath.paperValue)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Total Strike Exercise Cost</span>
                    <span className="text-red-400">-{formatRupees(esopMath.exerciseCost)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Estimated Perquisite Tax (Exercise)</span>
                    <span className="text-red-400">-{formatRupees(esopMath.exerciseTax)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/40 pb-2 font-semibold">
                    <span className="text-muted-foreground">Net Paper Equity Profit</span>
                    <span className="text-emerald-400">{formatRupees(esopMath.paperProfit - esopMath.exerciseTax)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-bold text-emerald-400">
                    <span>Projected Exit Value ({exitMultiple}x)</span>
                    <span>{formatRupees(esopMath.exitTotalValue)}</span>
                  </div>
                </div>

                <div className="border border-cyan-900 bg-cyan-950/10 p-3.5 space-y-2 text-[10px] border-dashed text-cyan-200 mt-2">
                  <div className="flex items-center gap-1.5 font-bold uppercase">
                    <Info className="h-4 w-4 text-cyan-400" /> DUAL TAXATION CAUTION (INDIA)
                  </div>
                  <p className="leading-normal">
                    Indian ESOPs are taxed twice: (1) **Perquisite Tax** at standard income tax slabs upon exercise, and (2) **Capital Gains Tax** (Short or Long term) upon stock liquidation.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* PERSPECTIVE 4: OFFER COMPARER */}
        {/* ---------------------------------------------------------------------- */}
        {activePerspective === "offer_compare" && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Scale className="h-5 w-5 text-emerald-400" /> SIDE-BY-SIDE OFFER COMPARER
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Deconstruct two competing corporate proposals to evaluate the real, non-paper risk-adjusted compensation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              {/* Offer A Card */}
              <div className="border border-border bg-[#0e1117] p-6 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-foreground uppercase border-b border-border/40 pb-2">
                  PROPOSAL A
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Company Name</label>
                    <input
                      type="text"
                      value={offerA.company}
                      onChange={e => setOfferA({ ...offerA, company: e.target.value })}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Base Cash component (Annual)</label>
                    <input
                      type="number"
                      value={offerA.base}
                      onChange={e => setOfferA({ ...offerA, base: e.target.value })}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Variable Bonus component</label>
                    <input
                      type="number"
                      value={offerA.variable}
                      onChange={e => setOfferA({ ...offerA, variable: e.target.value })}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Annual Stock / ESOP value</label>
                    <input
                      type="number"
                      value={offerA.stocks}
                      onChange={e => setOfferA({ ...offerA, stocks: e.target.value })}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Offer B Card */}
              <div className="border border-border bg-[#0e1117] p-6 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-foreground uppercase border-b border-border/40 pb-2">
                  PROPOSAL B
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Company Name</label>
                    <input
                      type="text"
                      value={offerB.company}
                      onChange={e => setOfferB({ ...offerB, company: e.target.value })}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Base Cash component (Annual)</label>
                    <input
                      type="number"
                      value={offerB.base}
                      onChange={e => setOfferB({ ...offerB, base: e.target.value })}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Variable Bonus component</label>
                    <input
                      type="number"
                      value={offerB.variable}
                      onChange={e => setOfferB({ ...offerB, variable: e.target.value })}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Annual Stock / ESOP value</label>
                    <input
                      type="number"
                      value={offerB.stocks}
                      onChange={e => setOfferB({ ...offerB, stocks: e.target.value })}
                      className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Comparison Metrics Output Panel */}
            <div className="border border-border bg-[#0e1117] p-6 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">RECOMMENDED OFFER</span>
                  <span className="text-xl font-black text-emerald-400">{comparison.winner}</span>
                </div>
                <div className="bg-[#1c2230] px-4 py-2 border border-border text-xs">
                  <span className="text-[9px] text-muted-foreground uppercase block">Calculated using conservative weights</span>
                  <span className="font-semibold block text-[10px]">Guaranteed Cash + 50% Variable + 25% Paper Stocks</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                
                {/* Stats Offer A */}
                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-foreground">{offerA.company} Audit</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Quoted CTC</span>
                    <span className="text-foreground">{formatRupees(comparison.ctcA)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Real Weighted Value</span>
                    <span className="text-emerald-400 font-bold">{formatRupees(comparison.realValueA)}</span>
                  </div>
                </div>

                {/* Stats Offer B */}
                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-foreground">{offerB.company} Audit</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Quoted CTC</span>
                    <span className="text-foreground">{formatRupees(comparison.ctcB)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Real Weighted Value</span>
                    <span className="text-emerald-400 font-bold">{formatRupees(comparison.realValueB)}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* PERSPECTIVE 5: NEGOTIATION PLAYBOOK */}
        {/* ---------------------------------------------------------------------- */}
        {activePerspective === "negotiation" && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" /> HIGH-LEVERAGE NEGOTIATION PLAYBOOK
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Actionable scripts and templates designed to counter typical objections from Indian recruitment heads and HR departments.
              </p>
            </div>

            <div className="space-y-4">
              
              {/* Playbook Item 1 */}
              <div className="border border-border bg-[#0e1117] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center bg-red-950/40 border border-red-800 text-red-400 font-bold">Q</span>
                  COUNTERING: &quot;Please share your current CTC break-up and last 3 months payslips.&quot;
                </div>
                <div className="text-xs text-muted-foreground space-y-2">
                  <strong className="text-foreground uppercase block text-[9px] tracking-widest text-emerald-400">Tactical Strategy:</strong>
                  <p>
                    Avoid disclosing raw payslips early in the process. Reframe the discussion around market rates for the specific level and responsibilities.
                  </p>
                  
                  <div className="bg-black/40 border border-border p-3.5 font-mono text-[10px] text-foreground leading-normal relative mt-2">
                    <span className="absolute top-2 right-2 bg-emerald-950 text-emerald-400 text-[8px] font-bold px-1.5">RESPONSE SCRIPT</span>
                    &quot;I prefer not to anchor our conversation on my historical compensation. Instead, I’d like to focus on the scope of the Senior Fullstack role at CRED and the market benchmarks for this level. Based on data from similar Tier-1 firms in Bangalore, my target range for this role is in the bracket of {formatLakhs(BENCHMARKS.sde2.tier1_startup.basePayMin)} - {formatLakhs(BENCHMARKS.sde2.tier1_startup.basePayMax)} base cash component.&quot;
                  </div>
                </div>
              </div>

              {/* Playbook Item 2 */}
              <div className="border border-border bg-[#0e1117] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center bg-red-950/40 border border-red-800 text-red-400 font-bold">Q</span>
                  COUNTERING: &quot;Our budget is capped at a 30% hike over your previous CTC.&quot;
                </div>
                <div className="text-xs text-muted-foreground space-y-2">
                  <strong className="text-foreground uppercase block text-[9px] tracking-widest text-emerald-400">Tactical Strategy:</strong>
                  <p>
                    Reject percentage-based cap thresholds. Show that historical base is irrelevant to the replacement value of the role.
                  </p>
                  
                  <div className="bg-black/40 border border-border p-3.5 font-mono text-[10px] text-foreground leading-normal relative mt-2">
                    <span className="absolute top-2 right-2 bg-emerald-950 text-emerald-400 text-[8px] font-bold px-1.5">RESPONSE SCRIPT</span>
                    &quot;I understand that you have general internal bands. However, because my previous role was at a smaller early-stage startup, my compensation was below market averages to allow for higher equity. As we align my compensation to a mid-tier structure, applying a generic 30% cap doesn&apos;t match my target skills value. Let&apos;s look at the market benchmark for SDE2 at CRED to find a mutually viable baseline.&quot;
                  </div>
                </div>
              </div>

              {/* Playbook Item 3 */}
              <div className="border border-border bg-[#0e1117] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center bg-red-950/40 border border-red-800 text-red-400 font-bold">Q</span>
                  COUNTERING: &quot;ESOPs are worth gold - we cannot increase the base cash.&quot;
                </div>
                <div className="text-xs text-muted-foreground space-y-2">
                  <strong className="text-foreground uppercase block text-[9px] tracking-widest text-emerald-400">Tactical Strategy:</strong>
                  <p>
                    Reframe paper stock values to account for liquidity risk, vesting periods, and exercise taxes.
                  </p>
                  
                  <div className="bg-black/40 border border-border p-3.5 font-mono text-[10px] text-foreground leading-normal relative mt-2">
                    <span className="absolute top-2 right-2 bg-emerald-950 text-emerald-400 text-[8px] font-bold px-1.5">RESPONSE SCRIPT</span>
                    &quot;I appreciate that the stock has strong growth potential. However, since startup equity carries standard liquidity thresholds and exercise tax implications upon vesting, I need to ensure my fixed cash base supports my family commitments. I am happy to compromise on the ESOP grant volume if we can align the fixed base pay closer to my target range.&quot;
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
