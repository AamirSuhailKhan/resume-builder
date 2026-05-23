"use client";

import React, { useEffect, useState, useCallback } from "react";
import styles from "./ModerationDashboard.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// MODERATION DASHBOARD
// Internal trust-ops tool for reviewing fraud flags, contradictions,
// and quality issues.
// ─────────────────────────────────────────────────────────────────────────────

type QueueType = "all" | "fraud" | "contradiction" | "low_quality" | "verification" | "duplicate";
type QueueStatus = "pending" | "in_review" | "resolved" | "dismissed";

interface QueueItem {
  id: string;
  priority: number;
  queueType: string;
  entityType: string;
  entityId: string;
  summary: string;
  fraudScore?: number | null;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  contradictionAlert?: {
    type: string;
    severity: string;
    score: number;
    details: string;
  } | null;
}

interface QueueResponse {
  items: QueueItem[];
  total: number;
  pages: number;
  liveStats: {
    fraudQueueLength: number;
    contradictionQueueLength: number;
  };
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "P0 — Critical", color: "#ef4444" },
  1: { label: "P1 — High",     color: "#f97316" },
  2: { label: "P2 — Medium",   color: "#f59e0b" },
  3: { label: "P3 — Low",      color: "#64748b" },
};

const TYPE_ICONS: Record<string, string> = {
  fraud:         "🚨",
  contradiction: "⚠️",
  low_quality:   "📉",
  verification:  "🔐",
  duplicate:     "🔁",
};

export function ModerationDashboard() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<QueueType>("all");
  const [activeStatus, setActiveStatus] = useState<QueueStatus>("pending");
  const [page, setPage] = useState(0);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeType, status: activeStatus, limit: "30", page: String(page),
      });
      const res = await fetch(`/api/v1/moderation/queue?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, [activeType, activeStatus, page]);

  useEffect(() => { void fetchQueue(); }, [fetchQueue]);

  async function resolve(itemId: string, status: "resolved" | "dismissed" | "in_review", resolution?: string) {
    setResolving(itemId);
    try {
      await fetch(`/api/v1/moderation/queue/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution }),
      });
      await fetchQueue();
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>🛡️ Trust Operations</h1>
          <p className={styles.subtitle}>Intelligence Integrity Dashboard — CareerOS</p>
        </div>
        {data?.liveStats && (
          <div className={styles.liveStats}>
            <div className={styles.liveStat}>
              <span className={styles.liveStatDot} style={{ background: "#ef4444" }} />
              <span>{data.liveStats.fraudQueueLength} fraud signals</span>
            </div>
            <div className={styles.liveStat}>
              <span className={styles.liveStatDot} style={{ background: "#f59e0b" }} />
              <span>{data.liveStats.contradictionQueueLength} contradiction alerts</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Type</span>
          {(["all", "fraud", "contradiction", "low_quality", "verification", "duplicate"] as QueueType[]).map((t) => (
            <button key={t} className={`${styles.filterBtn} ${activeType === t ? styles.filterBtnActive : ""}`}
              onClick={() => { setActiveType(t); setPage(0); }}>
              {t === "all" ? "All" : `${TYPE_ICONS[t] ?? "•"} ${t.replace("_", " ")}`}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          {(["pending", "in_review", "resolved", "dismissed"] as QueueStatus[]).map((s) => (
            <button key={s} className={`${styles.filterBtn} ${activeStatus === s ? styles.filterBtnActive : ""}`}
              onClick={() => { setActiveStatus(s); setPage(0); }}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <div className={styles.loading}>Fetching queue…</div>
      ) : !data || data.items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyEmoji}>✅</span>
          <p>No items in this queue. Trust system is healthy.</p>
        </div>
      ) : (
        <>
          <div className={styles.queueStats}>
            <span>{data.total} items</span>
            <span>Page {page + 1} / {data.pages}</span>
          </div>
          <div className={styles.queue}>
            {data.items.map((item) => {
              const priorityInfo = PRIORITY_LABELS[item.priority] ?? PRIORITY_LABELS[3]!;
              return (
                <div key={item.id} className={`${styles.queueItem} ${styles[`priority${item.priority}`] ?? ""}`}>
                  <div className={styles.queueItemHeader}>
                    <div className={styles.queueItemLeft}>
                      <span className={styles.typeIcon}>{TYPE_ICONS[item.queueType] ?? "•"}</span>
                      <span className={styles.priorityBadge} style={{ borderColor: priorityInfo.color, color: priorityInfo.color }}>
                        {priorityInfo.label}
                      </span>
                      <span className={styles.entityType}>{item.entityType}</span>
                    </div>
                    <span className={styles.createdAt}>{new Date(item.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>

                  <p className={styles.summary}>{item.summary}</p>

                  {/* Fraud score bar */}
                  {item.fraudScore != null && (
                    <div className={styles.fraudScoreRow}>
                      <span className={styles.fraudScoreLabel}>Fraud signal</span>
                      <div className={styles.fraudScoreBar}>
                        <div
                          className={styles.fraudScoreFill}
                          style={{
                            width: `${item.fraudScore * 100}%`,
                            background: item.fraudScore > 0.7 ? "#ef4444" : item.fraudScore > 0.5 ? "#f97316" : "#f59e0b",
                          }}
                        />
                      </div>
                      <span className={styles.fraudScoreValue}>{(item.fraudScore * 100).toFixed(0)}%</span>
                    </div>
                  )}

                  {/* Contradiction alert details */}
                  {item.contradictionAlert && (
                    <div className={styles.contradictionDetails}>
                      <span className={`${styles.severityBadge} ${item.contradictionAlert.severity === "hard" ? styles.severityHard : styles.severitySoft}`}>
                        {item.contradictionAlert.severity.toUpperCase()} CONTRADICTION
                      </span>
                      <span className={styles.contradictionScore}>
                        Score: {(item.contradictionAlert.score * 100).toFixed(0)}%
                      </span>
                      <p className={styles.contradictionText}>{item.contradictionAlert.details}</p>
                    </div>
                  )}

                  {/* Entity ID */}
                  <div className={styles.entityId}>
                    Entity: <code>{item.entityId}</code>
                  </div>

                  {/* Actions */}
                  {item.status === "pending" && (
                    <div className={styles.actions}>
                      <button
                        className={styles.btnApprove}
                        disabled={resolving === item.id}
                        onClick={() => resolve(item.id, "resolved", "Reviewed and approved by moderator")}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className={styles.btnReject}
                        disabled={resolving === item.id}
                        onClick={() => resolve(item.id, "dismissed", "Rejected by moderator")}
                      >
                        ❌ Reject
                      </button>
                      <button
                        className={styles.btnReview}
                        disabled={resolving === item.id}
                        onClick={() => resolve(item.id, "in_review")}
                      >
                        👁 Mark In Review
                      </button>
                    </div>
                  )}
                  {item.status === "in_review" && (
                    <div className={styles.actions}>
                      <button className={styles.btnApprove} disabled={resolving === item.id}
                        onClick={() => resolve(item.id, "resolved", "Reviewed and approved")}>
                        ✅ Resolve
                      </button>
                      <button className={styles.btnReject} disabled={resolving === item.id}
                        onClick={() => resolve(item.id, "dismissed", "Dismissed after review")}>
                        ❌ Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>←</button>
              <span>{page + 1} / {data.pages}</span>
              <button className={styles.pageBtn} disabled={page >= data.pages - 1} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
