"use client";

import { useState } from "react";
import { OpportunityGraph } from "@/lib/domain/opportunities/opportunity-graph.service";
import { IntelligencePanel } from "./IntelligencePanel";
import { DecisionSurface } from "./DecisionSurface";
import { AgentRuntimePanel } from "./AgentRuntimePanel";

export function OpportunityWorkspace({ initialGraph }: { initialGraph: OpportunityGraph }) {
  const [graph, setGraph] = useState<OpportunityGraph>(initialGraph);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Intelligence Panel (3 cols) */}
      <div className="lg:col-span-3 space-y-6 sticky top-6">
        <IntelligencePanel graph={graph} />
      </div>

      {/* CENTER: Decision Surface (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <DecisionSurface graph={graph} />
      </div>

      {/* RIGHT: Agent Runtime (4 cols) */}
      <div className="lg:col-span-4 space-y-6 sticky top-6">
        <AgentRuntimePanel graph={graph} />
      </div>
    </div>
  );
}
