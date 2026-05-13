import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, BarChart3, Users, ScrollText, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">// Admin</p>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
          Operations
        </h1>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-3 text-sm font-medium">
        <Link
          to="/admin"
          activeOptions={{ exact: true }}
          activeProps={{ className: "bg-foreground text-background" }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 hover:bg-foreground/5"
        >
          <BarChart3 className="h-4 w-4" /> Overview
        </Link>
        <Link
          to="/admin/realtors"
          activeProps={{ className: "bg-foreground text-background" }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 hover:bg-foreground/5"
        >
          <Users className="h-4 w-4" /> Realtors
        </Link>
        <Link
          to="/admin/events"
          activeProps={{ className: "bg-foreground text-background" }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 hover:bg-foreground/5"
        >
          <ScrollText className="h-4 w-4" /> Event log
        </Link>
        <Link
          to="/admin/invite-codes"
          activeProps={{ className: "bg-foreground text-background" }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 hover:bg-foreground/5"
        >
          <KeyRound className="h-4 w-4" /> Invite codes
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
