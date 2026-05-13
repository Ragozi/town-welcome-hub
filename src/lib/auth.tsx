import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email_public: string | null;
  phone: string | null;
  headshot_url: string | null;
  brokerage_name: string | null;
  brokerage_logo_url: string | null;
  social_links: Record<string, string>;
  default_town_id: string | null;
  thank_you_message: string | null;
};

export type SubscriberProfile = {
  id: string;
  user_id: string;
  home_town_id: string | null;
  interest_tags: string[];
  lifestyle_tags: string[];
  has_kids: boolean;
  has_pets: boolean;
  onboarded_at: string | null;
};

export type Role = "admin" | "realtor" | "subscriber" | null;

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  subscriberProfile: SubscriberProfile | null;
  role: Role;
  isAdmin: boolean;
  isRealtor: boolean;
  isSubscriber: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithCode: (
    email: string,
    password: string,
    fullName: string,
    inviteCode: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: (inviteCode?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function pickRole(roles: string[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("realtor")) return "realtor";
  if (roles.includes("subscriber")) return "subscriber";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriberProfile, setSubscriberProfile] = useState<SubscriberProfile | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const [{ data: prof }, { data: roles }, { data: subProf }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("subscriber_profiles").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile((prof as Profile) ?? null);
    setSubscriberProfile((subProf as SubscriberProfile) ?? null);
    setRole(pickRole((roles ?? []).map((r: { role: string }) => r.role)));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          // Realtor invite-code claim (Google OAuth flow)
          const pending = typeof window !== "undefined" ? sessionStorage.getItem("pending_invite_code") : null;
          if (pending) {
            sessionStorage.removeItem("pending_invite_code");
            try {
              await supabase.rpc("claim_invite_code", { _code: pending });
            } catch {
              // ignore
            }
          }
          loadProfile(s.user.id);
        }, 0);
      } else {
        setProfile(null);
        setSubscriberProfile(null);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    profile,
    subscriberProfile,
    role,
    isAdmin: role === "admin",
    isRealtor: role === "realtor" || role === "admin",
    isSubscriber: role === "subscriber",
    loading,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signUpWithCode: async (email, password, fullName, inviteCode) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName, invite_code: inviteCode.trim().toUpperCase() },
        },
      });
      return { error: error?.message ?? null };
    },
    signInWithGoogle: async (inviteCode) => {
      const { lovable } = await import("@/integrations/lovable/index");
      const extraParams: Record<string, string> = { prompt: "select_account" };
      if (inviteCode) {
        extraParams.invite_code = inviteCode.trim().toUpperCase();
        if (typeof window !== "undefined") {
          sessionStorage.setItem("pending_invite_code", inviteCode.trim().toUpperCase());
        }
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams,
      });
      if (result.error) {
        const msg = result.error instanceof Error ? result.error.message : String(result.error);
        return { error: msg };
      }
      return { error: null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
