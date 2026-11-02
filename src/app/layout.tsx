import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { BootRunner } from "@/components/shell/BootRunner";
import { ThemeBridge } from "@/components/shell/ThemeBridge";
import { SITE_NAME, SITE_URL } from "@/data/contentManifest";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

/**
 * Honest, claim-free metadata. The app is free and local-first, but it is not
 * fully offline (AI tiers call APIs, WebLLM downloads weights), so we never
 * say "offline" — see the claims register (/reference/numbers) discipline.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Learn system design by running it`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Design real architectures on an infinite canvas, run them under load, and watch what breaks — from a single server to globally distributed systems. Free, local-first, no account.",
  applicationName: SITE_NAME,
  openGraph: {
    title: `${SITE_NAME} — Learn system design by running it`,
    description:
      "Design real architectures, run them under load, and watch what breaks — from a single server to globally distributed systems. Free, local-first, no account.",
    siteName: SITE_NAME,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="bg-ink font-sans text-content antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brass focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-zinc-950"
        >
          Skip to main content
        </a>
        <BootRunner />
        <ThemeBridge />
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
