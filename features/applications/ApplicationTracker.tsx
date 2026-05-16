"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, SectionShell } from "@/components/features/section-shell";
import { ApplicationRecord, ApplicationStage } from "@/features/platform/data";

const stages: ApplicationStage[] = ["Applied", "Interview", "Rejected", "Offer"];

export function ApplicationTracker({ initialApplications }: { initialApplications: ApplicationRecord[] }) {
  const [items, setItems] = useState(initialApplications);
  const [active, setActive] = useState<ApplicationRecord | null>(null);
  const [reframeTarget, setReframeTarget] = useState<ApplicationRecord | null>(null);
  const [reframe, setReframe] = useState<{ reframe: string; statContext: string; nextStep: string } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const grouped = useMemo(() => {
    return stages.reduce<Record<ApplicationStage, ApplicationRecord[]>>(
      (acc, stage) => {
        acc[stage] = items.filter((item) => item.stage === stage);
        return acc;
      },
      { Applied: [], Interview: [], Rejected: [], Offer: [] }
    );
  }, [items]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const overStage = event.over?.id as ApplicationStage | undefined;
    const activeId = String(event.active.id);
    if (overStage && stages.includes(overStage)) {
      const activeItem = items.find(item => item.id === activeId);
      if (!activeItem || activeItem.stage === overStage) {
        setActive(null);
        return;
      }
      
      const previousStage = activeItem.stage;

      // Optimistic update
      setItems((current) => current.map((item) => (item.id === activeId ? { ...item, stage: overStage } : item)));
      
      try {
        const res = await fetch(`/api/v1/applications/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: overStage }),
        });
        
        if (!res.ok) throw new Error("Failed to persist stage change");
        if (overStage === "Rejected") {
          setReframeTarget(activeItem);
          setReframe(null);
        }
      } catch (err) {
        console.error("Drag and drop persistence failed:", err);
        // Rollback
        setItems((current) => current.map((item) => (item.id === activeId ? { ...item, stage: previousStage } : item)));
      }
    }
    setActive(null);
  };

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Application Tracker"
        title="A CRM-style board for your job search."
        description="Move applications through Applied, Interview, Rejected, and Offer with a workflow built for daily review."
      />

      <DndContext
        sensors={sensors}
        onDragStart={(event) => setActive(items.find((item) => item.id === event.active.id) ?? null)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="grid gap-4 xl:grid-cols-4">
          {stages.map((stage) => (
            <Column key={stage} stage={stage} items={grouped[stage]} />
          ))}
        </div>
        <DragOverlay>{active ? <ApplicationCard item={active} dragOverlay /> : null}</DragOverlay>
      </DndContext>

      {reframeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-surface-elevated p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <Heart className="mt-1 h-5 w-5 text-warning" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Want a rejection reframe?</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {reframeTarget.company} did not move forward for {reframeTarget.role}. That can sting; this can help turn it into one next step.
                </p>
              </div>
            </div>
            {reframe && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-muted-foreground">
                <p>{reframe.reframe}</p>
                <p className="mt-2">{reframe.statContext}</p>
                <p className="mt-2 font-medium text-foreground">{reframe.nextStep}</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setReframeTarget(null)}>Close</Button>
              <Button
                onClick={async () => {
                  const response = await fetch("/api/v1/wellbeing/rejection-reframe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyName: reframeTarget.company, jobTitle: reframeTarget.role, rejectionType: "no_response" }),
                  });
                  setReframe(await response.json());
                }}
              >
                Yes, help me process this
              </Button>
            </div>
          </div>
        </div>
      )}
    </SectionShell>
  );
}

function Column({ stage, items }: { stage: ApplicationStage; items: ApplicationRecord[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className="min-h-[520px] rounded-lg border border-border bg-surface/60 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-foreground">{stage}</h2>
        <Badge>{items.length}</Badge>
      </div>
      <div className={isOver ? "space-y-3 rounded-lg bg-surface-muted/50 p-1" : "space-y-3 p-1"}>
        {items.map((item) => (
          <DraggableApplication key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function DraggableApplication({ item }: { item: ApplicationRecord }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={isDragging ? "opacity-40" : undefined}
      {...listeners}
      {...attributes}
    >
      <ApplicationCard item={item} />
    </div>
  );
}

function ApplicationCard({ item, dragOverlay = false }: { item: ApplicationRecord; dragOverlay?: boolean }) {
  return (
    <motion.div layout initial={false} whileHover={{ y: -2 }}>
      <Card variant="elevated" className={dragOverlay ? "w-72 shadow-[var(--shadow-soft)]" : "cursor-grab active:cursor-grabbing"}>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.role}</p>
            </div>
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={item.score >= 88 ? "success" : "primary"}>{item.score}%</Badge>
            <Badge>{item.owner}</Badge>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{item.nextStep}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
