import Link from "next/link";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

/** Large logo for the signed-out pages (landing, sign in, sign up). */
export function BrandLogo({ className }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 font-black tracking-tight", className)} aria-label="CineYellow home">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_30px] shadow-primary/50 sm:size-11">
        <Play className="size-5 fill-current" />
      </span>
      <span className="text-2xl sm:text-3xl">
        Cine<span className="text-primary">Yellow</span>
      </span>
    </Link>
  );
}

const footerLinks = [
  { label: "FAQ", href: "/welcome#faq" },
  { label: "Help Center", href: "/help" },
  { label: "Contact Us", href: "/help#contact" },
  { label: "Sign In", href: "/login" },
];

/** Footer band for the signed-out pages. */
export function MarketingFooter({ className }) {
  return (
    <footer className={cn("relative z-10 border-t border-white/10 bg-black/80 px-5 py-10 text-sm text-white/60 sm:px-10 lg:px-36", className)}>
      <p className="mb-6">
        Questions?{" "}
        <Link href="/help#contact" className="underline-offset-2 hover:underline">
          Contact us.
        </Link>
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {footerLinks.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="underline-offset-2 hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-white/40">© 2026 CineYellow</p>
    </footer>
  );
}
