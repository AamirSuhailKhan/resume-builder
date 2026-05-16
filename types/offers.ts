export interface OfferInput {
  id: string;
  company: string;
  role: string;
  base: number;
  currency: "INR" | "USD" | "EUR" | "GBP";
  equity?: {
    type: "rsu" | "options" | "esop" | "none";
    shares?: number | undefined;
    strikePrice?: number | undefined;
    currentFMV?: number | undefined;
    vestingYears?: number | undefined;
    cliffMonths?: number | undefined;
    companyValuation?: number | undefined;
    lastRoundPricePerShare?: number | undefined;
  } | undefined;
  bonus?: number | undefined;
  benefits: {
    healthInsurance: boolean;
    pf: boolean;
    gratuity: boolean;
    remoteFriendly: boolean;
    stockRefresher: boolean;
    learningBudget: number;
  };
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  companyStage: "seed" | "series_a" | "series_b" | "growth" | "public" | "enterprise";
  notes?: string | undefined;
}

export interface ProcessedOffer extends OfferInput {
  totalCompYear1: number;
  totalCompYear4: number;
  equityValueConservative: number;
  equityValueOptimistic: number;
  takehomeMonthly: number;
  locationAdjustedValue: number;
  growthScore: number;
  stabilityScore: number;
  overallScore: number;
}

export interface OfferAnalysis {
  offers: ProcessedOffer[];
  winner: string;
  winnerReasoning: string;
  tradeoffs: string[];
  negotiationLeverage: string;
  redFlags?: string[];
}

export interface OfferPriorities {
  compensation: number;
  growth: number;
  stability: number;
  workLife: number;
}
