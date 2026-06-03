import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export interface AuditPayload {
  userId?: string;
  action: string;      // USER_LOGIN, PASSWORD_CHANGE, SENSITIVE_READ, EXPORT_DATA, DELETE_ACCOUNT, ROLE_CHANGE
  resource: string;    // USER, RESUME, PROFILE, PAYMENT, SECURITY
  details?: Record<string, any>;
  ipAddress?: string | null;
  status: "SUCCESS" | "FAILED";
}

export interface AlertPayload {
  userId?: string;
  type: string;        // RATE_LIMIT_EXCEEDED, BRUTE_FORCE, UNAUTHORIZED_ACCESS, SENSITIVE_EXPORT
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  details?: Record<string, any>;
  ipAddress?: string | null;
}

export class AuditService {
  /**
   * Logs a security audit trail item to DB and pino.
   */
  static async log(payload: AuditPayload): Promise<void> {
    try {
      const detailsJson = payload.details ? JSON.stringify(payload.details) : "{}";
      
      await prisma.auditLog.create({
        data: {
          userId: payload.userId || null,
          action: payload.action,
          resource: payload.resource,
          details: JSON.parse(detailsJson),
          ipAddress: payload.ipAddress || null,
          status: payload.status,
        },
      });

      logger.info(
        {
          userId: payload.userId,
          action: payload.action,
          resource: payload.resource,
          status: payload.status,
          ip: payload.ipAddress,
        },
        `[AUDIT] Action ${payload.action} on ${payload.resource} status ${payload.status}`
      );
    } catch (err) {
      logger.error({ err, payload }, "Failed to write audit log to database");
    }
  }

  /**
   * Triggers a security alert/incident.
   */
  static async alert(payload: AlertPayload): Promise<void> {
    try {
      const detailsJson = payload.details ? JSON.stringify(payload.details) : "{}";

      await prisma.securityAlert.create({
        data: {
          userId: payload.userId || null,
          type: payload.type,
          severity: payload.severity,
          description: payload.description,
          details: JSON.parse(detailsJson),
          ipAddress: payload.ipAddress || null,
          status: "OPEN",
        },
      });

      logger.warn(
        {
          userId: payload.userId,
          type: payload.type,
          severity: payload.severity,
          ip: payload.ipAddress,
        },
        `[SECURITY ALERT] [${payload.severity}] ${payload.description}`
      );

      // If high or critical severity, trigger internal Slack/WebHook/Email notifications
      if (payload.severity === "HIGH" || payload.severity === "CRITICAL") {
        logger.error(`[SOC2 CRITICAL TRIGGER] Security alert raised: ${payload.description}`);
      }
    } catch (err) {
      logger.error({ err, payload }, "Failed to raise security alert in database");
    }
  }

  /**
   * GDPR Data Portability: Export all data associated with a user.
   */
  static async exportUserData(userId: string): Promise<Record<string, any>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        resumes: true,
        jobs: true,
        applications: true,
        interviewSessions: true,
        networkContacts: true,
        recruiters: true,
        careerProfile: true,
        wellbeingCheckIns: true,
      },
    });

    if (!user) throw new Error("User not found");

    // Redact password hash
    const { passwordHash, ...safeUserData } = user;

    await this.log({
      userId,
      action: "EXPORT_DATA",
      resource: "USER",
      status: "SUCCESS",
      details: { format: "json" },
    });

    return safeUserData;
  }

  /**
   * GDPR Erasure ("Right to be Forgotten"): Wipes user profile, deletes/anonymises PII.
   */
  static async deleteUserAccount(userId: string, ipAddress?: string | null): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // Delete related records or wipe user PII
    await prisma.$transaction([
      // Delete resumes, applications, contacts, etc.
      prisma.resume.deleteMany({ where: { userId } }),
      prisma.application.deleteMany({ where: { userId } }),
      prisma.networkContact.deleteMany({ where: { userId } }),
      prisma.recruiter.deleteMany({ where: { userId } }),
      prisma.wellbeingCheckIn.deleteMany({ where: { userId } }),
      
      // Update User table to remove PII (Anonymise)
      prisma.user.update({
        where: { id: userId },
        data: {
          name: "Anonymised User",
          email: `deleted_${userId}@anonymised.career-os.com`,
          passwordHash: null,
          image: null,
          plan: "free",
        },
      }),
    ]);

    await this.log({
      userId,
      action: "DELETE_ACCOUNT",
      resource: "USER",
      status: "SUCCESS",
      ipAddress: ipAddress ?? null,
      details: { method: "gdpr_erasure_wipe" },
    });
  }
}
