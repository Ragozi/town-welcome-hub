import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Instagram, Facebook, Mail } from "lucide-react";
import logoMark from "@/assets/brand/logo-mark.png";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-[var(--brand-charcoal)] text-[oklch(0.95_0.015_80)]">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link to="/" aria-label="Hearth Handbook home" className="inline-flex items-center gap-3">
              <img src={logoMark} alt="" width={40} height={40} className="h-10 w-10" />
              <span className="font-display text-2xl font-semibold tracking-wide text-white">
                Hearth Handbook
              </span>
            </Link>
            <p className="mt-3 brand-tagline !text-primary/90">Feel at home, from the start.</p>
            <p className="mt-4 text-sm text-white/70">
              A digital welcome mat for Wisconsin towns — meet the locals,
              grab a coupon, and feel at home.
            </p>
            <Button
              asChild
              className="mt-6 h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/sponsor">List your business</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/55">
                Explore
              </div>
              <ul className="space-y-2 text-white/85">
                <li><Link to="/about" className="hover:text-primary">About</Link></li>
                <li><Link to="/sponsor" className="hover:text-primary">Sponsor tiers</Link></li>
                <li><Link to="/login" className="hover:text-primary">Realtor login</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/55">
                Counties
              </div>
              <ul className="space-y-2 text-white/85">
                <li>Ozaukee</li>
                <li className="text-white/45">Milwaukee — soon</li>
                <li className="text-white/45">Washington — soon</li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/55">
                Contact
              </div>
              <ul className="space-y-2 text-white/85">
                <li>info@hearthhandbook.com</li>
                <li>Ozaukee County, WI</li>
                <li className="flex gap-3 pt-1">
                  <a href="#" aria-label="Instagram" className="hover:text-primary"><Instagram className="h-4 w-4" /></a>
                  <a href="#" aria-label="Facebook" className="hover:text-primary"><Facebook className="h-4 w-4" /></a>
                  <a href="mailto:info@hearthhandbook.com" aria-label="Email" className="hover:text-primary"><Mail className="h-4 w-4" /></a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/55 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Hearth Handbook. Built in Wisconsin.</div>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-primary">Privacy</Link>
            <Link to="/terms" className="hover:text-primary">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
