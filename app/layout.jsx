import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppProvider } from "@/components/providers/app-provider";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { SiteChrome } from "@/components/site/site-chrome";

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
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProvider>
          <SiteChrome>
            <Navbar />
          </SiteChrome>
          <div className="flex-1">{children}</div>
          <SiteChrome>
            <Footer />
          </SiteChrome>
        </AppProvider>
      </body>
    </html>
  );
}
