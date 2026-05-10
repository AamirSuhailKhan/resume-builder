import { prisma } from "@/lib/db/prisma";
import { AuthConsistencyError } from "@/lib/errors/auth-errors";

/**
 * Validates that a user ID from a session still exists in the database.
 * This acts as the boundary validation for domain operations to prevent
 * orphaned sessions from attempting mutations after a DB wipe.
 */
export async function requireUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AuthConsistencyError(
      `User session exists but database user (id: ${userId}) is missing. Session is stale.`
    );
  }

  return user;
}
