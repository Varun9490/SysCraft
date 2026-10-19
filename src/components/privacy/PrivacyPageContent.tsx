'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Database, KeyRound, Send, ShieldCheck } from "@/components/ui/icons";
import { Reveal, StaggerChild, StaggerGroup } from "@/components/ui/motion";

/**
 * The privacy truth panel: not a ToS — a plain inventory of what this app
 * stores on your device and every external host it can reach, with the
 * condition under which it does. If behavior changes, this page changes with
 * it (same discipline as /reference/numbers).
 */

const STAYS_LOCAL: Array<{ title: string; detail: string }> = [
  {
    title: "Your designs and the canvas",
    detail:
      "Topology, configurations, custom primitives, and undo history live in an IndexedDB database (Dexie) named syscraft_db_v1 inside this browser. There is no server copy.",
  },
  {
    title: "Practice and play records",
    detail:
      "FSRS scheduling state, review history, and game scores live in localStorage under the syscraft.* namespace, visible in devtools and covered by export.",
  },
  {
    title: "Accounts and analytics",
    detail:
      "There are no accounts, no tracking pixels, and no analytics beacons. The static site requests no cookie beyond what the browser needs to function.",
  },
];

const LEAVES_ONLY_WHEN_YOU_CHOOSE: Array<{ title: string; detail: string; when: string }> = [
  {
    title: "AI review with your own API key (tier 1)",
    when: "Only after you save a key in Settings — BYOK stored in localStorage under syscraft.byok",
    detail:
      "The review request goes from your browser directly to your chosen provider: generativelanguage.googleapis.com, api.openai.com, or api.anthropic.com. The key is sent as part of the request — never to SysCraft infrastructure, because none exists. Remove the key and the calls stop.",
  },
  {
    title: "Local-model weights (tier 2)",
    when: "Only when you explicitly select the local WebGPU model",
    detail:
      "The @mlc-ai/web-llm engine downloads model weights once from the public model registry (HuggingFace CDN), then runs inference entirely on your GPU. Inference itself makes no further network calls.",
  },
  {
    title: "Live rooms (peer-to-peer)",
    when: "Only when you open or join a room",
    detail:
      "Sessions ride on y-webrtc. A public signaling server (signaling.yjs.dev and y-webrtc-eu.fly.dev, the library defaults) relays connection offers only — it brokers the handshake, it does not store your canvas or messages. Canvas data then flows peer-to-peer over DTLS-encrypted WebRTC data channels.",
  },
];

const CONTROLS: Array<{ title: string; detail: string; href?: string; linkLabel?: string }> = [
  {
    title: "Export everything",
    detail:
      "Settings → Export produces a single JSON backup of the full Dexie database plus every syscraft.* localStorage key. Move it to another machine and import to restore exactly.",
    href: "/settings",
    linkLabel: "Open settings",
  },
  {
    title: "Delete everything",
    detail:
      "Settings → Reset deletes every SysCraft-owned byte in this browser — all IndexedDB tables and all syscraft.* localStorage keys. Nothing survives; nothing was on a server to survive.",
    href: "/settings",
    linkLabel: "Open settings",
  },
  {
    title: "Numbers with provenance",
    detail:
      "The same honesty discipline applies to technical claims: /reference/numbers lists the sources and as-of dates behind every load-bearing number.",
    href: "/reference/numbers",
    linkLabel: "Open the reference",
  },
];

export function PrivacyPageContent() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="section-container relative pb-20 pt-12 md:pt-16">
        <StaggerGroup>
          <StaggerChild>
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-brass" />
              Privacy
            </span>
          </StaggerChild>
          <StaggerChild>
            <h1 className="mt-6 max-w-2xl text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-content md:text-5xl">
              What stays, what leaves, named precisely.
            </h1>
          </StaggerChild>
          <StaggerChild>
            <p className="mt-6 max-w-2xl text-pretty text-[15px] leading-relaxed text-content-secondary">
              SysCraft is local-first, and &quot;local-first&quot; is a technical claim that can be audited. This is the
              audit: every store we touch, every host we can reach, and the exact condition under which we reach it. No
              flattering summary written about itself — plain prose, checkable against the code.
            </p>
          </StaggerChild>
        </StaggerGroup>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <section className="h-full rounded-2xl border border-line bg-app/50 p-6 shadow-card" aria-label="Stays local">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                <ShieldCheck size={14} className="text-brass" /> Never leaves your browser
              </p>
              <ul className="mt-4 space-y-4">
                {STAYS_LOCAL.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <CheckCircle2 size={15} className="mt-1 shrink-0 text-brass" />
                    <div>
                      <p className="text-[14px] font-medium text-content">{item.title}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-content-secondary">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.08}>
            <section className="h-full rounded-2xl border border-line bg-app/50 p-6 shadow-card" aria-label="Optional network calls">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                <Send size={14} className="text-brass" /> Leaves your browser — only when you act
              </p>
              <ul className="mt-4 space-y-4">
                {LEAVES_ONLY_WHEN_YOU_CHOOSE.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <KeyRound size={15} className="mt-1 shrink-0 text-brass" />
                    <div>
                      <p className="text-[14px] font-medium text-content">{item.title}</p>
                      <p className="mt-1 text-[12px] font-medium text-brass">{item.when}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-content-secondary">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        </div>

        <section className="mt-14" aria-label="Your controls">
          <Reveal>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-content">
              <Database size={18} className="text-brass" /> Your data, your controls
            </h2>
          </Reveal>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {CONTROLS.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <div className="flex h-full flex-col rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <p className="text-[14px] font-medium text-content">{item.title}</p>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-content-secondary">{item.detail}</p>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex self-start rounded-full border border-line-strong bg-app-raised/60 px-4 py-2 text-[12.5px] font-medium text-content-secondary transition-colors hover:border-brass/50 hover:text-content"
                    >
                      {item.linkLabel ?? "Open"}
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-[12px] leading-relaxed text-content-tertiary"
        >
          Found a mismatch between this page and the app&apos;s behavior? Treat it as a bug in the app: this inventory
          is meant to be checkable, and every external host listed is drawn directly from the request-construction
          code in the repository.
        </motion.p>
      </div>
    </div>
  );
}
