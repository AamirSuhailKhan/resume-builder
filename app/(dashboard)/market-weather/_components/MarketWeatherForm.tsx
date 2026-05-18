"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MarketWeatherForm({
  defaultRole,
  defaultLocation,
  defaultIndustry,
  isSubscribed,
}: {
  defaultRole: string;
  defaultLocation: string;
  defaultIndustry: string;
  isSubscribed: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState(defaultRole);
  const [location, setLocation] = useState(defaultLocation);
  const [industry, setIndustry] = useState(defaultIndustry);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(isSubscribed);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", role);
    params.set("location", location);
    params.set("industry", industry);
    router.push(`/market-weather?${params.toString()}`);
    // Next.js will handle the transition, but we'll leave loading true to show state
  };

  const toggleSubscription = async () => {
    try {
      setSubscribing(true);
      const res = await fetch("/api/v1/preferences/market-digest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !subscribed }),
      });
      if (res.ok) {
        setSubscribed(!subscribed);
      }
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 md:items-end">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (e.g. Product Manager)"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent max-w-[200px]"
          required
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent max-w-[150px]"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="h-10 w-10 flex items-center justify-center rounded-lg bg-accent text-white hover:bg-accent/90 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </form>

      <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition">
        <input
          type="checkbox"
          checked={subscribed}
          onChange={toggleSubscription}
          disabled={subscribing}
          className="rounded border-border text-accent focus:ring-accent"
        />
        {subscribing ? "Updating..." : "Subscribe to Weekly Market Digest"}
      </label>
    </div>
  );
}
