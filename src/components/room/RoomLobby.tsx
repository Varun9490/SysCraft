'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Globe, Lock, RefreshCw, Users, X } from '@/components/ui/icons';
import {
  colorForName,
  generateRoomCode,
  isValidRoomCode,
  loadRoomConfig,
  loadStoredName,
  normalizeRoomCode,
  saveRoomConfig,
  clearRoomConfig,
  type RoomConfig,
} from '@/engine/roomSync';

/**
 * /room — the lobby for live P2P collaboration (Union Blueprint §5.7).
 *
 * Create a room code or join one from an invite link, pick a display name,
 * then step onto the canvas where the RoomSession panel mirrors the topology
 * peer-to-peer over y-webrtc. Signaling servers only introduce peers; the
 * architecture itself never touches a backend.
 */

export function RoomLobby() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [existing, setExisting] = useState<RoomConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setExisting(loadRoomConfig());
    setName(loadStoredName());
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) setCode(normalizeRoomCode(hash));
  }, []);

  const join = useCallback(
    (rawCode: string) => {
      const normalized = normalizeRoomCode(rawCode);
      if (name.trim().length === 0) {
        setError('Pick a display name first — peers see it next to your cursor.');
        return;
      }
      if (!isValidRoomCode(normalized)) {
        setError('Room codes are 6 characters from A–Z and 2–9 (letters like I, L, O and digits 0/1 never appear).');
        return;
      }
      const config = saveRoomConfig(normalized, name);
      setExisting(config);
      setError(null);
      router.push('/canvas');
    },
    [name, router],
  );

  const createRoom = useCallback(() => {
    const fresh = generateRoomCode();
    setCode(fresh);
    join(fresh);
  }, [join]);

  const leaveRoom = useCallback(() => {
    clearRoomConfig();
    setExisting(null);
    setCode('');
  }, []);

  const copyInvite = useCallback(async () => {
    if (!existing || typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room#${existing.code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Clipboard blocked — copy the URL from the address bar instead.');
    }
  }, [existing]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-400/80">LIVE ROOMS</p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-zinc-100">
          <Users className="h-7 w-7 text-sky-400" aria-hidden />
          Craft together, peer-to-peer
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          A room mirrors the same canvas between every browser: nodes, edges, positions, and who's online. The
          topology travels directly between peers over WebRTC — there is no SysCraft server, no account, and no copy
          of your architecture anywhere but the browsers in the room.
        </p>
      </header>

      {existing && (
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.06] p-4">
          <div>
            <p className="text-[13px] font-semibold text-emerald-200">
              You're in room <span className="font-mono tracking-[0.14em]">{existing.code}</span> as {existing.name}
            </p>
            <p className="mt-0.5 text-[11.5px] text-zinc-400">Rejoin to resume syncing, or leave to edit alone.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/canvas')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              Rejoin room
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-[13px] text-zinc-200 transition hover:border-zinc-500"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden /> : <Globe className="h-3.5 w-3.5" aria-hidden />}
              {copied ? 'Invite copied' : 'Copy invite'}
            </button>
            <button
              type="button"
              onClick={leaveRoom}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-[13px] text-zinc-400 transition hover:border-red-500/50 hover:text-red-300"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Leave
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="text-[13px] font-semibold text-zinc-100">Start a new room</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
            Generates a fresh code and drops you straight onto the canvas with the session panel active.
          </p>
          <button
            type="button"
            onClick={createRoom}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Create room &amp; open canvas
          </button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="text-[13px] font-semibold text-zinc-100">Join with a code</h2>
          <label className="mt-3 block">
            <span className="text-[11.5px] text-zinc-500">Room code</span>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(normalizeRoomCode(e.target.value));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') join(code);
              }}
              placeholder="e.g. K7M2QX"
              maxLength={6}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-lg tracking-[0.3em] text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => join(code)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-sky-500/60 hover:text-sky-200"
          >
            Join room
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <label className="block">
          <span className="text-[11.5px] text-zinc-500">Display name — shown to everyone in the room</span>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder="Ada"
              maxLength={24}
              className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none"
            />
            {name.trim().length > 0 && (
              <span className="flex items-center gap-2 text-[11.5px] text-zinc-500">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-zinc-950"
                  style={{ backgroundColor: colorForName(name) }}
                  aria-hidden
                >
                  {name.trim().slice(0, 1).toUpperCase()}
                </span>
                your peer color
              </span>
            )}
          </div>
        </label>
        {error && <p className="mt-3 text-[12px] text-amber-300">{error}</p>}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <TrustCard
          icon={<Lock className="h-4 w-4 text-emerald-400" aria-hidden />}
          title="End-to-end encrypted"
          body="WebRTC links are DTLS-encrypted point-to-point. The signaling servers only relay connection offers — never your canvas."
        />
        <TrustCard
          icon={<Globe className="h-4 w-4 text-sky-400" aria-hidden />}
          title="No server state"
          body="Nothing is stored anywhere. When the last peer leaves, the room's topology exists only in local autosaves."
        />
        <TrustCard
          icon={<Users className="h-4 w-4 text-amber-400" aria-hidden />}
          title="Built for workshops"
          body="Perfect for pair-designing, classroom critiques, or an interview loop where both sides edit the same canvas."
        />
      </section>

      <p className="mt-6 text-[11.5px] leading-relaxed text-zinc-600">
        Changes sync as whole-topology snapshots (debounced ~4×/second) rather than keystrokes, so conflicts resolve
        to the most recent edit. The room panel on the canvas shows live peers and lets you leave anytime — see the{' '}
        <Link href="/settings" className="text-sky-400 hover:text-sky-300">
          settings
        </Link>{' '}
        page for data controls.
      </p>
    </div>
  );
}

function TrustCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="flex items-center gap-2 text-[12px] font-semibold text-zinc-200">
        {icon}
        {title}
      </p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}
