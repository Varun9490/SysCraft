'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Brain,
  BrainCircuit,
  Check,
  Cpu,
  Database,
  Download,
  Key,
  ListChecks,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from '@/components/ui/icons';
import {
  WEBLLM_MODEL,
  getByokConfig,
  isWebGpuAvailable,
  loadWebLlmEngine,
  saveByokConfig,
  type ByokConfig,
} from '@/engine/aiClient';
import {
  DEFAULT_PRACTICE_SETTINGS,
  loadPracticeHistory,
  loadPracticeSettings,
  localDay,
  reviewsToday,
  savePracticeSettings,
  type PracticeSettings,
} from '@/engine/practiceStats';
import { isSoundEnabled, setSoundEnabled } from '@/engine/soundEngine';
import { BACKUP_FORMAT, exportBackup, importBackup, wipeLocalData } from '@/store/db';
import { useCanvasStore } from '@/store/useCanvasStore';

/**
 * Settings (Union Blueprint §5.8): AI tier picker, practice scheduling,
 * canvas accessibility, and full local-data control.
 *
 * Every read of browser storage happens inside effects or event handlers —
 * nothing is touched during SSR prerender. BYOK keys are stored ONLY in
 * localStorage under `syscraft.byok` and never transmitted anywhere except
 * the selected provider endpoint.
 */

type Provider = ByokConfig['provider'];

const PROVIDER_META: Array<{ id: Provider; label: string; modelPlaceholder: string }> = [
  { id: 'gemini', label: 'Google Gemini', modelPlaceholder: 'gemini-2.0-flash' },
  { id: 'openai', label: 'OpenAI', modelPlaceholder: 'gpt-4o-mini' },
  { id: 'anthropic', label: 'Anthropic', modelPlaceholder: 'claude-3-5-haiku-latest' },
];

