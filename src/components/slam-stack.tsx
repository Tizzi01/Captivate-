"use client";

/* ============================================================================
 *  slam-stack.tsx — pictures dealt onto a pile, not scrolled past.
 *
 *  The technique is taken from Arlan's ransom-note piece, which he publishes
 *  as a free resource: https://www.arlan.me/vault/ransom-note
 *  There each cut-out letter is slammed down by hand; here the same treatment
 *  is applied to photographs stacked vertically.
 *
 *  What makes it read as "placed" rather than "faded in":
 *
 *  1. The entrance is a CSS transition, not a keyframe. Every item renders in
 *     its hidden state, then one flag flips on the next frame and they all
 *     transition to rest. Nothing is animated imperatively.
 *
 *  2. The stagger is transition-delay per item, so the browser owns the
 *     timing. Item n starts n * STAGGER_MS after the flip.
 *
 *  3. Each item over-rotates on the way in, at 1.25x its resting tilt, and
 *     untwists as it lands. That, more than the movement, is what sells it as
 *     being put down rather than appearing.
 *
 *  4. It rises from below while unblurring, under a shadow that never changes.
 *     The shadow staying put is what keeps it feeling like a physical thing
 *     moving rather than an image being drawn.
 *
 *  5. The tilts come from a seeded generator, so the pile is arranged at
 *     random but identically on every render. A picture does not jump to a new
 *     angle when React re-renders around it.
 * ========================================================================= */

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

const RISE_EASE = "cubic-bezier(.16,1,.3,1)";
const IN_MS = 460;
/** Gap between one item starting and the next.
 *
 *  Longer than the original's 26ms, because that is tuned for the letters of a
 *  word, where a dozen items are in flight at once. A handful of photographs
 *  spaced that tightly land as one movement. */
const STAGGER_MS = 90;
/** How far below its resting place an item starts. */
const RISE_PX = 30;
const BLUR_PX = 3.5;

/** Constant, and deliberately so: see (4) above. */
const SHADOW =
  "drop-shadow(0 2px 3px rgba(20,20,25,0.16)) drop-shadow(0 6px 10px rgba(20,20,30,0.10))";

/* A small deterministic generator, so the pile is arranged the same way every
 * time. Both of these are standard: mulberry32 and FNV-1a. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Placed = {
  /** How strongly this one reacts to the pointer, 0 to 1. Varying it stops
   *  the pile moving as a single sheet. */
  depth: number;
  /** Resting tilt, degrees. */
  rot: number;
  /** Resting nudge sideways, px. Sideways rather than vertical: these are
   *  stacked, and a vertical nudge would just make the gaps look wrong. */
  dx: number;
  /** Resting size, a hair either side of 1. */
  scale: number;
};

export type Jitter = { rot: number; dx: number; scale: number };

export const DEFAULT_JITTER: Jitter = { rot: 2.2, dx: 9, scale: 0.02 };

/** One draw of the pile. Same seed, same arrangement, every time. */
export function composeStack(
  count: number,
  seed: number,
  jitter: Jitter = DEFAULT_JITTER,
): Placed[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    rot: (rnd() * 2 - 1) * jitter.rot,
    dx: (rnd() * 2 - 1) * jitter.dx,
    scale: 1 + (rnd() * 2 - 1) * jitter.scale,
    depth: 0.35 + rnd() * 0.65,
  }));
}

export function Slam({
  placed,
  idx,
  z = 1,
  className = "",
  children,
}: {
  placed: Placed;
  idx: number;
  /** Where it sits in the pile. Raised while it is being dragged. */
  z?: number;
  className?: string;
  children: ReactNode;
}) {
  const delay = idx * STAGGER_MS;

  /* Two layers, as in the original, and they must stay two.
   *
   * The outer is the pointer's: the lean, the drag and the spring back, driven
   * every frame by use-magnetism through these four variables. It carries no
   * transition, because a spring that is also being eased by CSS fights
   * itself.
   *
   * The inner is the entrance's, and it is the one with the transition on it.
   * Splitting them is what lets a picture be dragged around mid-entrance
   * without the two animations overwriting each other's transform. */
  const outer: CSSProperties = {
    transform: `translate(calc(${placed.dx.toFixed(2)}px + var(--px, 0px)), var(--py, 0px)) rotate(var(--pr, 0deg)) scale(var(--ps, 1))`,
    lineHeight: 0,
    // Positioned so it can be stacked, and lifted above its neighbours on grab.
    position: "relative",
    zIndex: z,
    cursor: "grab",
    /* "none" here, which is what a drag wants, meant a finger placed on a
       picture could not scroll the page at all: every touch became a drag and
       the gallery was a wall. "pan-y" gives vertical scrolling back to the
       browser, which is what a phone is overwhelmingly being asked for, and
       still lets a mouse drag in any direction. The touch drag itself is
       turned off in use-magnetism. */
    touchAction: "pan-y",
    willChange: "transform",
  };

  const rest = `translateY(0px) rotate(${placed.rot.toFixed(2)}deg) scale(${placed.scale.toFixed(3)})`;
  const hidden = `translateY(${RISE_PX}px) rotate(${(placed.rot * 1.25).toFixed(2)}deg) scale(${(placed.scale * 0.96).toFixed(3)})`;

  /* Rendered hidden, then flipped to rest on the node itself.
   *
   * Written straight to the element rather than through React state: the flip
   * has to land in a separate frame from the first paint or the browser has no
   * "before" to transition from, and a state update for something the DOM can
   * do on its own is a re-render for nothing.
   *
   * The transition and its per item delay are already on the element, so this
   * only supplies the end values; the browser does the rest. */
  const innerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const land = () => {
      el.style.transform = rest;
      el.style.opacity = "1";
      el.style.filter = `${SHADOW} blur(0px)`;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transition = "none";
      land();
      return;
    }

    // A frame later, so the hidden state has been painted to move away from.
    const frame = requestAnimationFrame(land);
    /* Backstop for a tab that is not painting, where rAF never runs. Late
     * enough that the frame above always wins when the tab is visible. */
    const backstop = window.setTimeout(land, 120);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(backstop);
    };
  }, [rest]);

  const inner: CSSProperties = {
    display: "block",
    transformOrigin: "center center",
    transform: hidden,
    opacity: 0,
    filter: `${SHADOW} blur(${BLUR_PX}px)`,
    transition: [
      `transform ${IN_MS}ms ${RISE_EASE} ${delay}ms`,
      `opacity ${Math.round(IN_MS * 0.7)}ms ease ${delay}ms`,
      `filter ${IN_MS}ms ease ${delay}ms`,
    ].join(", "),
    willChange: "transform, opacity, filter",
  };

  return (
    <span
      style={outer}
      className={`${className} active:cursor-grabbing`}
      /* How use-magnetism finds them, and how hard each one is pulled. */
      data-magnet=""
      data-depth={placed.depth.toFixed(2)}
    >
      <span ref={innerRef} style={inner}>
        {children}
      </span>
    </span>
  );
}
