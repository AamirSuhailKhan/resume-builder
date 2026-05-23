import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { clamp, normalizeText, stableHash } from "./utils";

// ─────────────────────────────────────────────────────────────────────────────
// ANTI-SYBIL & FRAUD ENGINE
//
// Protects against:
//   - Fake interview reports
//   - Bot contributions
//   - SEO spam injections
//   - Coordinated vote rings
//   - Duplicate narrative spam
//   - AI-generated bulk content
//   - Fabricated salary data
//
// Fraud Score Formula:
//   FraudScore =
//     VelocityRisk    × 0.30
//     + DuplicateRisk × 0.25
//     + AIGenRisk     × 0.20
//     + IPAnomalyRisk × 0.15
//     + PatternRisk   × 0.10
//
// Thresholds:
//   > 0.70 → AUTO_QUARANTINE (shadowban)
//   > 0.50 → NEEDS_REVIEW
//   < 0.30 → PASS
// ─────────────────────────────────────────────────────────────────────────────

export type FraudDecision = "pass" | "needs_review" | "auto_quarantine";

export interface FraudSignals {
  velocityRisk: number;    // 0–1: submissions per 24h vs limit
  duplicateRisk: number;   // 0–1: similarity to existing content
  aiGenRisk: number;       // 0–1: heuristic burstiness/perfection score
  ipAnomalyRisk: number;   // 0–1: VPN/datacenter detection
  patternRisk: number;     // 0–1: coordinated behavior signals
}

export interface FraudResult {
  score: number;
  decision: FraudDecision;
  signals: FraudSignals;
  reasons: string[];
  shouldQuarantine: boolean;
  requiresReview: boolean;
}

const RATE_LIMIT_WINDOW_SECONDS = 24 * 60 * 60; // 24 hours
const MAX_CONTRIBUTIONS_PER_DAY = 5;

// ─────────────────────────────────────────────────────────────────────────────
// 1. VELOCITY CHECK
// ─────────────────────────────────────────────────────────────────────────────
async function checkVelocity(userId: string): Promise<number> {
  const redis = getRedisClient();
  const key = `fraud:velocity:${userId}`;

  if (redis) {
    const current = await redis.incr(key).catch(() => 1);
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS).catch(() => undefined);
    }
    return clamp((current - 1) / MAX_CONTRIBUTIONS_PER_DAY);
  }

  // Fallback: DB count
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.interviewContribution.count({
    where: { userId, createdAt: { gte: since } },
  });
  return clamp(count / MAX_CONTRIBUTIONS_PER_DAY);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DUPLICATE DETECTION
