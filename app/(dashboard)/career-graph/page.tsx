import { CareerGraphPage } from "@/features/career-graph/CareerGraphPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Graph | CareerOS",
  description: "Visualize your complete career intelligence — skills, experience, applications, and relationships in one graph.",
};

export default function CareerGraphRoute() {
  return <CareerGraphPage />;
}
