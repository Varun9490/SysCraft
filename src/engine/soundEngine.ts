/**
 * Procedural Web Audio sonification (Milestone 8).
 * Tactile UI clicks, a harmonic load hum that tracks simulation pressure,
 * and Geiger-style error alerts. Lazy AudioContext, fully guarded: every
 * entry no-ops outside the browser, before first gesture, or when disabled.
 * No module-scope window/document/navigator/AudioContext references.
 */

let context: AudioContext | null = null;
let enabled = true;
let humOscillator: OscillatorNode | null = null;
let humGain: GainNode | null = null;
let lastAlertMs = 0;

const ALERT_COOLDOWN_MS = 1500;

function ensureContext(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as Record<string, unknown>)["webkitAudioContext"];
    if (typeof Ctor !== "function") return null;
    if (!context) {
      context = new (Ctor as new () => AudioContext)();
    }
    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }
    return context;
  } catch {
    return null;
  }
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  if (!value) stopLoadHum();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function blip(frequency: number, durationS: number, type: OscillatorType, gainPeak: number, when = 0): void {
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + when;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, frequency), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainPeak), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationS);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + durationS + 0.02);
  } catch {
    /* audio graph torn down mid-note */
  }
}

/** Short tactile click for toolbar actions. */
export function playClick(): void {
  blip(660, 0.07, "triangle", 0.12);
}

/** Two-tone toggle (run/stop, sketch/crisp). */
export function playToggle(on: boolean): void {
  blip(on ? 520 : 440, 0.07, "triangle", 0.12);
  blip(on ? 780 : 330, 0.09, "triangle", 0.1, 0.07);
}

/** Rising arpeggio for cleared drills / passed lab stages. */
export function playSuccess(): void {
  blip(523.25, 0.1, "sine", 0.14);
  blip(659.25, 0.1, "sine", 0.14, 0.09);
  blip(783.99, 0.16, "sine", 0.14, 0.18);
}

/** Geiger-style triple burst for error-burn alerts (cooldown-guarded). */
export function playErrorAlert(): void {
  const now = Date.now();
  if (now - lastAlertMs < ALERT_COOLDOWN_MS) return;
  lastAlertMs = now;
  blip(220, 0.06, "square", 0.06);
  blip(185, 0.06, "square", 0.06, 0.08);
  blip(147, 0.09, "square", 0.06, 0.16);
}

/** Continuous harmonic hum whose pitch follows load pressure 0–1. */
export function startLoadHum(): void {
  const ctx = ensureContext();
  if (!ctx || humOscillator) return;
  try {
    humOscillator = ctx.createOscillator();
    humGain = ctx.createGain();
    humOscillator.type = "sawtooth";
    humOscillator.frequency.setValueAtTime(55, ctx.currentTime);
    humGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    humOscillator.connect(filter);
    filter.connect(humGain);
    humGain.connect(ctx.destination);
    humOscillator.start();
  } catch {
    humOscillator = null;
    humGain = null;
  }
}

/** level01: 0 = idle room tone, 1 = saturated clip. */
export function updateLoadHum(level01: number): void {
  if (!humOscillator || !humGain || !context) return;
  try {
    const level = Math.max(0, Math.min(1, level01));
    humOscillator.frequency.setTargetAtTime(55 + level * 110, context.currentTime, 0.2);
    humGain.gain.setTargetAtTime(0.004 + level * 0.03, context.currentTime, 0.2);
  } catch {
    /* context closed */
  }
}

export function stopLoadHum(): void {
  try {
    humOscillator?.stop();
  } catch {
    /* already stopped */
  }
  try {
    humGain?.disconnect();
  } catch {
    /* already torn down */
  }
  humOscillator = null;
  humGain = null;
}
