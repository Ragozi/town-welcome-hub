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

export type Role = "super_admin" | "realtor_admin" | "realtor_agent" | "sponsor_user" | null;

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isRealtor: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithCode: (
    email: string,
    password: string,
    fullName: string,
    inviteCode: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function pickRole(roles: string[]): Role {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("realtor_admin")) return "realtor_admin";
  if (roles.includes("realtor_agent")) return "realtor_agent";
  if (roles.includes("sponsor_user")) return "sponsor_user";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((prof as Profile) ?? null);
    setRole(pickRole((roles ?? []).map((r: { role: string }) => r.role)));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          loadProfile(s.user.id);
        }, 0);
      } else {
        setProfile(null);
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
    role,
    isAdmin: role === "super_admin" || role === "realtor_admin",
    isSuperAdmin: role === "super_admin",
    isRealtor: role === "realtor_agent" || role === "realtor_admin" || role === "super_admin",
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
