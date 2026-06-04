import { CareerForecastingPage } from "@/features/forecasting/CareerForecastingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Forecasting | CareerOS",
  description: "Predict your salary growth, interview conversions, and target goal milestones using predictive algorithms across three path models.",
};

export default function CareerForecastingRoute() {
  return <CareerForecastingPage />;
}
