import { describe, expect, it } from "vitest";
import { computeIncomeTaxNew, computeIncomeTaxOld, decodeCTC } from "@/lib/services/ctc-calculator";

describe("ctc calculator", () => {
  it("applies the new regime 87A rebate up to 7L taxable income", () => {
    expect(computeIncomeTaxNew(700000)).toBe(0);
  });

  it("caps employee PF at 21,600 per year", () => {
    const decoded = decodeCTC({
      fixedComponent: 2400000,
      variableComponent: 0,
      basicSalary: 1200000,
      hra: 600000,
      specialAllowance: 600000,
      pfEmployer: 21600,
      gratuityAnnual: 57692,
      taxRegime: "new",
    });

    expect(decoded.pfEmployee).toBe(21600);
  });

  it("returns rounded monthly take-home for an INR CTC", () => {
    const decoded = decodeCTC({
      quotedCtc: 1800000,
      fixedComponent: 1600000,
      variableComponent: 100000,
      basicSalary: 800000,
      hra: 400000,
      specialAllowance: 400000,
      pfEmployer: 21600,
      gratuityAnnual: 38462,
      taxRegime: "new",
    });

    expect(decoded.quotedCtc).toBe(1800000);
    expect(decoded.netMonthly).toBeGreaterThan(100000);
    expect(Number.isInteger(decoded.netMonthly)).toBe(true);
  });

  it("uses old regime deductions for PF and simplified HRA exemption", () => {
    const tax = computeIncomeTaxOld(1200000, 21600, 300000);

    expect(tax).toBeGreaterThan(0);
    expect(tax).toBeLessThan(computeIncomeTaxOld(1200000, 0, 0));
  });
});
