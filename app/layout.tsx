import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata = {
  title: {
    default: "CineYellow — Movies & Series",
    template: "%s — CineYellow",
  },
  description: "Stream movies, series and anime on CineYellow.",
  verification: {
    // CryptoEze domain verification: <meta name="crypto-eze-verification" content="…">
    other: { "crypto-eze-verification": "5f78a53c5b311f61" },
  },
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
      </body>
    </html>
  );
}
