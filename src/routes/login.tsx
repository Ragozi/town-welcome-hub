import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, KeyRound, ChevronDown } from "lucide-react";

type LoginSearch = { code?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Realtor sign in — Hearth Handbook" },
      { name: "description", content: "Sign in to Hearth Handbook to build personalized welcome packets and QR closing cards for your buyers." },
      { property: "og:title", content: "Realtor sign in — Hearth Handbook" },
      { property: "og:description", content: "Sign in to build welcome packets for your buyers." },
      { property: "og:url", content: "https://hearthhandbook.com/login" },
    ],
    links: [{ rel: "canonical", href: "https://hearthhandbook.com/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUpWithCode, session, role, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Realtor invite code
  const [showInvite, setShowInvite] = useState(!!search.code);
  const [inviteCode, setInviteCode] = useState((search.code ?? "").toUpperCase());
  const [codeValid, setCodeValid] = useState(false);
  const [validating, setValidating] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  useEffect(() => {
    if (loading || !session) return;
    if (role === "super_admin" || role === "realtor_admin") navigate({ to: "/admin" });
    else if (role === "realtor_agent") navigate({ to: "/dashboard" });
  }, [session, role, loading, navigate]);

  useEffect(() => {
    if (search.code) void validateCode(search.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateCode = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setValidating(true);
    const { data, error } = await supabase.rpc("validate_invite_code", { _code: code });
    setValidating(false);
    if (error || !data) {
      setCodeValid(false);
      toast.error("Invalid, expired, or already-used invite code.");
      return;
    }
    setCodeValid(true);
    setInviteCode(code);
    toast.success("Invite code accepted. Create your realtor account below.");
  };

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) toast.error(error);
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeValid) return toast.error("Validate your invite code first.");
    setSubmitting(true);
    const { error } = await signUpWithCode(signupEmail.trim(), signupPassword, signupName.trim(), inviteCode);
    setSubmitting(false);
    if (error) return toast.error(error);
    toast.success("Check your email to verify your account.");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
        <Link to="/" className="font-display mb-10 text-center text-xl font-extrabold tracking-tight">
          HEARTH HANDBOOK<span className="text-primary">.</span>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            Realtor sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Build personalized welcome packets for your buyers.
          </p>

          <form onSubmit={onSignIn} className="mt-6 space-y-4" suppressHydrationWarning>
            <div suppressHydrationWarning>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11 rounded-xl"
              />
            </div>
            <div suppressHydrationWarning>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          {/* Realtor invite-code gate */}
          <div className="mt-6 border-t border-border pt-5">
            <button
              type="button"
              onClick={() => setShowInvite((v) => !v)}
              className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground/80 hover:text-foreground"
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                I'm a new realtor with an invite code
              </span>
              <ChevronDown className={`h-4 w-4 transition ${showInvite ? "rotate-180" : ""}`} />
            </button>

            {showInvite && (
              <div className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="WH-XXXXXX"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value.toUpperCase());
                      setCodeValid(false);
                    }}
                    className="h-11 rounded-xl font-mono uppercase tracking-wider"
                    disabled={codeValid}
                  />
                  <Button
                    type="button"
                    onClick={() => validateCode(inviteCode)}
                    disabled={validating || codeValid || !inviteCode}
                    className="h-11 rounded-xl"
                  >
                    {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : codeValid ? "✓" : "Verify"}
                  </Button>
                </div>

                {codeValid && (
                  <form onSubmit={onSignUp} className="space-y-3" suppressHydrationWarning>
                    <div suppressHydrationWarning>
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input
                        id="signup-name"
                        required
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="mt-1.5 h-11 rounded-xl"
                      />
                    </div>
                    <div suppressHydrationWarning>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="mt-1.5 h-11 rounded-xl"
                      />
                    </div>
                    <div suppressHydrationWarning>
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        required
                        minLength={8}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="mt-1.5 h-11 rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create realtor account"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>

        <Link to="/" className="mt-4 text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
