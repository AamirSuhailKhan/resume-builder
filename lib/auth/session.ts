import { auth } from "@/auth";

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  return {
    id: userId,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
