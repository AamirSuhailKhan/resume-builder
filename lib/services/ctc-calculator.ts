export type TaxRegime = "new" | "old";

export type OtherAllowance = {
  name: string;
  amount: number;
};

export type DecodeCtcInput = {
  quotedCtc?: number;
  fixedComponent: number;
  variableComponent?: number;
  variablePct?: number;
  basicSalary: number;
  hra?: number;
  specialAllowance?: number;
  pfEmployer?: number;
  gratuityAnnual?: number;
  bonus?: number;
  esop?: number;
  otherAllowances?: OtherAllowance[];
  taxRegime: TaxRegime;
};

export type CtcBreakdown = {
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
  otherAllowances: OtherAllowance[];
  grossAnnual: number;
  netAnnual: number;
  grossMonthly: number;
  netMonthly: number;
  taxAnnual: number;
  taxRegime: TaxRegime;
  effectiveCtc: number;
};

function money(value: number | undefined): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? Number(value) : 0));
}

function normalizeAllowances(allowances: OtherAllowance[] | undefined): OtherAllowance[] {
  if (!Array.isArray(allowances)) return [];

  return allowances
    .map((item) => ({
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 80) : "Other allowance",
      amount: money(item.amount),
    }))
    .filter((item) => item.amount > 0);
}

export function computeIncomeTaxNew(annualIncome: number): number {
  const taxableIncome = Math.max(0, money(annualIncome) - 75000);

  if (taxableIncome <= 300000) return 0;
  if (taxableIncome <= 700000) return 0;

  let tax = (700000 - 300000) * 0.05;
  if (taxableIncome <= 1000000) return Math.round(tax + (taxableIncome - 700000) * 0.1);

  tax += (1000000 - 700000) * 0.1;
  if (taxableIncome <= 1200000) return Math.round(tax + (taxableIncome - 1000000) * 0.15);

  tax += (1200000 - 1000000) * 0.15;
  if (taxableIncome <= 1500000) return Math.round(tax + (taxableIncome - 1200000) * 0.2);

  tax += (1500000 - 1200000) * 0.2;
  return Math.round(tax + (taxableIncome - 1500000) * 0.3);
}

export function computeIncomeTaxOld(annualIncome: number, pfEmployee: number, hra: number): number {
  const eightyC = Math.min(money(pfEmployee), 150000);
  const taxableIncome = Math.max(0, money(annualIncome) - 50000 - eightyC - money(hra) * 0.4);

  if (taxableIncome <= 250000) return 0;
  if (taxableIncome <= 500000) {
    const tax = (taxableIncome - 250000) * 0.05;
    return tax <= 12500 ? 0 : Math.round(tax);
  }

  let tax = (500000 - 250000) * 0.05;
  if (taxableIncome <= 1000000) return Math.round(tax + (taxableIncome - 500000) * 0.2);

  tax += (1000000 - 500000) * 0.2;
  return Math.round(tax + (taxableIncome - 1000000) * 0.3);
}

export function decodeCTC(input: DecodeCtcInput): CtcBreakdown {
  const fixedComponent = money(input.fixedComponent);
  const variablePct = Math.max(0, Number.isFinite(input.variablePct) ? Number(input.variablePct) : 0);
  const variableComponent =
    input.variableComponent && input.variableComponent > 0
      ? money(input.variableComponent)
      : money((fixedComponent * variablePct) / 100);
  const basicSalary = money(input.basicSalary);
  const hra = money(input.hra);
  const specialAllowance = money(input.specialAllowance);
  const pfEmployer = money(input.pfEmployer);
  const gratuityAnnual = money(input.gratuityAnnual);
  const bonus = money(input.bonus);
  const esop = money(input.esop);
  const otherAllowances = normalizeAllowances(input.otherAllowances);

  const pfEmployee = Math.min(Math.round(basicSalary * 0.12), 21600);
  const grossAnnual = fixedComponent + variableComponent;
  const taxBase = input.taxRegime === "new" ? grossAnnual - pfEmployee : grossAnnual;
  const taxAnnual =
    input.taxRegime === "new"
      ? computeIncomeTaxNew(taxBase)
      : computeIncomeTaxOld(taxBase, pfEmployee, hra);
  const netAnnual = Math.max(0, Math.round(grossAnnual - pfEmployee - taxAnnual));
  const grossMonthly = Math.round(fixedComponent / 12);
  const netMonthly = Math.round(netAnnual / 12);
  const computedQuotedCtc = fixedComponent + variableComponent + pfEmployer + gratuityAnnual;
  const quotedCtc = input.quotedCtc && input.quotedCtc > 0 ? money(input.quotedCtc) : computedQuotedCtc;

  return {
    quotedCtc,
    fixedComponent,
    variableComponent,
    variablePct,
    basicSalary,
    hra,
    specialAllowance,
    pfEmployee,
    pfEmployer,
    gratuityAnnual,
    bonus,
    esop,
    otherAllowances,
    grossAnnual,
    netAnnual,
    grossMonthly,
    netMonthly,
    taxAnnual,
    taxRegime: input.taxRegime,
    effectiveCtc: grossAnnual,
  };
}
