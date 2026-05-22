"use client";



import React, { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock, Mail, MessageSquare, PauseCircle, PlayCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FollowUpSequence({ campaign }: { campaign: any }) {
  const [isApproving, setIsApproving] = useState(false);
  const [localCampaign, setLocalCampaign] = useState(campaign);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (!localCampaign) return null;

  const emails = localCampaign.emails || [];
  
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${localCampaign.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve sequence");
      const updated = await res.json();
      setLocalCampaign(updated);
      setNotice({ type: "success", message: "Follow-up sequence approved and scheduled." });
    } catch (e: any) {
      setNotice({ type: "error", message: e.message });
    } finally {
      setIsApproving(false);
    }
  };

  const handlePause = async () => {
    try {
      const res = await fetch(`/api/v1/campaigns/${localCampaign.id}/pause`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to pause sequence");
      const updated = await res.json();
      setLocalCampaign(updated);
      setNotice({ type: "success", message: "Sequence paused." });
    } catch (e: any) {
      setNotice({ type: "error", message: e.message });
    }
  };

  const handleReplied = async () => {
    try {
      const res = await fetch(`/api/v1/campaigns/${localCampaign.id}/replied`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark as replied");
      const updated = await res.json();
      setLocalCampaign(updated);
      setNotice({ type: "success", message: "Marked as replied. Future follow-ups canceled." });
    } catch (e: any) {
      setNotice({ type: "error", message: e.message });
    }
  };

  const hasPendingApproval = emails.some((e: any) => e.status === "pending_approval");

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between bg-surface-muted/30 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Mail className="h-5 w-5 text-muted-foreground" />
            Follow-Up Sequence
            {localCampaign.status === "active" && <Badge variant="success">Active</Badge>}
            {localCampaign.status === "paused" && <Badge variant="warning">Paused</Badge>}
            {localCampaign.status === "replied" && <Badge variant="primary">Replied</Badge>}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Relationship orchestration with {localCampaign.recruiterName || "the hiring team"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {localCampaign.status === "active" && !hasPendingApproval && (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <PauseCircle className="mr-2 h-4 w-4" /> Pause
            </Button>
          )}
          {localCampaign.status !== "replied" && (
            <Button variant="outline" size="sm" onClick={handleReplied}>
              <MessageSquare className="mr-2 h-4 w-4" /> Mark Replied
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {notice && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${notice.type === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
            {notice.message}
          </div>
        )}

        {hasPendingApproval && (
          <div className="mb-6 rounded-lg border border-warning/50 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-warning" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-warning-foreground">Approval Required</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  The AI has drafted personalized follow-ups based on your Career Memory. Please review the strategy below before authorizing the sequence.
                </p>
              </div>
              <Button onClick={handleApprove} disabled={isApproving}>
                {isApproving ? "Approving..." : "Approve & Schedule"}
              </Button>
            </div>
          </div>
        )}

        <div className="relative border-l border-border ml-3 space-y-8 pb-4">
          <div className="relative pl-6">
            <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
            <h4 className="text-sm font-medium">Applied to Role</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(localCampaign.createdAt), "MMM d, yyyy")}</p>
          </div>

          {emails.map((draft: any) => (
            <div key={draft.id} className="relative pl-6">
              <div className="absolute -left-[9px] top-1 bg-background">
                {draft.status === "sent" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : draft.status === "scheduled" ? (
                  <Clock className="h-4 w-4 text-primary" />
                ) : draft.status === "skipped" ? (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Circle className="h-4 w-4 text-warning" />
                )}
              </div>
              
              <div className="mb-1 flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Follow-Up #{draft.sequence}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({draft.status === "sent" && draft.sentAt ? `Sent ${format(new Date(draft.sentAt), "MMM d")}` : `Scheduled for ${format(new Date(draft.scheduledAt), "MMM d")}`})
                  </span>
                </h4>
                <Badge variant="neutral" className="text-[10px] uppercase tracking-wider">{draft.status.replace("_", " ")}</Badge>
              </div>

              <div className="rounded-md border bg-card p-3 shadow-sm">
                <div className="text-sm font-medium mb-2 border-b pb-2">Subject: {draft.subject}</div>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground font-mono bg-muted/30 p-2 rounded">
                  {draft.body}
                </div>
                
                {draft.explainability && (
                  <div className="mt-3 rounded bg-accent/5 p-2 text-xs text-accent-foreground border border-accent/20">
                    <span className="font-semibold block mb-1">AI Reasoning:</span>
                    {draft.explainability?.reasoning}
                  </div>
                )}
              </div>
            </div>
          ))}

          {localCampaign.replyDetected && (
            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 bg-background">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <h4 className="text-sm font-medium text-primary">Reply Detected</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{localCampaign.lastReplyAt ? format(new Date(localCampaign.lastReplyAt), "MMM d, yyyy h:mm a") : "Sequence stopped"}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
