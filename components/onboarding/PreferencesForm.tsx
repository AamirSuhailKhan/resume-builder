"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type PreferencesFormProps = {
  initialRoles?: string[];
  initialLocations?: string[];
  initialGoalIn5Years?: string;
};

const jobTypes = ["full-time", "contract", "internship", "part-time"] as const;
const autonomyModes = [
  { value: "manual", label: "Draft only" },
  { value: "assistive", label: "Recommend" },
  { value: "auto", label: "Auto queue" },
] as const;

type JobType = (typeof jobTypes)[number];
type AutonomyMode = (typeof autonomyModes)[number]["value"];

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function PreferencesForm({ initialRoles = [], initialLocations = [], initialGoalIn5Years = "" }: PreferencesFormProps) {
  const router = useRouter();
  const [roleInput, setRoleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [roles, setRoles] = useState<string[]>(initialRoles.length ? initialRoles : ["Software Engineer"]);
  const [locations, setLocations] = useState<string[]>(initialLocations);
  const [remote, setRemote] = useState(true);
  const [selectedJobTypes, setSelectedJobTypes] = useState<JobType[]>(["full-time"]);
  const [minSalary, setMinSalary] = useState("");
  const [notes, setNotes] = useState("");
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>("manual");
  const [goalIn5Years, setGoalIn5Years] = useState(initialGoalIn5Years);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => roles.length > 0 && !isSubmitting, [roles.length, isSubmitting]);

  function addRole() {
    setRoles((current) => uniqueValues([...current, roleInput]));
    setRoleInput("");
  }

  function addLocation() {
    setLocations((current) => uniqueValues([...current, locationInput]));
    setLocationInput("");
  }

  function toggleJobType(jobType: JobType) {
    setSelectedJobTypes((current) => {
      if (current.includes(jobType)) return current.filter((item) => item !== jobType);
      return [...current, jobType];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roles,
          locations,
          remote,
          jobTypes: selectedJobTypes.length ? selectedJobTypes : ["full-time"],
          minSalary: minSalary ? Number(minSalary) : null,
          notes,
          autonomyMode,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to save preferences.");
      }

      // Separately save 5-year goal to career profile if provided
      if (goalIn5Years.trim()) {
        await fetch("/api/v1/career-profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ goals: { targetIn5Years: goalIn5Years.trim() } }),
        }).catch(() => {}); // non-blocking — do not fail onboarding for this
      }

      router.push("/onboarding/matches");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save preferences.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Target roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            <Input
              value={roleInput}
              onChange={(event) => setRoleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addRole();
                }
              }}
              placeholder="Product manager, data analyst..."
            />
            <Button type="button" variant="outline" size="icon" onClick={addRole} aria-label="Add role">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role} variant="primary" className="h-8 gap-1">
                {role}
                <button type="button" onClick={() => setRoles((current) => current.filter((item) => item !== role))}>
                  <X className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">Remove {role}</span>
                </button>
              </Badge>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Preferred locations
              <div className="flex gap-2">
                <Input
                  value={locationInput}
                  onChange={(event) => setLocationInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addLocation();
                    }
                  }}
                  placeholder="New York, London..."
                />
                <Button type="button" variant="outline" size="icon" onClick={addLocation} aria-label="Add location">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </label>

            <label className="space-y-2 text-sm font-medium">
              Minimum salary
              <Input
                type="number"
                min={0}
                value={minSalary}
                onChange={(event) => setMinSalary(event.target.value)}
                placeholder="120000"
              />
            </label>
          </div>

          {locations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {locations.map((location) => (
                <Badge key={location} className="h-8 gap-1">
                  {location}
                  <button
                    type="button"
                    onClick={() => setLocations((current) => current.filter((item) => item !== location))}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">Remove {location}</span>
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <label className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={remote}
              onChange={(event) => setRemote(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Include remote roles
          </label>

          <label className="space-y-2 text-sm font-medium">
            Search notes
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Industries, company size, visa needs, dealbreakers..."
            />
          </label>

          <label className="space-y-2 text-sm font-medium">
            Where do you see yourself in 5 years? <span className="text-muted-foreground font-normal">(optional)</span>
            <input
              type="text"
              value={goalIn5Years}
              onChange={(event) => setGoalIn5Years(event.target.value)}
              placeholder="e.g., Senior Engineering Manager at a startup, or Staff Engineer at a FAANG"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Application mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {autonomyModes.map((mode) => (
              <label
                key={mode.value}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-3 text-sm font-medium"
              >
                <input
                  type="radio"
                  name="autonomyMode"
                  checked={autonomyMode === mode.value}
                  onChange={() => setAutonomyMode(mode.value)}
                  className="h-4 w-4 accent-primary"
                />
                {mode.label}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Job type</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {jobTypes.map((jobType) => (
              <label key={jobType} className="flex min-h-10 items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={selectedJobTypes.includes(jobType)}
                  onChange={() => toggleJobType(jobType)}
                  className="h-4 w-4 accent-primary"
                />
                {jobType}
              </label>
            ))}
          </CardContent>
        </Card>

        {error && <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit} isLoading={isSubmitting}>
          Find matches
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
