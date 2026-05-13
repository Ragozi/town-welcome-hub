import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-foreground">
          HEARTH HANDBOOK<span className="text-primary">.</span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-medium uppercase tracking-wider text-foreground/75 md:flex">
          <Link to="/" className="hover:text-foreground" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/about" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            About
          </Link>
          <Link to="/sponsor" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Sponsor</Link>
          <Link to="/login" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Realtor Login
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden h-10 rounded-full px-4 text-foreground/75 hover:text-foreground md:inline-flex"
          >
            <Link to="/login">Sign in</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="h-10 rounded-full bg-foreground px-5 text-background hover:bg-foreground/90"
          >
            <Link to="/sponsor" className="inline-flex items-center gap-2">
              Get Listed
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
