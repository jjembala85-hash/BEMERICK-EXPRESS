import type { Metadata, Viewport } from "next";
import { Newsreader, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";

// Brand fonts (docs/01-brand-identity.md §3), self-hosted at build time.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Makes share-image and canonical addresses absolute in link previews.
  metadataBase: new URL(siteUrl()),
  title: {
    template: "%s · BEMERICK EXPRESS",
    default: "BEMERICK EXPRESS · News. Insight. Impact.",
  },
  description:
    "BEMERICK EXPRESS (BX News): fast, verified, mobile-first news from Uganda.",
  applicationName: "BX News",
  // Pre-launch: keep search engines out until Phase 5 (launch readiness).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0E3B43" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1416" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
