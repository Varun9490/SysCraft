import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SysCanvas — System Design Encyclopedia, Simulator & Interview Workbench",
  description:
    "100% client-side system design playground: infinite canvas, discrete-event queuing simulation, OpenTelemetry traces, FSRS learning, and IaC export.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
