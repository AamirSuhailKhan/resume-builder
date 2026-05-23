"use client";

import React from "react";
import styles from "./RoundIntelligenceCard.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// RoundIntelligenceCard
// Displays per-round data: type, duration, difficulty, top topics, pass rate.
// Consumes data from getCompanyTerminal() → experiences → rounds
// ─────────────────────────────────────────────────────────────────────────────

export interface RoundData {
  roundNumber: number;
  type: string;          // "Online Assessment" | "Machine Coding" | "DSA" | "System Design" | "HR"
  title: string;
  durationMinutes?: number | null;
  difficulty: string;    // "easy" | "medium" | "hard" | "expert" | "unknown"
  topics: string[];      // most-asked topics in this round
  passRate?: number | null; // 0-1, from selection patterns
  tipCount: number;       // number of experience reports for this round
  signals?: string[];     // key signals reported by candidates
}

interface RoundIntelligenceCardProps {
  round: RoundData;
  index: number;
  companyName: string;
}

const DIFFICULTY_LABEL: Record<string, { label: string; color: string }> = {
  easy:    { label: "Easy",    color: "#22c55e" },
  medium:  { label: "Medium",  color: "#f59e0b" },
  hard:    { label: "Hard",    color: "#ef4444" },
  expert:  { label: "Expert",  color: "#9333ea" },
  unknown: { label: "Varies",  color: "#6b7280" },
};

const ROUND_ICON: Record<string, string> = {
  "online assessment": "📝",
  "machine coding":    "💻",
  "dsa":               "🔢",
  "technical":         "⚙️",
  "system design":     "🏗️",
  "hld":               "🏗️",
  "lld":               "🧩",
  "behavioral":        "🧠",
  "hr":                "🤝",
  "hiring manager":    "👔",
  "bar raiser":        "⚖️",
  "founders":          "🚀",
};

function getRoundIcon(type: string): string {
  const normalized = type.toLowerCase();
  for (const [key, icon] of Object.entries(ROUND_ICON)) {
    if (normalized.includes(key)) return icon;
  }
  return "📋";
}

export function RoundIntelligenceCard({ round, index, companyName }: RoundIntelligenceCardProps) {
  const difficultyInfo = DIFFICULTY_LABEL[round.difficulty] ?? DIFFICULTY_LABEL["unknown"]!;
  const icon = getRoundIcon(round.type);
  const passPercent = round.passRate != null ? Math.round(round.passRate * 100) : null;

  return (
    <div className={styles.card} style={{ animationDelay: `${index * 80}ms` }}>
      {/* Round number badge */}
      <div className={styles.roundBadge}>
        <span className={styles.roundNumber}>R{round.roundNumber}</span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{round.title}</h3>
          <span className={styles.type}>{round.type}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        {round.durationMinutes && (
          <div className={styles.stat}>
            <span className={styles.statIcon}>⏱</span>
            <span className={styles.statValue}>{round.durationMinutes}m</span>
          </div>
        )}
        <div className={styles.stat}>
          <span
            className={styles.difficultyDot}
            style={{ background: difficultyInfo.color }}
          />
          <span className={styles.statValue} style={{ color: difficultyInfo.color }}>
            {difficultyInfo.label}
          </span>
        </div>
        {passPercent !== null && (
          <div className={styles.stat}>
            <span className={styles.statIcon}>✅</span>
            <span className={styles.statValue}>{passPercent}% pass</span>
          </div>
        )}
        {round.tipCount > 0 && (
          <div className={styles.stat}>
            <span className={styles.statIcon}>👥</span>
            <span className={styles.statValue}>{round.tipCount} reports</span>
          </div>
        )}
      </div>

      {/* Top topics */}
      {round.topics.length > 0 && (
        <div className={styles.topics}>
          {round.topics.slice(0, 5).map((topic) => (
            <span key={topic} className={styles.topicTag}>
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Key signals */}
      {round.signals && round.signals.length > 0 && (
        <div className={styles.signals}>
          {round.signals.slice(0, 3).map((signal, i) => (
            <div key={i} className={styles.signal}>
              <span className={styles.signalDot}>›</span>
              <span>{signal}</span>
            </div>
          ))}
        </div>
      )}

      {/* India-specific context pill */}
      <div className={styles.indiaPill}>
        🇮🇳 India-verified intel
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RoundIntelligenceList
// Wraps multiple cards with section header
// ─────────────────────────────────────────────────────────────────────────────

interface RoundIntelligenceListProps {
  rounds: RoundData[];
  companyName: string;
}

export function RoundIntelligenceList({ rounds, companyName }: RoundIntelligenceListProps) {
  if (rounds.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          🎯 Round-by-Round Intelligence
        </h2>
        <p className={styles.sectionSubtitle}>
          Based on verified candidate reports for {companyName} India
        </p>
      </div>
      <div className={styles.grid}>
        {rounds.map((round, i) => (
          <RoundIntelligenceCard
            key={round.roundNumber}
            round={round}
            index={i}
            companyName={companyName}
          />
        ))}
      </div>
    </section>
  );
}
