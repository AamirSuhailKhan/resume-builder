/**
 * app/(dashboard)/agent/page.tsx
 *
 * Page wrapper for the Autonomous Career Agent.
 */

import { AutonomousAgentDashboard } from "@/features/agent/AutonomousAgentDashboard";

export const metadata = {
  title: "Autonomous Agent | CareerOS",
  description: "Let the AI agent orchestrate your career goal path, skill acquisitions, and applications.",
};

export default function AgentPage() {
  return <AutonomousAgentDashboard />;
}
