import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTowns, resolveTown } from "@/lib/towns";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TownWelcome — Your local Wisconsin town guide" },
      {
        name: "description",
        content:
          "Discover restaurants, shops, services, and local favorites in your Wisconsin town. Auto-detects your location.",
      },
      { property: "og:title", content: "TownWelcome — Your local Wisconsin town guide" },
      {
        property: "og:description",
        content:
          "Discover restaurants, shops, services, and local favorites in your Wisconsin town.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [locating, setLocating] = useState(false);
  const [zip, setZip] = useState("");
  const [manualSlug, setManualSlug] = useState("");

  const towns = useQuery({ queryKey: ["towns"], queryFn: listTowns });

  const goTo = (slug: string) =>
    navigate({ to: "/$townSlug", params: { townSlug: slug } });

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const match = await resolveTown({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          if (match) {
            goTo(match.slug);
          } else {
            toast.message("We couldn't find a TownWelcome page near you yet.", {
              description: "Pick a town below to keep exploring.",
            });
            setLocating(false);
          }
        } catch (e) {
          console.error(e);
          toast.error("Something went wrong locating your town.");
          setLocating(false);
        }
      },
      (err) => {
        console.warn(err);
        toast.error("Location permission denied.", {
          description: "Use the dropdown or ZIP search below.",
        });
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  // Auto-prompt on first load? Keep manual to respect user choice.
  useEffect(() => {
    /* no-op */
  }, []);

  const findByZip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      toast.error("Please enter a 5-digit ZIP code.");
      return;
    }
    const match = await resolveTown({ zip });
    if (match) goTo(match.slug);
    else toast.error("No TownWelcome page for that ZIP yet.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="font-semibold tracking-tight text-lg">
          <span className="text-primary">Town</span>Welcome
        </div>
        <span className="text-xs text-muted-foreground hidden sm:block">
          Wisconsin
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-xl w-full text-center space-y-8 py-12">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-widest text-primary/70">
              Welcome home
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
              Discover everything your town has to offer.
            </h1>
            <p className="text-muted-foreground">
              Tap below and we'll show you sponsored locals, restaurants,
              services, and coupons near you.
            </p>
          </div>

          <Button
            size="lg"
            onClick={useMyLocation}
            disabled={locating}
            className="h-14 px-8 text-base rounded-full shadow-lg"
          >
            {locating ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-5 w-5" />
            )}
            {locating ? "Finding your town…" : "Use my location"}
          </Button>

          <div className="pt-6 space-y-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Or pick manually
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Select
                value={manualSlug}
                onValueChange={(v) => {
                  setManualSlug(v);
                  goTo(v);
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose a town" />
                </SelectTrigger>
                <SelectContent>
                  {(towns.data ?? []).map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <form onSubmit={findByZip} className="flex gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="ZIP code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                  className="h-12"
                />
                <Button type="submit" variant="secondary" className="h-12">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        TownWelcome · Ozaukee County, Wisconsin ·{" "}
        <Link to="/" className="underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
