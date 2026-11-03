'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, Share, Users, X } from '@/components/ui/icons';
import { clearRoomConfig, colorForName, loadRoomConfig, type RoomConfig } from '@/engine/roomSync';
import { useCanvasStore } from '@/store/useCanvasStore';

/**
 * Live P2P room session (Union Blueprint §5.7).
 *
 * Mounted inside the canvas shell. When a room is configured (via /room), it
 * opens a y-webrtc provider and mirrors the structural topology through a
 * Yjs map: local edits are published debounced, remote edits are applied via
 * `deserializeScene`. Presence rides on the awareness protocol so everyone
 * sees who is in the room. Yjs and y-webrtc are imported only inside the
 * effect — they never execute during prerender, and nothing is uploaded to
 * any server (signaling is used only for peer discovery).
 */

const SYNC_DEBOUNCE_MS = 220;
const SEED_GRACE_MS = 1800;

interface PeerInfo {
  clientId: number;
  name: string;
  color: string;
  isSelf: boolean;
}

interface RemoteCursor {
  clientId: number;
  name: string;
  color: string;
  x: number;
  y: number;
}

type RoomStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function RoomSession() {
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [posReady, setPosReady] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const destroyedRef = useRef(false);
  const awarenessRef = useRef<any>(null);

  useEffect(() => {
    setConfig(loadRoomConfig());
    // Park the panel below the floating toolbar so it never overlaps the
    // canvas menu bar; the user can drag it anywhere afterwards.
    if (typeof window !== 'undefined') {
      setPos({ x: Math.max(12, window.innerWidth - 340), y: 76 });
      setPosReady(true);
    }
    return () => {
      destroyedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!config) return;
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      setStatus('error');
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      try {
        setStatus('connecting');
        const Y = await import('yjs');
        const { WebrtcProvider } = await import('y-webrtc');
        if (cancelled) return;

        const doc = new Y.Doc();
        const provider = new WebrtcProvider(`syscraft-room-${config.code}`, doc, {
          maxConns: 24,
        });

        const sceneMap = doc.getMap<string>('scene');
        let applyingRemote = false;

        const applyRemotePayload = (payload: unknown) => {
          if (typeof payload !== 'string' || payload.length === 0) return;
          applyingRemote = true;
          try {
            const ok = useCanvasStore.getState().deserializeScene(payload);
            if (ok) useCanvasStore.getState().setSceneName(`Room ${config.code}`);
          } finally {
            applyingRemote = false;
          }
        };

        // 1. Join an existing room, or seed an empty one after a grace period
        //    so two simultaneous joiners don't both clobber the shared state.
        const initial = sceneMap.get('payload');
        let seedTimer: number | null = null;
        if (typeof initial === 'string') {
          applyRemotePayload(initial);
        } else {
          seedTimer = window.setTimeout(() => {
            if (cancelled) return;
            const current = sceneMap.get('payload');
            if (typeof current === 'string') {
              applyRemotePayload(current);
            } else {
              doc.transact(() => {
                sceneMap.set('payload', useCanvasStore.getState().serializeScene());
              }, 'local');
            }
          }, SEED_GRACE_MS);
        }

        // 2. Remote → local (ignore our own writes via the 'local' origin).
        const observer = (event: { transaction?: { origin?: unknown } }) => {
          if (cancelled || applyingRemote) return;
          if (event?.transaction?.origin === 'local') return;
          applyRemotePayload(sceneMap.get('payload'));
        };
        sceneMap.observe(observer);

        // 3. Local → remote, debounced so canvas drags don't flood the room.
        let writeTimer: number | null = null;
        const unsub = useCanvasStore.subscribe((state, prev) => {
          if (applyingRemote) return;
          if (state.nodes === prev.nodes && state.edges === prev.edges) return;
          if (writeTimer !== null) window.clearTimeout(writeTimer);
          writeTimer = window.setTimeout(() => {
            if (cancelled || applyingRemote) return;
            doc.transact(() => { sceneMap.set('payload', useCanvasStore.getState().serializeScene()); }, 'local');
          }, SYNC_DEBOUNCE_MS);
        });

        // 4. Presence via the awareness protocol.
        const awareness = provider.awareness;
        awarenessRef.current = awareness;
        awareness.setLocalStateField('user', { name: config.name, color: colorForName(config.name) });
        const refreshPeers = () => {
          if (cancelled) return;
          const selfId = doc.clientID;
          const next: PeerInfo[] = [];
          const nextCursors: RemoteCursor[] = [];
          awareness.getStates().forEach((state, clientId) => {
            const user = (state as { user?: { name?: string; color?: string } }).user;
            if (!user || typeof user.name !== 'string') return;
            const color = typeof user.color === 'string' ? user.color : `hsl(${(clientId * 47) % 360} 70% 62%)`;
            next.push({
              clientId,
              name: user.name,
              color,
              isSelf: clientId === selfId,
            });
            if (clientId !== selfId) {
              const cursor = (state as { cursor?: { x?: number; y?: number } }).cursor;
              if (cursor && typeof cursor.x === 'number' && typeof cursor.y === 'number') {
                nextCursors.push({ clientId, name: user.name, color, x: cursor.x, y: cursor.y });
              }
            }
          });
          next.sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.name.localeCompare(b.name));
          setPeers(next);
          setCursors(nextCursors);
        };
        awareness.on('change', refreshPeers);
        refreshPeers();

        // 5. Broadcast local cursor position (throttled).
        let cursorTimer: number | null = null;
        const onPointerMove = (ev: PointerEvent) => {
          if (cancelled) return;
          const container = (ev.currentTarget as HTMLElement) ?? null;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          const x = ev.clientX - rect.left;
          const y = ev.clientY - rect.top;
          if (cursorTimer !== null) window.clearTimeout(cursorTimer);
          cursorTimer = window.setTimeout(() => {
            if (cancelled) return;
            awareness.setLocalStateField('cursor', { x, y });
          }, 50);
        };
        const canvasEl = document.querySelector('.react-flow') as HTMLElement | null;
        if (canvasEl) {
          canvasEl.addEventListener('pointermove', onPointerMove);
        }

        provider.on('status', (event: { connected: boolean }) => {
          if (cancelled) return;
          setStatus(event.connected ? 'connected' : 'connecting');
        });
        // Broadcast-channel-only connections never fire a signaling "status",
        // so consider ourselves live once the provider exists.
        setStatus((s) => (s === 'error' ? s : 'connected'));

        cleanup = () => {
          if (seedTimer !== null) window.clearTimeout(seedTimer);
          if (writeTimer !== null) window.clearTimeout(writeTimer);
          if (cursorTimer !== null) window.clearTimeout(cursorTimer);
          if (canvasEl) canvasEl.removeEventListener('pointermove', onPointerMove);
          unsub();
          sceneMap.unobserve(observer);
          awareness.off('change', refreshPeers);
          provider.destroy();
          doc.destroy();
        };
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [config]);

  const leave = useCallback(() => {
    clearRoomConfig();
    setConfig(null);
    setPeers([]);
    setStatus('idle');
  }, []);

  const copyInvite = useCallback(() => {
    if (!config || typeof window === 'undefined') return;
    const url = `${window.location.origin}/room#${config.code}`;
    try {
      void navigator.clipboard?.writeText(url)?.catch(() => undefined);
    } catch {
      /* clipboard blocked — the address bar still works */
    }
  }, [config]);

  if (!config) return null;

  return (
    <>
      {cursors.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40">
          {cursors.map((c) => (
            <div
              key={c.clientId}
              className="absolute transition-transform duration-75"
              style={{ transform: `translate(${c.x}px, ${c.y}px)` }}
            >
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
                <path d="M0 0 L0 16 L4.5 12 L7 18 L9 17 L6.5 11 L12 11 Z" fill={c.color} stroke="#0a0a0a" strokeWidth="1" />
              </svg>
              <span
                className="ml-3 mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-zinc-950"
                style={{ backgroundColor: c.color }}
              >
                {c.name}
              </span>
            </div>
          ))}
        </div>
      )}
      <div
        className="pointer-events-auto absolute z-40 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/95 px-2.5 py-1.5 shadow-2xl backdrop-blur"
        style={posReady ? { left: pos.x, top: pos.y } : { right: 12, top: 76 }}
      >
        <button
          type="button"
          aria-label="Drag room panel"
          className="flex h-5 w-4 cursor-grab items-center justify-center rounded text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 active:cursor-grabbing"
          onPointerDown={(e) => {
            dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            const { startX, startY, origX, origY } = dragRef.current;
            setPos({ x: origX + (e.clientX - startX), y: origY + (e.clientY - startY) });
          }}
          onPointerUp={(e) => {
            dragRef.current = null;
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }}
          onPointerCancel={(e) => {
            dragRef.current = null;
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }}
        >
          <Menu size={12} />
        </button>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-zinc-200">
          <Users size={13} className="text-sky-400" />
          Room {config.code}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] ${
            status === 'connected'
              ? 'bg-emerald-500/15 text-emerald-300'
              : status === 'error'
                ? 'bg-red-500/15 text-red-300'
                : 'bg-amber-500/15 text-amber-300'
          }`}
          role="status"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === 'connected' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : 'animate-pulse bg-amber-400'
            }`}
          />
          {status === 'connected' ? 'live' : status === 'error' ? 'no WebRTC' : 'connecting'}
        </span>
        <span className="flex items-center -space-x-1.5" aria-label={`${peers.length} in room`}>
          {peers.slice(0, 5).map((peer) => (
            <span
              key={peer.clientId}
              title={peer.isSelf ? `${peer.name} (you)` : peer.name}
              className={`flex h-5 w-5 items-center justify-center rounded-full border border-zinc-950 text-[9px] font-bold text-zinc-950 ${
                peer.isSelf ? 'ring-2 ring-sky-400/70' : ''
              }`}
              style={{ backgroundColor: peer.color }}
            >
              {peer.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
          {peers.length > 5 && <span className="pl-2 text-[10.5px] text-zinc-400">+{peers.length - 5}</span>}
        </span>
        <button
          onClick={copyInvite}
          className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
          title="Copy room invite link"
        >
          <Share size={12} />
        </button>
        <button
          onClick={leave}
          className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-500 transition hover:bg-red-950 hover:text-red-300"
          title="Leave room"
        >
          <X size={12} />
        </button>
      </div>
    </>
  );
}
