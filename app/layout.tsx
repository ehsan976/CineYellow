import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import { AppProvider } from "@/components/providers/app-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// viewport-fit=cover lets the phone tab bar pad itself clear of the home indicator (safe-area insets).
export const viewport = {
  viewportFit: "cover",
  themeColor: "#0b0b0e",
};

export const metadata = {
  title: {
    default: "CineYellow — Movies & Series",
    template: "%s — CineYellow",
  },
  description: "Stream movies, series and anime on CineYellow.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Navbar + footer live in app/(main)/layout.tsx; the player and sign-in pages have none */}
        <AppProvider>{children}</AppProvider>
        {/* Real-user page speed (Vercel → Speed Insights). Sends nothing outside Vercel deployments. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
