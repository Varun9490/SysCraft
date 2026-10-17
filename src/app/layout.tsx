import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SysCanvas — Learn System Design by Building It",
  description:
    "An interactive system design platform: design real systems on an infinite canvas, run them under load, and watch what breaks — from one server to globally distributed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="bg-ink font-sans text-content antialiased">
        {children}
      </body>
    </html>
  );
}
