"use client";

/* ============================================================================
 *  sound.tsx — tiny synthesized UI sounds via the Web Audio API.
 *
 *  No audio files: three short tones are generated in the browser, so this
 *  costs nothing to load. Sound is OFF by default and the choice persists in
 *  localStorage. The AudioContext is created lazily on the first real gesture,
 *  which is also what browser autoplay policies require.
 * ========================================================================= */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type SoundName = "hover" | "click" | "travel" | "theme";

const STORAGE_KEY = "captivate:sound";
const MASTER_VOLUME = 0.06; // deliberately quiet
const HOVER_THROTTLE_MS = 90;

/* --------------------------------------------------- preference store ----
 * localStorage is the source of truth. `storage` events only fire in OTHER
 * tabs, so same-tab writes notify through a local listener set. */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function isEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false; // private mode / storage blocked
  }
}

const isEnabledOnServer = () => false;

function setEnabled(next: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    /* ignore — the toggle simply won't persist */
  }
  for (const listener of listeners) listener();
}

/* ----------------------------------------------------------- audio api -- */

type SoundApi = {
  enabled: boolean;
  toggle: () => void;
  play: (name: SoundName) => void;
};

const SoundContext = createContext<SoundApi>({
  enabled: false,
  toggle: () => {},
  play: () => {},
});

export function useSound() {
  return useContext(SoundContext);
}

/** One short note, sweeping from `from` Hz to `to` Hz over `duration` seconds. */
type Note = {
  from: number;
  to: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  delay?: number;
};

const RECIPES: Record<SoundName, Note[]> = {
  // A soft, almost-subliminal tick when a link comes alive.
  hover: [{ from: 880, to: 940, duration: 0.05, type: "sine", gain: 0.5 }],
  // A firmer two-part click on activation.
  click: [
    { from: 520, to: 380, duration: 0.07, type: "triangle", gain: 0.9 },
    { from: 1180, to: 1180, duration: 0.03, type: "sine", gain: 0.35, delay: 0.01 },
  ],
  // A gentle rising pair under the light/dark wipe.
  theme: [
    { from: 430, to: 680, duration: 0.2, type: "sine", gain: 0.55 },
    { from: 860, to: 1360, duration: 0.26, type: "sine", gain: 0.22, delay: 0.05 },
  ],
  // A rising pair for the trip to the network — "opening a door".
  travel: [
    { from: 320, to: 620, duration: 0.16, type: "sine", gain: 0.8 },
    { from: 640, to: 1240, duration: 0.2, type: "sine", gain: 0.4, delay: 0.06 },
  ],
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, isEnabled, isEnabledOnServer);
  const ctxRef = useRef<AudioContext | null>(null);
  const lastHoverRef = useRef(0);

  const toggle = useCallback(() => setEnabled(!isEnabled()), []);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      if (name === "hover") {
        const now = performance.now();
        if (now - lastHoverRef.current < HOVER_THROTTLE_MS) return;
        lastHoverRef.current = now;
      }

      try {
        ctxRef.current ??= new AudioContext();
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") void ctx.resume();

        for (const note of RECIPES[name]) {
          const start = ctx.currentTime + (note.delay ?? 0);
          const end = start + note.duration;

          const osc = ctx.createOscillator();
          const amp = ctx.createGain();
          osc.type = note.type;
          osc.frequency.setValueAtTime(note.from, start);
          osc.frequency.exponentialRampToValueAtTime(note.to, end);

          // Ramp from a tiny non-zero value: exponential ramps can't touch 0.
          const peak = MASTER_VOLUME * note.gain;
          amp.gain.setValueAtTime(0.0001, start);
          amp.gain.exponentialRampToValueAtTime(peak, start + 0.012);
          amp.gain.exponentialRampToValueAtTime(0.0001, end);

          osc.connect(amp).connect(ctx.destination);
          osc.start(start);
          osc.stop(end + 0.02);
        }
      } catch {
        /* Web Audio unavailable — silently do nothing */
      }
    },
    [enabled],
  );

  const value = useMemo(
    () => ({ enabled, toggle, play }),
    [enabled, toggle, play],
  );

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

/* -------------------------------------------------------------- controls -- */

export function SoundToggle() {
  const { enabled, toggle, play } = useSound();

  return (
    <button
      type="button"
      onClick={() => {
        toggle();
        // Confirm the new state audibly, but only when turning sound ON.
        if (!enabled) window.setTimeout(() => play("click"), 0);
      }}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute interface sounds" : "Unmute interface sounds"}
      title={enabled ? "Sound on" : "Sound off"}
      className="grid size-8 place-items-center rounded-full text-muted transition-colors duration-200 hover:text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {enabled ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        ) : (
          <path d="m16 9 5 6m0-6-5 6" />
        )}
      </svg>
    </button>
  );
}
