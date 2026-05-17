import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { DebugDrawerProvider } from "@/components/debug-lab/debug-drawer-provider";
import { DebugDrawer } from "@/components/debug-lab/debug-drawer";
import { DebugFab } from "@/components/debug-lab/debug-fab";

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
    <DebugDrawerProvider>
      <div className="space-y-6">
        <div>
          <p className="eyebrow">// Admin</p>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
            Operations
          </h1>
        </div>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-4 text-sm">
        <Link
          to="/admin"
          activeOptions={{ exact: true }}
          activeProps={{
            className:
              "!bg-gradient-to-br !from-orange-500 !via-amber-500 !to-rose-500 !text-white !border-transparent !shadow-[0_8px_24px_-6px_rgba(234,88,12,0.55)] !-translate-y-0.5",
          }}
          className="inline-flex items-center rounded-full border border-border bg-background/60 px-4 py-2 font-display font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-400/60 hover:bg-orange-50 hover:text-orange-700 hover:shadow-[0_6px_18px_-8px_rgba(234,88,12,0.45)] dark:hover:bg-orange-950/40 dark:hover:text-orange-200"
        >
          Overview
        </Link>
        <Link
          to="/admin/users"
          activeProps={{
            className:
              "!bg-gradient-to-r !from-rose-400 !via-fuchsia-500 !to-indigo-500 !text-white !border-transparent !shadow-[0_8px_24px_-6px_rgba(217,70,239,0.55)] !-translate-y-0.5",
          }}
          className="inline-flex items-center rounded-full border border-border bg-background/60 px-4 py-2 font-display font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-400/60 hover:bg-fuchsia-50 hover:text-fuchsia-700 hover:shadow-[0_6px_18px_-8px_rgba(217,70,239,0.45)] dark:hover:bg-fuchsia-950/40 dark:hover:text-fuchsia-200"
        >
          IAM
        </Link>
        <Link
          to="/admin/finance"
          activeProps={{
            className:
              "!bg-gradient-to-br !from-amber-400 !via-yellow-500 !to-orange-500 !text-white !border-transparent !shadow-[0_8px_24px_-6px_rgba(234,179,8,0.55)] !-translate-y-0.5",
          }}
          className="inline-flex items-center rounded-full border border-border bg-background/60 px-4 py-2 font-display font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-amber-50 hover:text-amber-700 hover:shadow-[0_6px_18px_-8px_rgba(234,179,8,0.45)] dark:hover:bg-amber-950/40 dark:hover:text-amber-200"
        >
          Financial Dashboard
        </Link>
        <Link
          to="/admin/events"
          activeProps={{
            className:
              "!bg-gradient-to-br !from-stone-700 !via-amber-800 !to-orange-700 !text-white !border-transparent !shadow-[0_8px_24px_-6px_rgba(120,53,15,0.55)] !-translate-y-0.5",
          }}
          className="inline-flex items-center rounded-full border border-border bg-background/60 px-4 py-2 font-display font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-700/60 hover:bg-amber-50 hover:text-amber-900 hover:shadow-[0_6px_18px_-8px_rgba(120,53,15,0.45)] dark:hover:bg-amber-950/40 dark:hover:text-amber-100"
        >
          Application Log
        </Link>
        <Link
          to="/admin/towns"
          activeProps={{
            className:
              "!bg-gradient-to-br !from-emerald-500 !via-teal-500 !to-cyan-500 !text-white !border-transparent !shadow-[0_8px_24px_-6px_rgba(16,185,129,0.55)] !-translate-y-0.5",
          }}
          className="inline-flex items-center rounded-full border border-border bg-background/60 px-4 py-2 font-display font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_6px_18px_-8px_rgba(16,185,129,0.45)] dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
        >
          Town Libraries
        </Link>
        <Link
          to="/admin/invite-codes"
          activeProps={{
            className:
              "!bg-gradient-to-r !from-pink-500 !via-rose-500 !to-orange-500 !text-white !border-transparent !shadow-[0_8px_24px_-6px_rgba(244,63,94,0.55)] !-translate-y-0.5",
          }}
          className="inline-flex items-center rounded-full border border-border bg-background/60 px-4 py-2 font-display font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-400/60 hover:bg-rose-50 hover:text-rose-700 hover:shadow-[0_6px_18px_-8px_rgba(244,63,94,0.45)] dark:hover:bg-rose-950/40 dark:hover:text-rose-200"
        >
          Invitations
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
