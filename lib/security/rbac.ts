export type UserRole = "USER" | "MANAGER" | "ADMIN";
export type SubscriptionPlan = "free" | "pro" | "enterprise";

export interface UserContext {
  id: string;
  role: string;
  plan: SubscriptionPlan;
}

export type SecurityAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "export"
  | "bypass_limits";

export type SecurityResource =
  | "resume"
  | "application"
  | "profile"
  | "system_settings"
  | "audit_logs"
  | "recruiter_intelligence"
  | "premium_features";

const ROLE_PERMISSIONS: Record<string, Partial<Record<SecurityResource, SecurityAction[]>>> = {
  USER: {
    resume: ["create", "read", "update", "delete"],
    application: ["create", "read", "update", "delete"],
    profile: ["create", "read", "update"],
    recruiter_intelligence: ["read"],
  },
  MANAGER: {
    resume: ["create", "read", "update"],
    application: ["create", "read", "update"],
    profile: ["create", "read", "update"],
    recruiter_intelligence: ["create", "read", "update"],
    audit_logs: ["read"],
  },
  ADMIN: {
    resume: ["create", "read", "update", "delete", "export"],
    application: ["create", "read", "update", "delete", "export"],
    profile: ["create", "read", "update", "delete"],
    recruiter_intelligence: ["create", "read", "update", "delete"],
    audit_logs: ["read", "update", "delete"],
    system_settings: ["create", "read", "update", "delete"],
    premium_features: ["bypass_limits"],
  },
};

/**
 * Checks whether a user meets both RBAC (role mappings) and ABAC (resource owner / plan restrictions) rules.
 */
export function checkPermission(
  user: UserContext,
  action: SecurityAction,
  resource: SecurityResource,
  targetOwnerId?: string
): { allowed: boolean; reason?: string } {
  // 1. RBAC Check: Ensure the user's role has permission for this resource/action
  const roleRules = ROLE_PERMISSIONS[user.role.toUpperCase()] || ROLE_PERMISSIONS.USER;
  const allowedActions = roleRules?.[resource];

  if (!allowedActions || !allowedActions.includes(action)) {
    return {
      allowed: false,
      reason: `Role ${user.role} does not have permission to perform ${action} on ${resource}`,
    };
  }

  // 2. ABAC Check: Attribute-Based Restrictions
  
  // Rule A: Owner check (Users can only read/update/delete their own resources unless ADMIN)
  if (user.role !== "ADMIN" && targetOwnerId && targetOwnerId !== user.id) {
    return {
      allowed: false,
      reason: `Unauthorized: You do not own this ${resource}`,
    };
  }

  // Rule B: Subscription limit controls (Access to advanced recruiter intel / auto planner requires pro or enterprise plan)
  if (resource === "recruiter_intelligence" && action === "create" && user.plan === "free") {
    return {
      allowed: false,
      reason: "Subscription limit: Recruiter intelligence creation requires a Pro or Enterprise plan.",
    };
  }

  return { allowed: true };
}
