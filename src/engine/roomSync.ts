/**
 * Peer-to-peer collaboration helpers (Union Blueprint §5.7).
 *
 * Rooms ride on y-webrtc: the Yjs document and presence travel directly
 * between browsers, public signaling servers are used only to introduce
 * peers, and nothing is stored server-side. These helpers are pure or
 * guarded so they can run inside Vitest / SSR without touching the DOM.
 */

export interface RoomConfig {
  code: string;
  name: string;
  joinedAt: string;
}

export const ROOM_STORAGE_KEY = "syscraft.room.config";
export const ROOM_NAME_KEY = "syscraft.room.name";

/** Crockford-style alphabet: no I, L, O, 0, 1 — codes are read aloud safely. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

/** Uppercase and strip spaces/dashes; invalid characters are preserved so the user sees them. */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  for (const char of code) {
    if (!ROOM_CODE_ALPHABET.includes(char)) return false;
  }
  return true;
}

/** Cryptographically random room code with a Math.random fallback for exotic sandboxes. */
export function generateRoomCode(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(ROOM_CODE_LENGTH);
      crypto.getRandomValues(bytes);
      let out = "";
      for (const byte of bytes) out += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
      return out;
    }
  } catch {
    /* fall through to Math.random */
  }
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    out += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return out;
}

/** Deterministic display color for a peer name — same name, same hue everywhere. */
export function colorForName(name: string): string {
  let hash = 0;
  const normalized = name.trim().toLowerCase() || "peer";
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 62%)`;
}

export function loadRoomConfig(): RoomConfig | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ROOM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RoomConfig>;
    if (typeof parsed.code !== "string" || typeof parsed.name !== "string") return null;
    const code = normalizeRoomCode(parsed.code);
    if (!isValidRoomCode(code) || parsed.name.trim().length === 0) return null;
    return { code, name: parsed.name.trim().slice(0, 24), joinedAt: typeof parsed.joinedAt === "string" ? parsed.joinedAt : new Date(0).toISOString() };
  } catch {
    return null;
  }
}

export function saveRoomConfig(code: string, name: string): RoomConfig {
  const config: RoomConfig = {
    code: normalizeRoomCode(code),
    name: name.trim().slice(0, 24) || "Anonymous",
    joinedAt: new Date().toISOString(),
  };
  try {
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      window.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(config));
      window.localStorage.setItem(ROOM_NAME_KEY, config.name);
    }
  } catch {
    /* storage disabled — the room still works for this session */
  }
  return config;
}

export function clearRoomConfig(): void {
  try {
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      window.localStorage.removeItem(ROOM_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function loadStoredName(): string {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return "";
  try {
    return window.localStorage.getItem(ROOM_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
