"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Key,
  Database,
  Trash2,
  Download,
  AlertTriangle,
  RefreshCw,
  Sliders,
  CheckCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AlertItem = {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  status: "OPEN" | "RESOLVED" | "INVESTIGATING";
  ipAddress: string | null;
  createdAt: string;
  user?: { name: string | null; email: string } | null;
};

type SecretReport = {
  name: string;
  configured: boolean;
  strength: string;
};

export function SecurityDashboard() {
  const [stats, setStats] = useState({
    totalLogs: 0,
    failedAudits: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
  });
  const [logsByAction, setLogsByAction] = useState<{ action: string; count: number }[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [secrets, setSecrets] = useState<SecretReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [gdprLoading, setGdprLoading] = useState(false);
  const [gdprMessage, setGdprMessage] = useState("");

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // 1. Stats and Alerts
      const statsRes = await fetch("/api/v1/security/stats");
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        setLogsByAction(data.logsByAction);
        setAlerts(data.recentAlerts);
      }

      // 2. Secrets check
      const secretsRes = await fetch("/api/v1/security/secrets-check");
      if (secretsRes.ok) {
        const data = await secretsRes.json();
        setSecrets(data.secretsReport);
      }
    } catch (err) {
      console.error("Failed to load security dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const resolveAlert = async (alertId: string) => {
    try {
      const res = await fetch("/api/v1/security/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status: "RESOLVED" }),
      });
      if (res.ok) {
        // Optimistic update
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED" } : a))
        );
        setStats((prev) => ({
          ...prev,
          activeAlerts: Math.max(0, prev.activeAlerts - 1),
        }));
      }
    } catch (err) {
      console.error("Failed to resolve alert", err);
    }
  };

  const handleGdprExport = async () => {
    setGdprLoading(true);
    setGdprMessage("");
    try {
      const res = await fetch("/api/v1/security/gdpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export" }),
      });
      if (res.ok) {
        const data = await res.json();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(data.data, null, 2)
        )}`;
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", "career_os_gdpr_export.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setGdprMessage("JSON data exported successfully.");
      } else {
        setGdprMessage("Data export failed. Please try again.");
      }
    } catch (err) {
      setGdprMessage("An error occurred during data export.");
    } finally {
      setGdprLoading(false);
    }
  };

  const handleGdprErasure = async () => {
    if (
      !confirm(
        "CRITICAL WARNING: This will permanently delete your account details, resumes, applications, and logs to satisfy GDPR compliance. This action CANNOT be undone. Proceed?"
      )
    ) {
      return;
    }

    setGdprLoading(true);
    setGdprMessage("");
    try {
      const res = await fetch("/api/v1/security/gdpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "erase" }),
      });
      if (res.ok) {
        const data = await res.json();
        setGdprMessage(data.message);
        setTimeout(() => {
          window.location.href = "/login?gdpr_erased=true";
        }, 3000);
      } else {
        setGdprMessage("Account erasure request failed.");
      }
    } catch (err) {
      setGdprMessage("An error occurred during account erasure.");
    } finally {
      setGdprLoading(false);
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-indigo-500" />
            Security & Compliance Operations
          </h1>
          <p className="text-muted-foreground">
            SOC2 Audit Trails, GDPR readiness, and active security configuration monitoring.
          </p>
        </div>
        <Button onClick={fetchSecurityData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="p-6">
            <Activity className="h-5 w-5 text-indigo-500 mb-2" />
            <p className="text-sm text-muted-foreground">Total Audit Logs</p>
            <p className="text-2xl font-bold mt-1">{stats.totalLogs}</p>
            <p className="text-xs text-muted-foreground mt-2">Active tracing</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <AlertTriangle className="h-5 w-5 text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground">Failed Audits</p>
            <p className="text-2xl font-bold mt-1">{stats.failedAudits}</p>
            <p className="text-xs text-muted-foreground mt-2">Suspicious activities</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <ShieldAlert className="h-5 w-5 text-red-500 mb-2" />
            <p className="text-sm text-muted-foreground">Active Security Incidents</p>
            <p className="text-2xl font-bold mt-1 text-red-400">{stats.activeAlerts}</p>
            <p className="text-xs text-muted-foreground mt-2">Awaiting resolution</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <Sliders className="h-5 w-5 text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">Critical Level Alerts</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">{stats.criticalAlerts}</p>
            <p className="text-xs text-muted-foreground mt-2">SLA target &lt; 1 hour</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts Feed & Audit Statistics */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                Active Incident Alerts (SOC2 Resolution Hub)
              </CardTitle>
              <CardDescription>
                Simulated threat triggers and real anomalies detected across nodes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No active security incidents found. System fully operational.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border flex justify-between items-start ${
                      alert.status === "RESOLVED"
                        ? "border-border bg-surface-muted/30 opacity-70"
                        : "border-red-900/30 bg-red-950/10"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            alert.severity === "CRITICAL"
                              ? "danger"
                              : alert.severity === "HIGH"
                              ? "warning"
                              : "neutral"
                          }
                          className="text-[10px]"
                        >
                          {alert.severity}
                        </Badge>
                        <span className="font-semibold text-sm text-foreground">
                          {alert.type}
                        </span>
                        <Badge variant="neutral" className="text-[10px] ml-2">
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      <div className="text-[10px] text-muted-foreground pt-1 flex gap-2">
                        <span>IP: {alert.ipAddress || "system"}</span>
                        <span>•</span>
                        <span>Date: {new Date(alert.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {alert.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resolveAlert(alert.id)}
                        className="text-emerald-400 hover:text-emerald-300 gap-1 text-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Resolve
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Audit logs breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Top Audit Actions Traced</CardTitle>
              <CardDescription>Aggregate summary of secure actions computed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {logsByAction.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 rounded-lg border border-border bg-surface-muted/20"
                >
                  <span className="text-sm font-medium text-foreground">{item.action}</span>
                  <Badge variant="neutral">{item.count} occurrences</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: SOC2 Environment & GDPR Readiness Controls */}
        <div className="space-y-8">
          {/* SOC2 environment variables check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-400" />
                Secrets Audit (SOC2 Compliance)
              </CardTitle>
              <CardDescription>
                Check keys for storage encryption at rest and transit configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {secrets.map((sec, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-border pb-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{sec.name}</p>
                    <p className="text-[10px] text-muted-foreground">Strength: {sec.strength}</p>
                  </div>
                  {sec.configured ? (
                    <Badge variant="success" className="text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="danger" className="text-[10px] gap-1">
                      <ShieldAlert className="h-3 w-3" /> Missing
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* GDPR Control panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-400" />
                GDPR Control Panel
              </CardTitle>
              <CardDescription>
                Manage personal data export & erasure rights (Portability & Erasure).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGdprExport}
                disabled={gdprLoading}
                className="w-full justify-between"
                variant="outline"
              >
                <span>Export Profile JSON</span>
                <Download className="h-4 w-4 text-indigo-400" />
              </Button>
              <Button
                onClick={handleGdprErasure}
                disabled={gdprLoading}
                className="w-full justify-between hover:bg-red-950/20 text-red-400 border-red-900/30"
                variant="outline"
              >
                <span>Permanent Account Wipe</span>
                <Trash2 className="h-4 w-4" />
              </Button>
              {gdprMessage && (
                <p className="text-xs text-muted-foreground text-center bg-surface-muted p-2 rounded border border-border">
                  {gdprMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
