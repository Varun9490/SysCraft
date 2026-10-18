import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { BootRunner } from "@/components/shell/BootRunner";
import { ThemeBridge } from "@/components/shell/ThemeBridge";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SysCraft — Interactive System Design, Distributed Systems & Kubernetes Simulator",
  description:
    "Stop memorizing static boxes. Read, sketch, and load-test real distributed systems and Kubernetes clusters on a live browser canvas — 100% free and offline-ready.",
  applicationName: "SysCraft",
  keywords: [
    "system design",
    "distributed systems",
    "kubernetes",
    "simulator",
    "interview preparation",
    "spaced repetition",
  ],
  openGraph: {
    title: "SysCraft — Interactive System Design & Kubernetes Simulator",
    description:
      "Read, sketch, and load-test real distributed systems and Kubernetes clusters on a live browser canvas. Free, local-first, offline-ready.",
    siteName: "SysCraft",
    type: "website",
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
        <BootRunner />
        <ThemeBridge />
        {children}
      </body>
    </html>
  );
}
