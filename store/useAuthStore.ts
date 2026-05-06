"use client";

import { create } from "zustand";
import { signIn, signOut, useSession } from "next-auth/react";

type ClientUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

interface AuthStore {
  error: string | null;
  clearError: () => void;
  setError: (error: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  error: null,

  clearError: () => set({ error: null }),
  setError: (error) => set({ error }),

  signInWithGoogle: async () => {
    set({ error: null });
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("[AUTH CLIENT] Google sign-in failed", error);
      set({ error: "Google sign-in is unavailable. Check Google OAuth environment variables." });
    }
  },

  signInWithCredentials: async (email, password) => {
    set({ error: null });
    let result;
    try {
      result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("[AUTH CLIENT] Credentials sign-in failed", error);
      set({ error: "Unable to reach the auth server. Please try again." });
      return false;
    }

    if (result?.error || result?.ok === false) {
      set({ error: "Invalid email or password." });
      return false;
    }

    return true;
  },

  signOut: async () => {
    set({ error: null });
    await signOut({ callbackUrl: "/login" });
    const mod = await import("@/store/useResumeStore");
    mod.useResumeStore.getState().reset();
  },
}));

export function useSessionUser() {
  const { data, status } = useSession();
  return {
    user: (data?.user ?? null) as ClientUser | null,
    loading: status === "loading",
  };
}

export const selectAuthError = (s: AuthStore) => s.error;
export const selectSignIn = (s: AuthStore) => s.signInWithGoogle;
export const selectSignInWithCredentials = (s: AuthStore) => s.signInWithCredentials;
export const selectSignOut = (s: AuthStore) => s.signOut;
export const selectClearAuthError = (s: AuthStore) => s.clearError;

export const selectUser = () => null;
export const selectAuthLoading = () => false;
export const selectIsSignedIn = () => false;
export const selectInitialize = () => async () => {};
