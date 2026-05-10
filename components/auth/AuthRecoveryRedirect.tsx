"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";

export function AuthRecoveryRedirect() {
  const isRecovering = useRef(false);

  useEffect(() => {
    if (isRecovering.current) return;
    isRecovering.current = true;

    // Gracefully clear the invalid session on the client side and redirect to login
    // with the SessionExpired parameter so the UI can show the recovery message.
    signOut({ callbackUrl: "/login?error=SessionExpired", redirect: true });
  }, []);

  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Reconnecting workspace...
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Your secure session expired after a system update. We are safely redirecting you to log back in.
      </p>
    </div>
  );
}
