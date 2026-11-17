import { BrandLogo, MarketingFooter } from "@/components/site/marketing";
import { PosterWall } from "@/components/site/poster-wall";

/**
 * Netflix-style sign-in layout: full-bleed poster collage behind a dark gradient,
 * large logo, a translucent black panel, and a footer band. On phones it's plain black.
 */
export function AuthShell({ children }) {
  return (
    <div className="relative flex min-h-svh flex-col bg-black text-white">
      {/* Background (hidden on phones, like Netflix); fixed so long forms scroll over it */}
      <div aria-hidden className="fixed inset-0 hidden sm:block">
        <PosterWall className="absolute inset-0" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-linear-to-b from-black/85 via-transparent to-black/85" />
      </div>

      <header className="relative z-10 px-5 py-5 sm:px-10 sm:py-6 lg:px-14">
        <BrandLogo />
      </header>

      <main className="relative z-10 flex flex-1 justify-center px-5 pb-16 sm:items-start sm:px-0 sm:pt-4">
        <div className="w-full sm:max-w-[450px] sm:rounded-md sm:bg-black/75 sm:px-14 sm:py-12">{children}</div>
      </main>

      <MarketingFooter className="lg:px-14" />
    </div>
  );
}
