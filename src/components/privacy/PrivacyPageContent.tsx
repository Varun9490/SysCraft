'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Database, KeyRound, Send, ShieldCheck } from "@/components/ui/icons";
import { Reveal, StaggerChild, StaggerGroup } from "@/components/ui/motion";

/**
 * The privacy truth panel: not a ToS — a plain inventory of what this app
 * stores on your device and every external host it can reach, with the
 * condition under which it does. If behavior changes, this page changes with
 * it (same discipline as /reference/numbers). Sources: learning/platform/storage.ts,
 * store/canvasPersistence.ts, store/db.ts, engine/aiClient.ts, engine/roomSync.ts,
 * engine/cveScanner.ts.
 */

const STAYS_LOCAL: Array<{ title: string; detail: string }> = [
  {
    title: "Learner progress and preferences",
    detail:
      "Completed lessons, read field notes, visited topics, mastery records, quiz history, notes, bookmarks, and your resume point — plus reading mode, theme, ambient motion, cursor, and break settings — live in localStorage under syscraft.learner.v1. This is what the learner progress export writes to JSON.",
  },
  {
    title: "Canvas designs and autosave",
    detail:
      "The topology you build is autosaved to localStorage under syscraft-canvas-v1 (with a syscraft-canvas-v1:lab:<id> key per lab), not to IndexedDB. Canvas preferences and saved presets use syscraft.canvas.prefs / syscraft.canvas.presets. There is no server copy of your design; a full backup includes the autosave so it can be restored on another device.",
  },
  {
    title: "Deck cards, lab progress, and blueprints",
    detail:
      "FSRS scheduling state and review history, lab progress, custom primitives, saved blueprints, and simulation recordings live in IndexedDB via Dexie (syscraft_db_v1). The older syscanvas database is copied into it on first boot. None of these tables have a server mirror.",
  },
  {
    title: "Practice, rooms, and other local keys",
    detail:
      "Recall and game records (syscraft.practice.*, syscraft.play.scores), prediction history, room code and config, start-checklist state, plugin packs, and the OpenCode bridge toggle all live in localStorage under the syscraft.* namespace, editable or removable in devtools. Your saved API key lives here too — under syscraft.byok, excluded from ordinary backups.",
  },
  {
    title: "Accounts and analytics",
    detail:
      "There are no accounts, no tracking pixels, and no analytics beacons. The static site sets no cookie beyond what the browser needs to function, and the default AI reviewer is a deterministic heuristic that makes no network request at all.",
  },
];

const LEAVES_ONLY_WHEN_YOU_CHOOSE: Array<{ title: string; detail: string; when: string }> = [
  {
    title: "Cloud AI with your own API key",
    when: "Only after you save a key in Settings — stored locally under syscraft.byok",
    detail:
      "Your browser posts the topology brief directly to the provider you pick: generativelanguage.googleapis.com, api.openai.com, or api.anthropic.com. The key is part of that request to the provider only; it is never sent to SysCraft infrastructure, because none exists. It is deliberately excluded from normal backups, so a backup file cannot leak your credential. Clearing the key stops the calls. This is an opt-in server round-trip to the provider.",
  },
  {
    title: "Browser-local WebGPU model",
    when: "Only when you explicitly load the local model in Settings",
    detail:
      "The @mlc-ai/web-llm engine downloads the Llama-3.2-1B-Instruct-q4f16_1-MLC weights once from the public MLC model registry on HuggingFace CDN and caches them in this browser. That download is a real network fetch; after it completes, inference runs on your GPU with no further requests.",
  },
  {
    title: "Local OpenCode free-plan bridge",
    when: "Only when you enable the bridge toggle and the OpenCode CLI bridge is running on your machine",
    detail:
      "The browser sends the topology brief over HTTP to http://127.0.0.1:8787/review — a loopback request to a process on your own computer, not to SysCraft or a remote service. It is still a network round-trip, and it happens only while the toggle is on and the local bridge is listening. The enabled flag lives in localStorage under syscraft.opencodeBridge.",
  },
  {
    title: "Live rooms (peer-to-peer)",
    when: "Only when you open or join a room",
    detail:
      "Rooms ride on y-webrtc. Its public signaling servers (signaling.yjs.dev and y-webrtc-eu.fly.dev by default) relay connection offers so peers can find each other; they broker the handshake and never store your canvas. Scene data then travels peer-to-peer over DTLS-encrypted WebRTC data channels. Room code and config are saved locally under syscraft.room.config / syscraft.room.name.",
  },
  {
    title: "Live CVE threat feed (optional)",
    when: "Only when you request a live refresh in the Security hub",
    detail:
      "The default request goes to services.nvd.nist.gov with a keyword search and a hard timeout. You can paste a custom feed URL — in that case the browser fetches whatever URL you supplied, so that host receives the request. Canvas data is never sent, and a failed or blocked fetch falls back to the bundled curated cache.",
  },
];

const CONTROLS: Array<{ title: string; detail: string; href?: string; linkLabel?: string }> = [
  {
    title: "Learner progress export",
    detail:
      "Settings → Learner data exports only the syscraft.learner.v1 state as JSON. It does not contain your API key, canvas designs, FSRS or lab records, or other local preferences — it is the portable record of what you have studied.",
    href: "/settings",
    linkLabel: "Open settings",
  },
  {
    title: "Full local backup",
    detail:
      "Settings → Export backup is a separate snapshot of the Dexie tables plus every SysCraft-owned localStorage key, including canvas autosaves. It deliberately omits the syscraft.byok credential, so your provider key stays on this device even if you move the backup file.",
    href: "/settings",
    linkLabel: "Open settings",
  },
  {
    title: "Delete everything",
    detail:
      "Settings → Reset clears the Dexie tables and all SysCraft-owned localStorage keys, including canvas autosaves; resetting learner data is a separate confirmed action for syscraft.learner.v1. Nothing was on a server to survive — deletion is local and immediate.",
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
              audit: every store we touch, every host we can reach, and the exact condition under which we reach it. The
              default path is entirely on your device; the network calls below are opt-in, and each one really does
              leave the browser — we do not call that &quot;offline&quot;.
            </p>
          </StaggerChild>
        </StaggerGroup>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <section className="h-full rounded-2xl border border-line bg-app/50 p-6 shadow-card" aria-label="Stays local">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                <ShieldCheck size={14} className="text-brass" /> Never leaves your browser by default
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
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          is meant to be checkable, and every storage key and external host listed is drawn from the code in this
          repository.
        </motion.p>
      </div>
    </div>
  );
}
