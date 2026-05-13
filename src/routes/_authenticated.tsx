import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, LayoutDashboard, FilePlus2, Settings, LogOut, Shield, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { loading, session, profile, role, isAdmin, isRealtor, isSubscriber, subscriberProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  // Subscribers should not access realtor pages
  useEffect(() => {
    if (loading || !session || !role) return;
    const path = location.pathname;
    const isRealtorArea =
      path.startsWith("/dashboard") ||
      path.startsWith("/packets") ||
      path.startsWith("/settings") ||
      path.startsWith("/admin");
    const isSubscriberArea = path.startsWith("/me");
    if (isSubscriber && isRealtorArea) navigate({ to: "/me" });
    else if (isRealtor && isSubscriberArea) navigate({ to: "/dashboard" });

    // First-time subscriber → onboarding
    if (isSubscriber && subscriberProfile && !subscriberProfile.onboarded_at && path !== "/me/welcome") {
      navigate({ to: "/me/welcome" });
    }
  }, [loading, session, role, isSubscriber, isRealtor, subscriberProfile, location.pathname, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = (profile?.full_name ?? session.user.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const homeLink = isSubscriber ? "/me" : "/dashboard";

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-8">
            <Link to={homeLink} className="font-display text-lg font-extrabold tracking-tight">
              WELCOME HOME<span className="text-primary">.</span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 md:flex">
              {isRealtor && (
                <>
                  <Link to="/dashboard" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                    <span className="inline-flex items-center gap-1.5"><LayoutDashboard className="h-4 w-4" /> Dashboard</span>
                  </Link>
                  <Link to="/packets/new" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                    <span className="inline-flex items-center gap-1.5"><FilePlus2 className="h-4 w-4" /> New packet</span>
                  </Link>
                  <Link to="/settings" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                    <span className="inline-flex items-center gap-1.5"><Settings className="h-4 w-4" /> Branding</span>
                  </Link>
                </>
              )}
              {isSubscriber && (
                <>
                  <Link to="/me" className="hover:text-foreground" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>
                    <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> My town</span>
                  </Link>
                  <Link to="/me/saved" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                    <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4" /> Saved</span>
                  </Link>
                  <Link to="/me/settings" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                    <span className="inline-flex items-center gap-1.5"><Settings className="h-4 w-4" /> Preferences</span>
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link to="/admin" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                  <span className="inline-flex items-center gap-1.5 text-[color:var(--wi-cranberry)]"><Shield className="h-4 w-4" /> Admin</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium leading-tight">{profile?.full_name ?? session.user.email}</p>
              {isRealtor && profile?.brokerage_name && (
                <p className="text-xs text-muted-foreground">{profile.brokerage_name}</p>
              )}
              {isSubscriber && (
                <p className="text-xs text-muted-foreground">Member</p>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-foreground text-xs font-semibold uppercase text-background">
              {profile?.headshot_url ? (
                <img src={profile.headshot_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <Outlet />
      </main>
    </div>
  );
}
