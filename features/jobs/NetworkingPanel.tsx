"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, ExternalLink, Network, CheckCircle2, ShieldAlert } from "lucide-react";

interface ConnectionPath {
  id: string;
  type: string;
  strength: number;
  personName: string;
  personTitle: string | null;
  personCompany: string | null;
  sharedContext: string | null;
  linkedinUrl: string | null;
  confidenceTier: string;
}

interface NetworkingPanelProps {
  jobOpportunityId: string;
}

export function NetworkingPanel({ jobOpportunityId }: NetworkingPanelProps) {
  const [connections, setConnections] = useState<ConnectionPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionPath | null>(null);
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/jobs/${jobOpportunityId}/connections`);
        const json = await res.json();
        if (json.data && json.data.connections) {
          setConnections(json.data.connections);
        }
      } catch (err) {
        console.error("Failed to load connections", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobOpportunityId]);

  const handleGenerate = async (conn: ConnectionPath) => {
    setSelectedConnection(conn);
    setOutreachModalOpen(true);
    setGeneratingMessage(true);
    setMessage("");
    setCopied(false);

    try {
      const res = await fetch(`/api/v1/jobs/${jobOpportunityId}/connections/${conn.id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: "casual" }),
      });
      const json = await res.json();
      if (json.data && json.data.message) {
        setMessage(json.data.message);
      } else {
        setMessage("Could not generate message. Please try again.");
      }
    } catch (err) {
      setMessage("An error occurred while generating the message.");
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
          <Network className="h-4 w-4" /> AI-suggested networking opportunities
        </h3>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
          <Network className="h-4 w-4" /> AI-suggested networking opportunities
        </h3>
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          No clear networking paths inferred for this role.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Network className="h-4 w-4 text-primary" /> AI-suggested networking opportunities
      </h3>

      <div className="space-y-3">
        {connections.map((conn) => (
          <div key={conn.id} className="rounded-xl border border-border bg-surface p-4 text-sm transition-colors hover:border-border-hover">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{conn.personName}</span>
                  {conn.confidenceTier === "verified" ? (
                    <Badge variant="success" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs"><ShieldAlert className="h-3 w-3 mr-1" /> Inferred</Badge>
                  )}
                </div>
                <div className="text-muted-foreground text-xs mb-3">
                  {conn.personTitle} {conn.personCompany && `at ${conn.personCompany}`}
                </div>
              </div>
              <Badge variant="neutral" className="capitalize">
                {conn.type.replace("_", " ")}
              </Badge>
            </div>

            <div className="rounded bg-muted/50 p-2 text-xs italic text-muted-foreground mb-4">
              <span className="not-italic font-medium mr-1 text-foreground">Why am I seeing this?</span>
              {conn.sharedContext}
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => handleGenerate(conn)}>
                Generate outreach →
              </Button>
            </div>
          </div>
        ))}
      </div>

      {outreachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-lg sm:max-w-[500px]">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-semibold text-foreground">Message Draft</h2>
              <Button variant="ghost" size="icon" onClick={() => setOutreachModalOpen(false)}>✕</Button>
            </div>
            <div className="space-y-4 p-4">
              {generatingMessage ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Crafting personalized message...</p>
                </div>
              ) : (
                <>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[200px] font-sans"
                  />
                  <div className="flex justify-between items-center mt-4">
                    {selectedConnection?.linkedinUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedConnection.linkedinUrl as string, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" /> Verify on LinkedIn
                      </Button>
                    ) : <div />}
                    <Button size="sm" onClick={handleCopy}>
                      {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copied ? "Copied!" : "Copy to clipboard"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
