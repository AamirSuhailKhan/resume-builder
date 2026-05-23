import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { createHash } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION TIERS
// Tier 0: Unverified         weight = 0.30  (basic payload check only)
// Tier 1: Email verified     weight = 0.65  (company domain email match)
// Tier 2: Document hash      weight = 0.85  (offer/joining letter hash)
// Tier 3: Peer corroborated  weight = 1.00  (3+ independent confirmations)
// ─────────────────────────────────────────────────────────────────────────────

export type VerificationTier = 0 | 1 | 2 | 3;

export interface VerificationResult {
  tier: VerificationTier;
  weight: number;
  method: string;
  notes: string[];
}

const TIER_WEIGHTS: Record<VerificationTier, number> = {
  0: 0.30,
  1: 0.65,
  2: 0.85,
  3: 1.00,
};

// Known company domain ↔ company name mappings (India market)
const COMPANY_DOMAINS: Record<string, string[]> = {
  "razorpay.com": ["razorpay"],
  "phonepe.com": ["phonepe"],
  "flipkart.com": ["flipkart"],
  "swiggy.in": ["swiggy"],
  "zomato.com": ["zomato"],
  "meesho.com": ["meesho"],
  "groww.in": ["groww"],
  "cred.club": ["cred"],
  "amazon.com": ["amazon", "amazon india"],
  "microsoft.com": ["microsoft", "microsoft india"],
  "google.com": ["google", "google india"],
  "zepto.com": ["zepto"],
  "paytm.com": ["paytm"],
  "urbancompany.com": ["urban company", "urbanclap"],
  "freshworks.com": ["freshworks"],
  "zoho.com": ["zoho"],
  "browserstack.com": ["browserstack"],
  "postman.com": ["postman"],
  "inmobi.com": ["inmobi"],
  "ola.com": ["ola"],
  "unacademy.com": ["unacademy"],
  "infosys.com": ["infosys"],
  "tcs.com": ["tcs", "tata consultancy"],
  "wipro.com": ["wipro"],
  "hcl.com": ["hcl"],
  "accenture.com": ["accenture"],
};

export class ContributionVerificationService {
  /**
   * Verify a contribution using the contributor's email.
   * Returns a VerificationResult with the achieved tier.
   */
  static async verifyByEmail(
    contributionId: string,
    userEmail: string,
    claimedCompany: string
  ): Promise<VerificationResult> {
    const notes: string[] = [];
    const emailDomain = userEmail.split("@")[1]?.toLowerCase() ?? "";
    const normalizedCompany = claimedCompany.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Check if email domain matches a known company
    const matchedCompanies = COMPANY_DOMAINS[emailDomain];
    const domainMatch = matchedCompanies?.some((name) =>
      normalizedCompany.includes(name.replace(/[^a-z0-9]/g, ""))
    ) ?? false;

    if (!domainMatch) {
      // Free-email domains are not verifiable
      const freeEmailDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "rediffmail.com"];
      if (freeEmailDomains.includes(emailDomain)) {
        notes.push("Free email domain — cannot verify company affiliation");
      } else {
        notes.push(`Email domain '${emailDomain}' not matched to '${claimedCompany}'`);
      }
      return { tier: 0, weight: TIER_WEIGHTS[0], method: "email_check_failed", notes };
    }

    notes.push(`Email domain '${emailDomain}' matched to '${claimedCompany}'`);

    // Mark the contribution as email-verified
    await this.recordVerification(contributionId, 1, "email_domain_match", notes);
    return { tier: 1, weight: TIER_WEIGHTS[1], method: "email_domain_match", notes };
  }

  /**
   * Verify via a document hash (offer letter, joining letter).
   * The actual document is never stored — only its hash.
   */
  static async verifyByDocumentHash(
    contributionId: string,
    documentContent: string // raw text extracted client-side; never stored
  ): Promise<VerificationResult> {
    const notes: string[] = [];
    if (!documentContent || documentContent.length < 50) {
      notes.push("Document content too short to verify");
      return { tier: 0, weight: TIER_WEIGHTS[0], method: "document_hash_failed", notes };
    }

    const documentHash = createHash("sha256").update(documentContent.slice(0, 2000)).digest("hex");

    // Check for duplicate document hashes (fraud prevention)
    const redis = getRedisClient();
    const hashKey = `verify:doc:${documentHash}`;
    if (redis) {
      const existing = await redis.get<string>(hashKey).catch(() => null);
      if (existing && existing !== contributionId) {
        notes.push("Document hash already used for another contribution — rejected");
        return { tier: 0, weight: TIER_WEIGHTS[0], method: "document_hash_duplicate", notes };
      }
      await redis.set(hashKey, contributionId, { ex: 60 * 60 * 24 * 365 }).catch(() => undefined); // 1 year
    }

    notes.push("Offer/joining letter hash accepted (document not stored)");
    await this.recordVerification(contributionId, 2, "document_hash", notes);
    return { tier: 2, weight: TIER_WEIGHTS[2], method: "document_hash", notes };
  }

  /**
   * Check if a contribution has been peer-corroborated by 3+ verified users.
   * Called after each vote to re-evaluate tier.
   */
  static async evaluatePeerCorroboration(contributionId: string): Promise<VerificationResult | null> {
    const votes = await prisma.contributionVote.findMany({
      where: { contributionId, type: "helpful" },
      include: {
        user: {
          include: { contributorReputation: true },
        },
      },
    });

    // Count votes from users with trust score >= 0.6
    const verifiedVotes = votes.filter((v) => (v.user.contributorReputation?.trustScore ?? 0) >= 0.6);
    if (verifiedVotes.length < 3) return null;

    const notes = [`Peer-corroborated by ${verifiedVotes.length} trusted contributors`];
    await this.recordVerification(contributionId, 3, "peer_corroboration", notes);
    return { tier: 3, weight: TIER_WEIGHTS[3], method: "peer_corroboration", notes };
  }

  /**
   * Get the current verification tier weight for a contribution.
   * Used when weighting evidence during score computation.
   */
  static async getWeight(contributionId: string): Promise<number> {
    const verification = await prisma.contributionVerification.findFirst({
      where: { contributionId },
      orderBy: { tier: "desc" },
      select: { tier: true },
    });
    const tier = (verification?.tier ?? 0) as VerificationTier;
    return TIER_WEIGHTS[tier];
  }

  private static async recordVerification(
    contributionId: string,
    tier: VerificationTier,
    method: string,
    notes: string[]
  ) {
    await prisma.contributionVerification.upsert({
      where: { contributionId },
      create: {
        contributionId,
        tier,
        method,
        notes,
        verifiedAt: new Date(),
      },
      update: {
        tier,
        method,
        notes,
        verifiedAt: new Date(),
      },
    });

    // Upgrade the contribution's trust delta based on tier
    await prisma.interviewContribution.update({
      where: { id: contributionId },
      data: {
        trustDelta: TIER_WEIGHTS[tier],
      },
    });
  }
}