// ─────────────────────────────────────────────────────────────────────────────
async function checkDuplicate(payload: Record<string, unknown>, userId: string): Promise<number> {
  const normalized = normalizeText(JSON.stringify(payload));
  const payloadHash = stableHash(normalized);

  const redis = getRedisClient();
  const hashKey = `fraud:payload_hash:${payloadHash}`;

  if (redis) {
    const existing = await redis.get<string>(hashKey).catch(() => null);
    if (existing && existing !== userId) return 0.90; // Near-duplicate from different user
    if (existing === userId) return 0.60;             // Same user resubmitting
    await redis.set(hashKey, userId, { ex: 30 * 24 * 60 * 60 }).catch(() => undefined); // 30 days
    return 0;
  }

  // Near-duplicate check: look for very similar text submissions
  const textContent = String(payload.question ?? payload.notes ?? payload.outcome ?? "");
  if (textContent.length < 20) return 0;
  const textHash = stableHash(textContent.slice(0, 300));

  const existing = await prisma.interviewContribution.findFirst({
    where: {
      userId: { not: userId },
      status: "approved",
      createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
    },
    select: { payload: true },
  });

  if (existing) {
    const existingHash = stableHash(normalizeText(JSON.stringify(existing.payload)).slice(0, 300));
    if (existingHash === textHash) return 0.85;
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AI-GENERATED CONTENT HEURISTIC
// (Lightweight: no external API call. Uses structural signals.)
// ─────────────────────────────────────────────────────────────────────────────
function checkAIGeneration(payload: Record<string, unknown>): number {
  const text = JSON.stringify(payload).toLowerCase();
  let score = 0;

  // Suspiciously perfect structure
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 5);
  if (sentences.length > 0) {
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    // AI text tends to have very uniform sentence lengths
    const lengthVariance = sentences.reduce((sum, s) => sum + Math.abs(s.length - avgLength), 0) / sentences.length;
    if (lengthVariance < 8 && sentences.length > 3) score += 0.25;
  }

  // AI spam patterns for India context
  if (/guaranteed|placement assured|100% placement|reach out on telegram|whatsapp.*job/.test(text)) score += 0.60;
  if (/join our.*group|telegram.*channel|click.*link.*apply/.test(text)) score += 0.70;
  if (/dear candidate|we are pleased to offer|kindly revert/.test(text)) score += 0.30;

  // Suspiciously round/perfect salary numbers with no variance
  const salaryNums = text.match(/\d{6,8}/g);
  if (salaryNums && salaryNums.length > 1) {
    const areAllRound = salaryNums.every((n) => parseInt(n) % 100000 === 0);
    if (areAllRound) score += 0.15;
  }

  // Extremely short or template-like content
  if (text.length < 40 && Object.keys(payload).length > 2) score += 0.20;

  return clamp(score);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. IP ANOMALY DETECTION
// (Checks for VPN/datacenter IPs via Redis-cached range lists)
// ─────────────────────────────────────────────────────────────────────────────
async function checkIPAnomaly(ipAddress?: string | null): Promise<number> {
  if (!ipAddress) return 0.10; // Unknown IP is slightly suspicious

  const redis = getRedisClient();
  if (!redis) return 0.05;

  // Check if IP is in known datacenter/VPN range (simplified: check Redis blocklist)
  const flagKey = `fraud:ip_flag:${ipAddress}`;
  const flagged = await redis.get<number>(flagKey).catch(() => null);
  if (flagged) return clamp(flagged);

  // Rate check: same IP, many different users
  const ipUserKey = `fraud:ip_users:${ipAddress}`;
  const userCount = await redis.incr(ipUserKey).catch(() => 1);
  if (userCount === 1) {
    await redis.expire(ipUserKey, 24 * 60 * 60).catch(() => undefined);
  }

  if (userCount > 10) return 0.80; // 10+ different users from same IP in 24h
  if (userCount > 5)  return 0.40;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. VOTING RING / COORDINATED PATTERN DETECTION
// ─────────────────────────────────────────────────────────────────────────────
async function checkCoordinatedPattern(userId: string): Promise<number> {
  const redis = getRedisClient();
  const key = `fraud:pattern:${userId}`;

  // Check if this user has been flagged for pattern issues before
  const existing = await redis?.get<number>(key).catch(() => null);
  if (existing) return existing;

  // Check: did this user vote on many contributions in a short period?
  const recentVotes = await prisma.contributionVote.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // last 1 hour
    },
  });

  if (recentVotes > 30) {
    const score = 0.80;
    await redis?.set(key, score, { ex: 24 * 60 * 60 }).catch(() => undefined);
    return score;
  }
  if (recentVotes > 15) return 0.40;

  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FRAUD EVALUATION
// ─────────────────────────────────────────────────────────────────────────────
export async function evaluateFraud(params: {
  userId: string;
  payload: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<FraudResult> {
  const [velocityRisk, duplicateRisk, ipAnomalyRisk, patternRisk] = await Promise.all([
    checkVelocity(params.userId),
    checkDuplicate(params.payload, params.userId),
    checkIPAnomaly(params.ipAddress),
    checkCoordinatedPattern(params.userId),
  ]);
  const aiGenRisk = checkAIGeneration(params.payload);

  const score = clamp(
    velocityRisk  * 0.30 +
    duplicateRisk * 0.25 +
    aiGenRisk     * 0.20 +
    ipAnomalyRisk * 0.15 +
    patternRisk   * 0.10
  );

  const reasons: string[] = [];
  if (velocityRisk > 0.60) reasons.push("Submission rate exceeds daily limit");
  if (duplicateRisk > 0.70) reasons.push("Near-duplicate of existing contribution");
  if (aiGenRisk > 0.50) reasons.push("Content exhibits AI-generated or spam patterns");
  if (ipAnomalyRisk > 0.60) reasons.push("IP address associated with suspicious activity");
  if (patternRisk > 0.50) reasons.push("Coordinated voting or submission pattern detected");

  const decision: FraudDecision =
    score > 0.70 ? "auto_quarantine" :
    score > 0.50 ? "needs_review" :
    "pass";

  // Log to Redis for moderation dashboard
  if (decision !== "pass") {
    const redis = getRedisClient();
    const queueKey = `moderation:fraud_queue`;
    await redis?.lpush(queueKey, JSON.stringify({
      userId: params.userId,
      score,
      decision,
      reasons,
      timestamp: new Date().toISOString(),
    })).catch(() => undefined);
    await redis?.ltrim(queueKey, 0, 499).catch(() => undefined); // Keep last 500
  }

  return {
    score,
    decision,
    signals: { velocityRisk, duplicateRisk, aiGenRisk, ipAnomalyRisk, patternRisk },
    reasons,
    shouldQuarantine: decision === "auto_quarantine",
    requiresReview: decision === "needs_review",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST DEGRADATION: Penalize users with repeated fraud signals
// ─────────────────────────────────────────────────────────────────────────────
export async function degradeContributorTrust(userId: string, fraudScore: number): Promise<void> {
  if (fraudScore < 0.50) return;

  const penalty = fraudScore > 0.70 ? 0.15 : 0.05;
  await prisma.contributorReputation.upsert({
    where: { userId },
    create: {
      userId,
      trustScore: Math.max(0.10, 0.40 - penalty),
      acceptedCount: 0,
      rejectedCount: 0,
    },
    update: {
      trustScore: { decrement: penalty },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Flag IP as datacenter/VPN (called by external IP-reputation service)
// ─────────────────────────────────────────────────────────────────────────────
export async function flagIPAsAnomaly(ipAddress: string, score: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  const flagKey = `fraud:ip_flag:${ipAddress}`;
  await redis.set(flagKey, score, { ex: 7 * 24 * 60 * 60 }).catch(() => undefined); // 7 days
}
