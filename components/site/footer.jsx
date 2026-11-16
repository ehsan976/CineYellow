import Link from "next/link";

import { Logo } from "@/components/site/logo";
import { Separator } from "@/components/ui/separator";

const columns = [
  ["Browse", [["Home", "/"], ["Movies", "/movies"], ["Series", "/series"], ["Anime", "/anime"], ["My List", "/my-list"]]],
  ["Help", ["Account", "Help Center", "Devices", "Contact Us"]],
  ["Company", ["About", "Careers", "Press", "Gift Cards"]],
  ["Legal", ["Privacy", "Terms of Use", "Cookie Preferences"]],
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-black/40">
      <div className="mx-auto max-w-[1600px] px-4 py-12 md:px-10">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Movies, series and originals — all in one bright place.
            </p>
          </div>
          {columns.map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-3 text-sm font-semibold text-primary">{heading}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {links.map((l) => {
                  const [label, href] = Array.isArray(l) ? l : [l, "#"];
                  return (
                    <li key={label}>
                      <Link href={href} className="hover:text-foreground">{label}</Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-8" />
        <p className="text-xs text-muted-foreground">© 2026 CineYellow. Demo frontend.</p>
      </div>
    </footer>
  );
}
