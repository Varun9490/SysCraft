'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, Users, X } from '@/components/ui/icons';
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

type RoomStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function RoomSession() {
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const destroyedRef = useRef(false);

  useEffect(() => {
    setConfig(loadRoomConfig());
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
              sceneMap.set('payload', useCanvasStore.getState().serializeScene());
            }
          }, SEED_GRACE_MS);
        }

        // 2. Remote → local.
        const observer = () => {
          if (cancelled || applyingRemote) return;
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
            sceneMap.set('payload', useCanvasStore.getState().serializeScene());
          }, SYNC_DEBOUNCE_MS);
        });

        // 4. Presence via the awareness protocol.
        const awareness = provider.awareness;
        awareness.setLocalStateField('user', { name: config.name, color: colorForName(config.name) });
        const refreshPeers = () => {
          if (cancelled) return;
          const selfId = doc.clientID;
          const next: PeerInfo[] = [];
          awareness.getStates().forEach((state, clientId) => {
            const user = (state as { user?: { name?: string; color?: string } }).user;
            if (!user || typeof user.name !== 'string') return;
            next.push({
              clientId,
              name: user.name,
              color: typeof user.color === 'string' ? user.color : `hsl(${(clientId * 47) % 360} 70% 62%)`,
              isSelf: clientId === selfId,
            });
          });
          next.sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.name.localeCompare(b.name));
          setPeers(next);
        };
        awareness.on('change', refreshPeers);
        refreshPeers();

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
    <div className="pointer-events-none absolute right-3 top-3 z-30">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/95 px-2.5 py-1.5 shadow-2xl backdrop-blur">
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
    </div>
  );
}