export function SettingsPanel() {
  const router = useRouter();
  const roughEnabled = useCanvasStore((s) => s.roughEnabled);
  const setRoughEnabled = useCanvasStore((s) => s.setRoughEnabled);
  const setOutlineMode = useCanvasStore((s) => s.setOutlineMode);

  /* ------------------------------ AI engine ------------------------------ */
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [byokSaved, setByokSaved] = useState(false);
  const [webgpuSupported, setWebgpuSupported] = useState(false);
  const [llmState, setLlmState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [llmProgress, setLlmProgress] = useState('');

  /* ------------------------------- Practice ------------------------------ */
  const [practice, setPractice] = useState<PracticeSettings>(DEFAULT_PRACTICE_SETTINGS);
  const [todayCount, setTodayCount] = useState(0);
  const [practiceSaved, setPracticeSaved] = useState(false);

  /* -------------------------- Canvas & audio ----------------------------- */
  const [soundOn, setSoundOn] = useState(true);

  /* -------------------------------- Data --------------------------------- */
  const [usage, setUsage] = useState<{ usedBytes: number; quotaBytes: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [wipeArmed, setWipeArmed] = useState(false);

  useEffect(() => {
    const byok = getByokConfig();
    if (byok) {
      setProvider(byok.provider);
      setApiKey(byok.apiKey);
      setModel(byok.model ?? '');
    }
    setWebgpuSupported(isWebGpuAvailable());
    setSoundOn(isSoundEnabled());
    setPractice(loadPracticeSettings());
    setTodayCount(reviewsToday(loadPracticeHistory()));
    void (async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          setUsage({ usedBytes: est.usage ?? 0, quotaBytes: est.quota ?? 0 });
        }
        if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
          setPersisted(await navigator.storage.persisted());
        }
      } catch {
        /* storage API unavailable — the panel just omits the numbers */
      }
    })();
  }, []);

  const saveByok = useCallback(() => {
    const key = apiKey.trim();
    if (key.length === 0) {
      saveByokConfig(null);
    } else {
      saveByokConfig({ provider, apiKey: key, model: model.trim() || undefined });
    }
    setByokSaved(true);
  }, [apiKey, model, provider]);

  const clearByok = useCallback(() => {
    saveByokConfig(null);
    setApiKey('');
    setModel('');
    setByokSaved(true);
  }, []);

  const loadLocalModel = useCallback(async () => {
    setLlmState('loading');
    setLlmProgress('Checking WebGPU…');
    const ok = await loadWebLlmEngine(setLlmProgress);
    setLlmState(ok ? 'ready' : 'failed');
  }, []);

  const savePractice = useCallback(() => {
    savePracticeSettings(practice);
    setPracticeSaved(true);
  }, [practice]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);

  const openOutlineCanvas = useCallback(() => {
    setOutlineMode(true);
    router.push('/canvas');
  }, [router, setOutlineMode]);

  const downloadBackup = useCallback(async () => {
    setDataMessage(null);
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `syscraft-backup-${localDay(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDataMessage('Backup downloaded — the file contains every local SysCraft record.');
  }, []);

  const importFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setDataMessage(null);
    const text = await file.text();
    const result = await importBackup(text);
    if (!result.ok) {
      setDataMessage(result.error ?? 'Import failed.');
      return;
    }
    setDataMessage(
      `Imported ${result.rows} database rows and ${result.keys} preference keys. Reload to see the restored state everywhere.`,
    );
  }, []);

  const doWipe = useCallback(async () => {
    if (!wipeArmed) {
      setWipeArmed(true);
      setDataMessage('This deletes blueprints, cards, labs, play scores, and settings on this device. Click again to confirm.');
      return;
    }
    await wipeLocalData();
    setDataMessage('All local SysCraft data deleted. Reloading…');
    window.setTimeout(() => window.location.reload(), 900);
  }, [wipeArmed]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-400/80">SETTINGS</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-zinc-100">Tune your workshop</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Everything on this page lives on your device. No accounts, no telemetry, no server round-trips — export it,
          move it, or delete it whenever you want.
        </p>
      </header>

      {/* ------------------------------- AI engine ------------------------------- */}
      <section aria-labelledby="ai-heading" className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 id="ai-heading" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
          <BrainCircuit className="h-4 w-4 text-sky-400" aria-hidden />
          AI review engine
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
          The Design Doctor and topology reviewer run in three tiers. The deterministic offline architect is always
          active as the floor — the other tiers only add nuance when you opt in.
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <TierCard
            icon={<Cpu className="h-4 w-4" aria-hidden />}
            title="Offline heuristics"
            active={apiKey.trim().length === 0 && llmState !== 'ready'}
            note="Always on. SPOF, cache, throttle, and DLQ analysis with zero network."
          />
          <TierCard
            icon={<Key className="h-4 w-4" aria-hidden />}
            title="Cloud BYOK"
            active={apiKey.trim().length > 0}
            note="Your key, your provider. Calls go straight from this browser to the endpoint."
          />
          <TierCard
            icon={<Brain className="h-4 w-4" aria-hidden />}
            title="WebGPU local"
            active={llmState === 'ready'}
            note={`${WEBLLM_MODEL} downloaded once, then inference is fully local.`}
          />
        </div>

        <div className="mt-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <h3 className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-zinc-400">
            <Key className="h-3.5 w-3.5" aria-hidden />
            BRING YOUR OWN KEY
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11.5px] text-zinc-500">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
              >
                {PROVIDER_META.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11.5px] text-zinc-500">Model (optional)</span>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={PROVIDER_META.find((p) => p.id === provider)?.modelPlaceholder}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[11.5px] text-zinc-500">API key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setByokSaved(false);
                }}
                placeholder="Stored only in this browser's localStorage"
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveByok}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-sky-400"
            >
              {byokSaved ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Key className="h-3.5 w-3.5" aria-hidden />}
              {byokSaved ? 'Saved' : 'Save key'}
            </button>
            <button
              type="button"
              onClick={clearByok}
              className="rounded-lg border border-zinc-700 px-3.5 py-2 text-[13px] text-zinc-300 transition hover:border-zinc-500"
            >
              Clear key
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-600">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Never logged, never proxied — direct browser calls only.
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void loadLocalModel()}
            disabled={llmState === 'loading'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-[13px] text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Brain className="h-3.5 w-3.5" aria-hidden />
            {llmState === 'loading' ? 'Loading local model…' : llmState === 'ready' ? 'Local model ready' : 'Load WebGPU model'}
          </button>
          <span className="text-[11.5px] text-zinc-500">
            {webgpuSupported
              ? llmProgress || 'WebGPU detected. The ~0.8 GB model downloads once and stays cached.'
              : 'WebGPU not available in this browser — tiers 1 and 3 still work.'}
          </span>
        </div>
      </section>

      {/* ------------------------------- Practice ------------------------------- */}
      <section aria-labelledby="practice-heading" className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 id="practice-heading" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
          <ListChecks className="h-4 w-4 text-emerald-400" aria-hidden />
          Practice scheduling
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
          The FSRS queue targets 90% retention. A daily cap keeps sessions honest — overflow waits quietly instead of
          turning into an overdue pile.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11.5px] text-zinc-500">Daily review cap (5–200)</span>
            <input
              type="number"
              min={5}
              max={200}
              value={practice.dailyCap}
              onChange={(e) => {
                setPractice((p) => ({ ...p, dailyCap: Number(e.target.value) || p.dailyCap }));
                setPracticeSaved(false);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
            />
            <span className="mt-1 block text-[11px] text-zinc-600">
              {todayCount} of {practice.dailyCap} reviewed today
            </span>
          </label>
          <div className="flex items-start gap-3 pt-5">
            <button
              type="button"
              role="switch"
              aria-checked={practice.catchUpMode}
              onClick={() => {
                setPractice((p) => ({ ...p, catchUpMode: !p.catchUpMode }));
                setPracticeSaved(false);
              }}
              className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition ${
                practice.catchUpMode ? 'border-emerald-500/60 bg-emerald-500/30' : 'border-zinc-600 bg-zinc-800'
              }`}
            >
              <span
                className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-zinc-100 transition-all ${
                  practice.catchUpMode ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
            <div>
              <p className="text-[12.5px] font-medium text-zinc-200">Catch-up mode</p>
              <p className="text-[11.5px] leading-relaxed text-zinc-500">
                After a break, temporarily raises the cap so the backlog drains gently instead of camping forever.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={savePractice}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-sky-400"
          >
            {practiceSaved ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ListChecks className="h-3.5 w-3.5" aria-hidden />}
            {practiceSaved ? 'Saved' : 'Save schedule'}
          </button>
          <Link href="/practice" className="text-[12px] text-sky-400 transition hover:text-sky-300">
            Open the review queue →
          </Link>
        </div>
      </section>

      {/* -------------------------- Canvas & accessibility ----------------------- */}
      <section aria-labelledby="canvas-heading" className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 id="canvas-heading" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
          <SettingsIcon className="h-4 w-4 text-zinc-400" aria-hidden />
          Canvas &amp; accessibility
        </h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12.5px] font-medium text-zinc-200">Hand-drawn node style</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-500">
                Rough.js sketch rendering. Turn it off for crisp, high-contrast shapes — easier on some screens and
                with strong magnification.
              </p>
            </div>
            <ToggleSwitch checked={roughEnabled} onToggle={() => setRoughEnabled(!roughEnabled)} label="Hand-drawn node style" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12.5px] font-medium text-zinc-200">Sound effects</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-500">
                Simulation and UI feedback tones. All synthesized locally with the Web Audio API.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 transition hover:border-zinc-500"
            >
              {soundOn ? <Volume2 className="h-3.5 w-3.5" aria-hidden /> : <VolumeX className="h-3.5 w-3.5" aria-hidden />}
              {soundOn ? 'On' : 'Muted'}
            </button>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12.5px] font-medium text-zinc-200">Outline Mode</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-500">
                A fully keyboard- and screen-reader-accessible table view of the canvas (WCAG 2.2 AA): add nodes,
                connect them, and review findings without a single drag.
              </p>
            </div>
            <button
              type="button"
              onClick={openOutlineCanvas}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 transition hover:border-zinc-500"
            >
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              Open in Outline Mode
            </button>
          </div>
        </div>
      </section>

      {/* --------------------------------- Data --------------------------------- */}
      <section aria-labelledby="data-heading" className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 id="data-heading" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
          <Database className="h-4 w-4 text-amber-400" aria-hidden />
          Data &amp; storage
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
          Backup format <span className="font-mono text-zinc-400">{BACKUP_FORMAT}</span> bundles all five IndexedDB
          tables (blueprints, custom resources, FSRS cards, lab progress, recordings) plus every{' '}
          <span className="font-mono text-zinc-400">syscraft.*</span> preference key.
        </p>
        {usage && (
          <p className="mt-1.5 text-[11.5px] text-zinc-600">
            Using {formatBytes(usage.usedBytes)}
            {usage.quotaBytes > 0 ? ` of ~${formatBytes(usage.quotaBytes)} available` : ''}
            {persisted !== null ? ` · ${persisted ? 'storage marked persistent' : 'storage not yet marked persistent'}` : ''}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void downloadBackup()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-sky-400"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export backup (.json)
          </button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-[13px] text-zinc-200 transition hover:border-zinc-500">
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => void importFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={() => void doWipe()}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] transition ${
              wipeArmed
                ? 'border-red-500/70 bg-red-500/15 text-red-300'
                : 'border-zinc-700 text-zinc-400 hover:border-red-500/50 hover:text-red-300'
            }`}
          >
            {wipeArmed ? <RotateCcw className="h-3.5 w-3.5" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
            {wipeArmed ? 'Confirm delete' : 'Delete all local data'}
          </button>
        </div>
        {dataMessage && <p className="mt-3 text-[11.5px] leading-relaxed text-zinc-400">{dataMessage}</p>}
      </section>

      {/* -------------------------------- About --------------------------------- */}
      <section aria-labelledby="about-heading" className="mt-6 rounded-2xl border border-zinc-800/70 bg-zinc-900/20 p-5">
        <h2 id="about-heading" className="text-[13px] font-semibold text-zinc-300">
          About this build
        </h2>
        <ul className="mt-3 space-y-1.5 text-[11.5px] leading-relaxed text-zinc-500">
          <li>
            Design schema: <span className="font-mono text-zinc-400">syscraft.design/1</span> · database:{' '}
            <span className="font-mono text-zinc-400">syscraft_db_v1</span>
          </li>
          <li>Legacy SystemCanvas / ArchForge saves are migrated automatically on first boot — nothing is deleted.</li>
          <li>
            Offline-first: this site is a static export; after first load it keeps working with the network off.
          </li>
        </ul>
      </section>
    </div>
  );
}

function TierCard({ icon, title, note, active }: { icon: React.ReactNode; title: string; note: string; active: boolean }) {
  return (
    <div className={`rounded-xl border p-3.5 ${active ? 'border-sky-500/50 bg-sky-500/[0.07]' : 'border-zinc-800 bg-zinc-900/30'}`}>
      <div className={`flex items-center gap-2 text-[12px] font-semibold ${active ? 'text-sky-300' : 'text-zinc-400'}`}>
        {icon}
        {title}
        {active && <span className="ml-auto rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300">PRIMARY</span>}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{note}</p>
    </div>
  );
}

function ToggleSwitch({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition ${
        checked ? 'border-emerald-500/60 bg-emerald-500/30' : 'border-zinc-600 bg-zinc-800'
      }`}
    >
      <span
        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-zinc-100 transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  );
}
