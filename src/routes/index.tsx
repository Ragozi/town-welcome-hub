import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPrimary from "@/assets/brand/logo-primary.png";
import logoMark from "@/assets/brand/logo-mark.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hearth Handbook — Coming soon" },
      {
        name: "description",
        content:
          "Hearth Handbook is launching soon. A modern closing-gift toolkit for realtors.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Hearth Handbook — Coming soon" },
      {
        property: "og:description",
        content:
          "A modern closing-gift toolkit for realtors. Launching soon.",
      },
    ],
    links: [{ rel: "canonical", href: "https://hearthhandbook.com/" }],
  }),
  component: ComingSoon,
});

function ComingSoon() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoMark} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-lg font-semibold tracking-wide">
            Hearth Handbook
          </span>
        </div>
        <Link
          to="/login"
          className="text-sm font-semibold text-foreground/70 hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1 mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-5 py-16 text-center">
        <img
          src={logoPrimary}
          alt="Hearth Handbook — Feel at home, from the start."
          width={520}
          height={350}
          className="mb-10 h-auto w-full max-w-md"
        />
        <span className="eyebrow mb-4 rounded-full border border-foreground/15 bg-secondary px-4 py-1.5 text-foreground/70">
          Coming soon
        </span>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-wide text-foreground sm:text-5xl">
          Something warm is on the way.
        </h1>
        <p className="mt-6 max-w-lg text-base text-foreground/70">
          Hearth Handbook is a modern closing-gift toolkit for realtors —
          personalized welcome packets your buyers actually use. We're
          putting the finishing touches on it now.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-13 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[var(--shadow-cta)] hover:bg-primary/90"
          >
            <Link to="/login">
              Sign in <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-foreground/55">
          Approved realtors and team members can sign in with their account.
          For inquiries, email{" "}
          <a
            href="mailto:info@hearthhandbook.com"
            className="font-semibold text-foreground hover:text-primary"
          >
            info@hearthhandbook.com
          </a>
          .
        </p>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-8 text-center text-xs text-foreground/50">
        © {new Date().getFullYear()} Hearth Handbook
      </footer>
    </div>
  );
}
