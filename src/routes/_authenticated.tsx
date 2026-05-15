import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, LayoutDashboard, FilePlus2, Settings, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoHorizontal from "@/assets/brand/logo-horizontal.png";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { loading, session, profile, isAdmin, isRealtor, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

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

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" aria-label="Hearth Handbook home" className="inline-flex items-center">
              <img src={logoHorizontal} alt="Hearth Handbook" width={150} height={36} className="h-9 w-auto" />
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 md:flex">
              {isRealtor && (
                <>
                  <Link to="/dashboard" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                    <span className="inline-flex items-center gap-1.5"><LayoutDashboard className="h-4 w-4" /> Dashboard</span>
                  </Link>
                  <Link to="/packets/new" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                    <span className="inline-flex items-center gap-1.5"><FilePlus2 className="h-4 w-4" /> New Handbook</span>
                  </Link>
                  <Link to="/settings" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                    <span className="inline-flex items-center gap-1.5"><Settings className="h-4 w-4" /> Branding</span>
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
