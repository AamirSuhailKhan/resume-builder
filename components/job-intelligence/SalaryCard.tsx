"use client";

import { Banknote, TrendingUp } from "lucide-react";

interface SalaryCardProps {
  salary: {
    min: number;
    max: number;
    currency: string;
  };
}

export function SalaryCard({ salary }: SalaryCardProps) {
  // Format numbers to local currency string
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: salary.currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-100">
          <Banknote className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Estimated Salary</h3>
          <p className="text-xs text-gray-400">Based on matched skills</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center py-6">
        <p className="text-sm font-semibold text-gray-500 mb-2">Market Range</p>
        <p className="text-2xl lg:text-3xl font-black text-gray-900">
          {formatCurrency(salary.min)} <span className="text-gray-300 font-normal mx-1">–</span> {formatCurrency(salary.max)}
        </p>
      </div>

      <div className="mt-auto border-t border-gray-50 pt-4 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
        <span>Adding missing skills increases this range</span>
      </div>
    </div>
  );
}

export function SalaryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col h-full animate-pulse">
      <div className="h-5 w-32 rounded bg-gray-200 mb-10" />
      <div className="mx-auto h-8 w-48 rounded bg-gray-200 mb-10" />
      <div className="mx-auto h-4 w-40 rounded bg-gray-100 mt-auto" />
    </div>
  );
}
