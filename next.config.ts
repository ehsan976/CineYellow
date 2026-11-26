import type { NextConfig } from "next";

// Security headers for every response. Deliberately no full Content-Security-Policy yet: admins
// can add HLS streams from any https host and embeds from several video hosts, so a script/media
// allowlist would need to follow the provider registry. frame-ancestors alone stops clickjacking.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browsers ignore HSTS over plain http, so this is harmless in local development.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Served straight from TMDB's CDN, not through Next's optimizer. TMDB already gives each image
    // in the size we ask for (w300/w500/w780/w1280 in lib/tmdb/map.ts) from a warm global cache,
    // while the optimizer had to fetch + resize every image on its first view (~1.5–2.5 s each:
    // cards slid in blank) and counts against Vercel's image-optimization quota.
    unoptimized: true,
    minimumCacheTTL: 2678400,
    remotePatterns: [
      // TMDB posters, backdrops and episode stills (lib/tmdb/map.ts).
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
