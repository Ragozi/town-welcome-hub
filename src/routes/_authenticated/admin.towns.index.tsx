import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListTowns } from "@/lib/scraped.functions";
import { Loader2, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/towns/")({
  component: TownLibrariesIndex,
});

function TownLibrariesIndex() {
  const fetchTowns = useServerFn(adminListTowns);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-towns"],
    queryFn: () => fetchTowns(),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">// Town Libraries</p>
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          Scraped business libraries
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a town to scrape, review, and promote businesses for handbooks.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((t) => (
          <Link
            key={t.id}
            to="/admin/towns/$slug/library"
            params={{ slug: t.slug }}
            className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-lg font-extrabold uppercase tracking-tight">
                  {t.name}
                </p>
                <p className="text-xs text-muted-foreground">{t.state}</p>
              </div>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                Pending {t.counts.pending}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                Included {t.counts.included}
              </span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-800">
                Excluded {t.counts.excluded}
              </span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                Sponsor {t.counts.promoted}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
