"use client";

/* ============================================================================
 *  chat.tsx — the "me, kind of" chat.
 *
 *  Deliberately silent: no UI sounds in here. The rest of the site uses them
 *  sparingly, and a sound on every message would flatten that out.
 *
 *  You can send while a reply is still arriving, the way you can text someone
 *  mid-sentence. Doing so dumps whatever it had left to say into one bubble,
 *  so nothing is lost, then answers what you actually just said.
 *
 *  A reply arrives as several short messages, paced out one at a time with
 *  the typing indicator in between, rather than appearing all at once.
 *
 *  The composer owns its own draft state and is memoised, so none of that
 *  re-renders the text field while you are typing.
 *
 *  Everything about how the bot BEHAVES lives in src/data/persona.ts.
 * ========================================================================= */

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  CHAT_AUTO_MESSAGE,
  CHAT_AUTO_REPLY,
  CHAT_GREETING,
  CHAT_LIMITS,
  CHAT_SUGGESTIONS,
} from "@/data/persona";

type Message = { role: "user" | "assistant"; content: string };

const EASE = [0.22, 1, 0.36, 1] as const;
/** sessionStorage flag so a refresh in the same tab does not re-greet. */
const AUTO_GREET_KEY = "captivate:greeted";

/* A row of the conversation. `content: null` is the reply that has not landed
 * yet, drawn as the typing dots.
 *
 * The same row object becomes the real message when it arrives, which is the
 * point: the bubble is one element that changes what is inside it, not a
 * typing bubble discarded and a text bubble popped into its place. */
type Row = { role: Message["role"]; content: string | null };

function Dots() {
  return (
    <span className="flex items-center gap-1 py-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-chat-bubble-text/45"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.16,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

/* Bubble geometry is taken directly off the reference: 20px radius,
 * 8px/16px padding, 16px text on a 24px line, capped at 60% width. */
function Bubble({
  message,
  animate,
  live = false,
}: {
  message: Row;
  animate: boolean;
  /* Whether this is the bubble a reply is currently landing in. Only that one
   * gets a layout animation: `layout` measures against the viewport, and
   * inside a scrolling list every bubble would try to animate whenever the
   * list scrolled. */
  live?: boolean;
}) {
  const mine = message.role === "user";
  const typing = message.content === null;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 8, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE }}
      className={`flex ${mine ? "justify-end" : "justify-start"}`}
    >
      <motion.span
        layout={live}
        /* A spring, not a duration. The bubble is changing size, and an eased
         * duration starts abruptly and stops dead; a near critically damped
         * spring accelerates and settles instead, with no bounce at the end. */
        transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
        className={`max-w-[60%] rounded-[20px] px-4 py-2 text-base leading-6 ${
          mine
            ? "bg-chat-blue text-white"
            : "bg-chat-bubble text-chat-bubble-text"
        }`}
        aria-label={typing ? "typing" : undefined}
      >
        {typing ? (
          <Dots />
        ) : (
          /* `layout` here too, so Motion undoes the parent's scale on the way
             through. Without it the text is squashed while the bubble grows. */
          <motion.span
            layout={live}
            /* Only the reply fades its text in, as the bubble it lands in
               stretches to fit. A message you sent yourself arrives whole,
               the way it does in iMessage. This is read at mount, which is
               exactly the moment the dots turn into text. */
            initial={live && animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.08 }}
            className="block"
          >
            {message.content}
          </motion.span>
        )}
      </motion.span>
    </motion.div>
  );
}

/* Why the dots are a row of the list rather than something rendered after it.
 *
 * They occupy the exact slot the reply will land in, so when it arrives React
 * updates that row in place instead of unmounting one element and mounting
 * another. The bubble stretches to fit the text and the text fades in, the way
 * iMessage does it, rather than one bubble vanishing and another popping in.
 *
 * It is also what keeps the list still. An exit animation, or AnimatePresence,
 * would hold the dots' space past the render that adds the reply, and for
 * those frames the list holds both: a row too tall, the view follows it down,
 * the conversation shifts up, and a moment later it all drops back. That was
 * the bubble landing too high with the gap snapping shut under it. */

/* ------------------------------------------------------------- composer -- */

/* Memoised and owning its own draft, so nothing above it can cause a re-render
 * while you're typing. `onSend` must stay referentially stable for this to
 * work, which is why the parent wraps it in useCallback. */
const Composer = memo(function Composer({
  onSend,
  locked,
}: {
  onSend: (text: string) => void;
  locked: boolean;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text || locked) return;
    setDraft("");
    onSend(text);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      /* Frosted, so messages visibly blur out as they scroll behind it.
         The backdrop filters have to be Tailwind utilities: the CSS compiler
         silently drops a hand-written `backdrop-filter`, leaving only tint. */
      /* The composer gets a shadow the chips don't: it is the thing you act on,
         and a small tight one lifts it off the page. Kept low and close so it
         reads as lift rather than the grey halo a wide soft shadow gives. */
      /* The widening lives on the control stack in Chat, not here, so the
         chips and this bar keep the same left edge. */
      className={`glass-pill mt-2 flex items-center gap-2 rounded-full p-1 pl-4 shadow-[0_2px_10px_rgb(0_0_0/0.07)] ring-chat-blue/40 backdrop-blur-[14px] backdrop-saturate-[1.6] transition-all duration-200 focus-within:ring-2 dark:shadow-[0_2px_12px_rgb(0_0_0/0.4)] ${
        locked ? "opacity-40" : ""
      }`}
    >
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        /* Enter is handled here rather than relying on implicit form
           submission, which browsers suppress while the submit button is
           disabled. A fast typist can hit Enter before React has re-enabled
           the button, and the keystroke would otherwise be swallowed. */
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        maxLength={CHAT_LIMITS.maxMessageChars}
        disabled={locked}
        placeholder={locked ? "back tomorrow" : "ask me something"}
        aria-label="Message"
        className="chat-input min-w-0 flex-1 bg-transparent py-1.5 text-base text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!draft.trim() || locked}
        aria-label="Send message"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-chat-blue text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </form>
  );
});

/* ------------------------------------------------------------- pacing --- */

/* The model writes one message per line. Two things need fixing before those
 * become bubbles:
 *   - it sometimes breaks far too finely ("came out pretty good though" as its
 *     own bubble), so very short fragments get folded into their neighbour
 *   - more than MAX_BUBBLES is a wall of bubbles, so the tail gets merged
 */
/* How long to wait out a per-minute rate limit before trying again. Google's
 * window is a minute, but the allowance frees up continuously within it, so a
 * few seconds is normally enough. */
const MINUTE_LIMIT_RETRY_MS = 4000;

const MAX_BUBBLES = 3;
/** Anything shorter than this isn't really its own message. */
const MIN_BUBBLE_CHARS = 18;

function splitIntoMessages(reply: string): string[] {
  const lines = reply
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  // Fold runt fragments forward into the next line.
  const merged: string[] = [];
  for (const line of lines) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && previous.length < MIN_BUBBLE_CHARS) {
      merged[merged.length - 1] = `${previous} ${line}`;
    } else {
      merged.push(line);
    }
  }

  // If the last one is still a runt, fold it backwards instead.
  if (
    merged.length > 1 &&
    merged[merged.length - 1]!.length < MIN_BUBBLE_CHARS
  ) {
    const tail = merged.pop()!;
    merged[merged.length - 1] = `${merged[merged.length - 1]} ${tail}`;
  }

  if (merged.length <= MAX_BUBBLES) return merged;
  // Too many: keep the first ones and roll the rest into the last bubble.
  const head = merged.slice(0, MAX_BUBBLES - 1);
  return [...head, merged.slice(MAX_BUBBLES - 1).join(" ")];
}

/** Roughly how long someone would take to type this, in ms. */
/* Let a bubble finish stretching into place before the next set of dots
 * appears under it. The morph is a spring and takes about 450ms; starting the
 * next row on top of it is the stutter you get otherwise. */
const BUBBLE_SETTLE_MS = 380;

/* How long the dots stay up before the next bubble replaces them.
 *
 * The floor matters as much as the ceiling. The dots take 280ms just to
 * animate in, so anything near that and they are replaced before they have
 * finished arriving, and the bubble appears to pop in with no typing at all.
 * This is on top of whatever the model took, and a three bubble reply pays it
 * twice, so the ceiling stays low. */
function typingDelay(text: string): number {
  return Math.min(1400, Math.max(700, text.length * 16));
}

/* ---------------------------------------------------------- suggestions -- */

/* One horizontal row that scrolls sideways. The edges fade wherever there is
 * more content in that direction, which signals "this scrolls" now that the
 * scrollbar is hidden. The fade is written straight onto the node rather than
 * held in state: it changes on every scroll frame and none of it affects what
 * React renders. */
/* The fade is FIXED at both edges rather than switched on and off depending on
 * scroll position. Two reasons the conditional version looked wrong: swapping
 * the mask popped visibly, and at either end the fade vanished and left a hard
 * cut exactly where a chip was flush against the boundary.
 *
 * The row carries matching horizontal padding (FADE_PX), so at rest the first
 * and last chip sit past the fade and are never dimmed. Nothing to compute, no
 * state to get out of sync. */
const FADE_PX = 20;

/* Ease the page down so the whole chat is in view once it opens.
 *
 * Hand-rolled rather than scrollIntoView({ behavior: "smooth" }), because the
 * native curve is symmetrical: it creeps away at the start. This one leaves
 * immediately and coasts into place (ease-out cubic).
 *
 * The target is recomputed every frame on purpose. The panel is easing open at
 * the same time, so the document is still growing underneath this, and a
 * position measured once at the start would land short. */
function easePageTo(bottomOf: () => number, duration = 700) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const start = window.scrollY;
  const t0 = performance.now();
  let cancelled = false;

  /* Any deliberate scroll of their own wins immediately.
   *
   * Attached a frame late on purpose: this is kicked off from a send, and the
   * Enter key that asked for it may still be propagating. Attaching straight
   * away meant the scroll cancelled itself on the very keystroke that
   * requested it. */
  const stop = () => {
    cancelled = true;
    for (const e of ["wheel", "touchstart", "keydown"]) {
      window.removeEventListener(e, stop);
    }
  };
  requestAnimationFrame(() => {
    if (cancelled) return;
    for (const e of ["wheel", "touchstart", "keydown"]) {
      window.addEventListener(e, stop, { passive: true, once: true });
    }
  });

  function step(now: number) {
    if (cancelled) return;
    const t = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - t, 3);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    const want = Math.min(bottomOf() - window.innerHeight, max);
    if (want > start) window.scrollTo(0, start + (want - start) * eased);

    if (t < 1) requestAnimationFrame(step);
    else stop();
  }
  requestAnimationFrame(step);
}

/* Ease the message list down to its newest row.
 *
 * Assigning scrollTop moves the whole conversation in a single frame. When a
 * new row appears that reads as the stack being yanked upward, which is the
 * jolt; easing it means the text above glides instead.
 *
 * The bottom is recomputed every frame because the row that triggered this is
 * still animating: the dots grow in, or a bubble stretches to fit its text, so
 * a distance measured once at the start is already wrong by the end.
 *
 * Returns a cancel function. React runs it as effect cleanup, so a reply
 * arriving mid glide replaces the animation rather than fighting it. */
function easeListToBottom(el: HTMLElement, duration = 340): () => void {
  let cancelled = false;
  let frame = 0;

  const stop = () => {
    cancelled = true;
    if (frame) cancelAnimationFrame(frame);
    for (const e of ["wheel", "touchstart"]) el.removeEventListener(e, stop);
  };

  // Their own scrolling wins.
  for (const e of ["wheel", "touchstart"]) {
    el.addEventListener(e, stop, { passive: true, once: true });
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.scrollTop = el.scrollHeight;
    stop();
    return stop;
  }

  const start = el.scrollTop;
  const t0 = performance.now();

  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.scrollTop = start + (el.scrollHeight - el.clientHeight - start) * eased;
    if (t < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);

  return stop;
}

/** Gap left under the composer when the page eases the chat into view. */
const BREATHING_ROOM = 28;

/** The panel's height once opened, in px. It has exactly two sizes: the
 *  height of the greeting alone, and this. */
const PANEL_PX = 384;

/* A side only fades while a chip is actually crossing that border. At rest
 * there is nothing to the left, so no left fade and the first chip lines up
 * flush with the composer and the bubbles. Scrolled to the far right, nothing
 * is spilling past the right edge either, so that fade drops too.
 *
 * The mask stays within the row's own box; it is never pulled outside. */
function edgeMask(el: HTMLElement): string {
  const spillsLeft = el.scrollLeft > 1;
  const spillsRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;

  if (spillsLeft && spillsRight) {
    return `linear-gradient(to right, transparent 0, black ${FADE_PX}px, black calc(100% - ${FADE_PX}px), transparent 100%)`;
  }
  if (spillsRight) {
    return `linear-gradient(to right, black 0, black calc(100% - ${FADE_PX}px), transparent 100%)`;
  }
  if (spillsLeft) {
    return `linear-gradient(to right, transparent 0, black ${FADE_PX}px, black 100%)`;
  }
  return "none";
}

function applyEdgeMask(el: HTMLElement | null): void {
  if (!el) return;
  const mask = edgeMask(el);
  el.style.maskImage = mask;
  el.style.webkitMaskImage = mask;
}

function TrashIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* lid drawn separately so it can tilt on its own */}
      <path d="M4 7h16" />
      <path d="M10 4h4" />
      <path d="M6.5 7l.9 12.1a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L17.5 7" />
      <path d="M10.5 11v5M13.5 11v5" />
    </svg>
  );
}

/** Timings for the bin sequence, in seconds. */
const BIN_IN = 0.18;
const CHIP_FALL = 0.42;
const BIN_OUT = 0.22;
const DISMISS_TOTAL_MS = (BIN_IN + CHIP_FALL + BIN_OUT + 0.14) * 1000;

/* A bin that pops up, takes a hit as something lands in it, then leaves. */
function Bin({ size = "size-5" }: { size?: string }) {
  return (
    <motion.span
      className="grid place-items-center text-muted"
      initial={{ scale: 0.3, opacity: 0, y: 10 }}
      animate={{
        scale: [0.3, 1.08, 1, 0.86, 1.04, 0.5],
        opacity: [0, 1, 1, 1, 1, 0],
        y: [10, 0, 0, 3, -2, 4],
        rotate: [0, 0, 0, -7, 5, 0],
      }}
      transition={{
        duration: BIN_IN + CHIP_FALL + BIN_OUT,
        times: [0, 0.22, 0.48, 0.62, 0.78, 1],
        ease: "easeOut",
      }}
    >
      <TrashIcon className={size} />
    </motion.span>
  );
}

/* One chip. Hovering reveals a small x; pressing it plays the bin sequence:
 * the bin pops up, the chip tips over and drops into it, the bin takes the
 * impact and leaves. The chip is only removed from the list once that has
 * finished, so the row never jumps mid-animation. */
function Chip({
  label,
  onPick,
  onDismiss,
  flight,
  flightDelay = 0,
}: {
  label: string;
  onPick: (text: string) => void;
  onDismiss: () => void;
  /** Set when the whole row is being cleared: where to fly to. */
  flight?: { dx: number; dy: number };
  flightDelay?: number;
}) {
  const [dismissing, setDismissing] = useState(false);

  const startDismiss = () => {
    if (dismissing) return;
    setDismissing(true);
    window.setTimeout(onDismiss, DISMISS_TOTAL_MS);
  };

  // Flying to the master bin takes priority over an individual dismissal.
  const flying = flight !== undefined;

  return (
    /* The flight lives on THIS element, not the inner one. Motion's `layout`
     * writes its own transform to the layout element, which silently cancelled
     * a transform animated on a child: the chips just sat there. */
    <motion.div
      layout={!flying}
      data-chip={label}
      className="relative shrink-0"
      style={flying ? { zIndex: 20 } : undefined}
      animate={
        flying
          ? {
              x: flight.dx,
              y: flight.dy,
              scale: 0,
              opacity: [1, 1, 0],
              rotate: 28,
            }
          : { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }
      }
      transition={
        flying
          ? {
              duration: 0.52,
              delay: flightDelay,
              ease: [0.5, 0, 0.9, 0.35],
              opacity: {
                times: [0, 0.8, 1],
                duration: 0.52,
                delay: flightDelay,
              },
            }
          : { duration: 0.2, ease: EASE }
      }
    >
      {/* The bin sits above the chip, so the chip visibly drops behind it. */}
      <AnimatePresence>
        {dismissing && !flying && (
          <span className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <Bin />
          </span>
        )}
      </AnimatePresence>

      {/* This inner element only handles the single-chip dismiss. The flight
          is on the parent, so the two never fight over one transform. */}
      <motion.div
        animate={
          dismissing
            ? { y: 26, scale: 0.12, opacity: 0, rotate: 14 }
            : { y: 0, scale: 1, opacity: 1, rotate: 0 }
        }
        transition={
          dismissing
            ? { duration: CHIP_FALL, delay: BIN_IN, ease: [0.5, 0, 0.75, 0] }
            : { duration: 0.2, ease: EASE }
        }
        /* Each chip is its own piece of glass, not a flat thing sitting inside
           one big glass capsule. */
        className="glass-pill group flex items-center rounded-full pr-1 backdrop-blur-[14px] backdrop-saturate-[1.6] transition-shadow duration-200"
      >
        <button
          type="button"
          onClick={() => onPick(label)}
          className="whitespace-nowrap py-1 pl-3 pr-1 text-sm text-muted transition-colors duration-200 group-hover:text-ink"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={startDismiss}
          aria-label={`Remove "${label}"`}
          className="grid size-5 shrink-0 place-items-center rounded-full text-muted opacity-0 transition-all duration-200 hover:bg-line hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-3"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* The scrolling row of chips, and nothing else. The master control used to
 * live in here as a flex sibling, which forced the row to share a horizontal
 * band with it and left the composer spilling past the message scrollbar. It
 * is now a separate element positioned against the panel, so this row and the
 * composer can share one clean right edge. */
const Suggestions = memo(function Suggestions({
  rowRef,
  chips,
  flights,
  onPick,
  onDismiss,
  onHoverChange,
}: {
  rowRef: React.MutableRefObject<HTMLDivElement | null>;
  chips: string[];
  flights: Record<string, { dx: number; dy: number }> | null;
  onPick: (text: string) => void;
  onDismiss: (label: string) => void;
  /** Drives the master control's visibility. It sits outside this row in the
   *  DOM, so CSS group-hover cannot reach it from here. */
  onHoverChange: (hovering: boolean) => void;
}) {
  /** Where the eased wheel scrolling is heading, and its animation handle. */
  const targetLeftRef = useRef(0);
  const wheelAnimRef = useRef(0);

  const setRow = useCallback(
    (el: HTMLDivElement | null) => {
      rowRef.current = el;
      applyEdgeMask(el); // measure once laid out
    },
    [rowRef],
  );

  /* Overflow depends on width AND on how many chips there are, so the fades
   * are rechecked on resize and whenever the list changes. Without the second
   * one, removing a chip shrinks the row but leaves the old mask applied, and
   * a fade that is no longer needed stays switched on. */
  useEffect(() => {
    applyEdgeMask(rowRef.current);
    const onResize = () => applyEdgeMask(rowRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rowRef, chips.length]);

  /* A mouse wheel only scrolls vertically, so without this the row looks
   * scrollable and refuses to move. Turning wheel motion sideways also has to
   * preventDefault or the page scrolls at the same time, and that needs a
   * native non-passive listener: React registers onWheel as passive, where
   * preventDefault is ignored. The lock holds at both ends, since releasing
   * there meant overscrolling flung the whole page.
   *
   * Eased rather than instant: writing scrollLeft straight from the wheel
   * delta moves the row in hard jumps. The wheel sets a target and each frame
   * closes a fraction of the gap, which reads as momentum. */
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const step = () => {
      const node = rowRef.current;
      if (!node) {
        wheelAnimRef.current = 0;
        return;
      }
      const gap = targetLeftRef.current - node.scrollLeft;
      if (Math.abs(gap) < 0.5) {
        node.scrollLeft = targetLeftRef.current;
        wheelAnimRef.current = 0;
        applyEdgeMask(node);
        return;
      }
      node.scrollLeft += gap * 0.16;
      applyEdgeMask(node);
      wheelAnimRef.current = requestAnimationFrame(step);
    };

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll
      event.preventDefault();
      const delta =
        Math.abs(event.deltaY) > Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;

      const max = el.scrollWidth - el.clientWidth;
      if (!wheelAnimRef.current) targetLeftRef.current = el.scrollLeft;
      targetLeftRef.current = Math.max(
        0,
        Math.min(max, targetLeftRef.current + delta),
      );
      if (!wheelAnimRef.current) {
        wheelAnimRef.current = requestAnimationFrame(step);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelAnimRef.current) cancelAnimationFrame(wheelAnimRef.current);
      wheelAnimRef.current = 0;
    };
  }, [rowRef, chips.length]);

  if (chips.length === 0) return null;

  return (
    <div
      ref={setRow}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onScroll={(event) => {
        // Keep the eased-scroll target in sync with drags and touch flicks.
        if (!wheelAnimRef.current) {
          targetLeftRef.current = event.currentTarget.scrollLeft;
        }
        applyEdgeMask(event.currentTarget);
      }}
      /* No horizontal padding and no negative margin: the row sits flush, and
         the fade is switched on per side only while something is crossing
         that border. */
      className="no-scrollbar flex gap-2 overflow-x-auto py-1"
    >
      {chips.map((suggestion, index) => (
        <Chip
          key={suggestion}
          label={suggestion}
          onPick={onPick}
          flight={flights?.[suggestion]}
          flightDelay={index * 0.07}
          onDismiss={() => onDismiss(suggestion)}
        />
      ))}
    </div>
  );
});

/* ----------------------------------------------------------------- chat -- */

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  /** A calm one-liner under the chat: rate limit, quota, or a hiccup. */
  const [notice, setNotice] = useState<string | null>(null);
  /** True once the free daily allowance is gone, which closes the input. */
  const [exhausted, setExhausted] = useState(false);
  /** True when the message list is scrolled down, which fades its top edge. */
  const [scrolled, setScrolled] = useState(false);

  /** Random per-visit id, only used to group messages in the Discord log. */
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current) {
    sessionIdRef.current = Math.random().toString(36).slice(2, 10);
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  /** The messages themselves, measured while the panel around them animates. */
  const contentRef = useRef<HTMLDivElement>(null);
  /** Mirrors `scrolled` so the scroll handler only sets state on a change. */
  const scrolledRef = useRef(false);

  /* Suggestion chips. Held here rather than inside Suggestions so the master
   * control can live outside the scrolling row, past the message scrollbar. */
  const [chips, setChips] = useState<string[]>(CHAT_SUGGESTIONS);
  const [flights, setFlights] = useState<Record<
    string,
    { dx: number; dy: number }
  > | null>(null);
  const chipsRowRef = useRef<HTMLDivElement | null>(null);
  const binRef = useRef<HTMLDivElement | null>(null);

  const dismissChip = useCallback((label: string) => {
    setChips((current) => current.filter((c) => c !== label));
  }, []);

  /* The master control is only offered while the pointer is over the chips
   * themselves, not anywhere in the chat. Hiding is delayed a beat because
   * the scrollbar gutter sits between the row and the control, so travelling
   * to it crosses a gap that would otherwise blink it out mid-reach. */
  const [chipsHovered, setChipsHovered] = useState(false);
  const hoverOutRef = useRef(0);

  const setChipsHover = useCallback((hovering: boolean) => {
    window.clearTimeout(hoverOutRef.current);
    if (hovering) {
      setChipsHovered(true);
      return;
    }
    hoverOutRef.current = window.setTimeout(() => setChipsHovered(false), 220);
  }, []);

  /* Master clear: every chip flies to the bin that appears where the master x
   * was. Travel vectors are measured at click time from the live layout, so
   * they stay correct however far the row happens to be scrolled. */
  const clearAll = () => {
    if (flights) return;
    const row = chipsRowRef.current;
    const target = binRef.current?.getBoundingClientRect();
    if (!row || !target) return;

    const targetX = target.left + target.width / 2;
    const targetY = target.top + target.height / 2;

    const next: Record<string, { dx: number; dy: number }> = {};
    for (const node of row.querySelectorAll<HTMLElement>("[data-chip]")) {
      const label = node.dataset.chip;
      if (!label) continue;
      const box = node.getBoundingClientRect();
      next[label] = {
        dx: targetX - (box.left + box.width / 2),
        // +3px so they land inside the bin body, not on its rim.
        dy: targetY + 3 - (box.top + box.height / 2),
      };
    }

    setFlights(next);
    window.setTimeout(() => {
      setChips([]);
      setFlights(null);
    }, 1050);
  };
  /** Mirrors `messages`, so two sends in one tick both see the latest list. */
  const messagesRef = useRef<Message[]>([]);
  /** Lets a new send cancel the reply that is still streaming. */
  const abortRef = useRef<AbortController | null>(null);
  /** Stops the scroll-triggered greeting firing more than once per mount. */
  const autoGreetedRef = useRef(false);
  /** Read inside the stable send callback so it never needs to be rebuilt. */
  const exhaustedRef = useRef(exhausted);
  exhaustedRef.current = exhausted;

  const commit = useCallback((next: Message[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  /* Messages of the current reply that have not been shown yet. */
  const pendingPartsRef = useRef<string[]>([]);

  /* Called when the visitor talks over a reply that is still arriving: show
   * everything still queued at once, in a single bubble, rather than dropping
   * it or letting it trickle in behind the new question. */
  const flushPlayout = useCallback(() => {
    const remaining = pendingPartsRef.current;
    pendingPartsRef.current = [];
    if (remaining.length === 0) return;
    commit([
      ...messagesRef.current,
      { role: "assistant", content: remaining.join(" ") },
    ]);
  }, [commit]);

  /* Deliver a reply the way a person texts: one bubble, then typing dots for
   * as long as the next one would plausibly take, then the next bubble. */
  const playOut = useCallback(
    async (parts: string[], controller: AbortController) => {
      pendingPartsRef.current = [...parts];

      for (;;) {
        if (controller.signal.aborted) return;

        const part = pendingPartsRef.current.shift();
        if (part === undefined) return; // interrupted and flushed

        setPending(false);
        commit([...messagesRef.current, { role: "assistant", content: part }]);

        const upcoming = pendingPartsRef.current[0];
        if (upcoming === undefined) return;

        // Let that bubble land before anything else moves under it.
        await new Promise((resolve) =>
          window.setTimeout(resolve, BUBBLE_SETTLE_MS),
        );
        if (controller.signal.aborted) return;

        // Back to the typing indicator while "writing" the next one.
        setPending(true);
        await new Promise((resolve) =>
          window.setTimeout(resolve, typingDelay(upcoming)),
        );
      }
    },
    [commit],
  );

  /* The panel rests at the height of the greeting alone, then opens to full
   * size the first time a message is sent, and never resizes again.
   *
   * Two heights and one transition for the life of the conversation. A panel
   * that grew with every reply was the source of the jolt: while it eased to
   * its new height it was briefly shorter than the text inside it, so the list
   * turned scrollable for a few hundred milliseconds and the stack shifted
   * under the bubble that had just landed. A box that never changes size after
   * the first message cannot do that. */
  const openedRef = useRef(false);
  /** One page-ease, on the visitor's first message. */
  const pageEasedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current || messages.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    openedRef.current = true;

    /* Pin the current auto height so the transition has a number to ease FROM,
     * force that to land, then set the target. Without the forced reflow the
     * browser coalesces both writes and the panel snaps. */
    el.style.height = `${el.getBoundingClientRect().height}px`;
    void el.offsetHeight;
    el.style.height = `${PANEL_PX}px`;
  }, [messages.length]);

  /* Keep the newest message in view, once there is anything to keep in view. */
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content) return;

    /* Nothing to scroll to until the conversation is taller than the panel,
     * and measuring the content rather than the box keeps that true even
     * during the one opening transition. */
    if (content.scrollHeight <= PANEL_PX) return;

    return easeListToBottom(el);
  }, [messages, pending]);

  /* Note: deliberately NOT aborting the in-flight request on unmount.
   * React's dev StrictMode mounts, unmounts and remounts every component, and
   * an unmount abort here killed the scroll-triggered greeting the moment it
   * fired: the "Hi" appeared, the request was cancelled, and no reply ever
   * arrived. A request left to finish after unmount is harmless; its state
   * updates are discarded. New sends still abort the previous one. */

  const send = useCallback(
    async (content: string) => {
      if (!content || exhaustedRef.current) return;

      setNotice(null);

      /* If a reply is still being paced out, the visitor has talked over it.
       * Dump everything it had left to say as one bubble so nothing is lost,
       * then carry on with the new message. */
      flushPlayout();

      // Interrupt whatever is in flight; you're allowed to talk over it.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const next: Message[] = [
        ...messagesRef.current,
        { role: "user", content },
      ];
      commit(next);
      setPending(true);

      /* Bring the whole chat into view, once, the first time they send
       * something themselves.
       *
       * Deliberately not tied to the panel opening. The chat greets people by
       * itself when it scrolls into view, which opens the panel while they are
       * still scrolling the page by hand: easing the page under them there is
       * hostile, and their scrolling cancelled it anyway, which used up the
       * one shot before they had typed a word. */
      if (!pageEasedRef.current) {
        pageEasedRef.current = true;
        const panel = scrollRef.current;
        if (panel) {
          easePageTo(
            () =>
              window.scrollY +
              panel.getBoundingClientRect().top +
              PANEL_PX +
              BREATHING_ROOM,
          );
        }
      }

      try {
        const ask = () =>
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: next,
              sessionId: sessionIdRef.current,
            }),
            signal: controller.signal,
          });

        let response = await ask();

        /* Google caps requests per minute as well as per day. The per-minute
         * cap clears in seconds, so wait it out once and ask again rather than
         * telling someone the chat is busy over something that fixes itself.
         * The typing dots stay up throughout, so it reads as thinking. */
        if (
          response.status === 429 &&
          response.headers.get("X-Chat-Limit") !== "day"
        ) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, MINUTE_LIMIT_RETRY_MS),
          );
          if (controller.signal.aborted) return;
          response = await ask();
        }

        if (!response.ok || !response.body) {
          const body = (await response.text()) || "that didn't send";
          setNotice(body);
          // Only a DAILY limit closes the chat. A per-minute one clears on its
          // own, so leave the input open and fade the message out shortly.
          if (response.headers.get("X-Chat-Limit") === "day") {
            setExhausted(true);
          } else if (response.status === 429) {
            window.setTimeout(() => setNotice(null), 6000);
          }
          setPending(false);
          return;
        }

        /* Read the whole reply before showing any of it. The typing dots are
         * already on screen during the fetch, and pacing the bubbles out needs
         * to know how many there are. Replies are short, so this costs nothing
         * perceptible. */
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reply = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) return;
          reply += decoder.decode(value, { stream: true });
        }

        const parts = splitIntoMessages(reply);
        if (parts.length === 0) {
          setNotice("no reply came back");
          return;
        }

        await playOut(parts, controller);
      } catch (error) {
        // An abort is us interrupting on purpose, not a failure.
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setNotice("couldn't reach the server");
      } finally {
        // Only the newest request may clear the spinner.
        if (abortRef.current === controller) setPending(false);
      }
    },
    [commit, flushPlayout, playOut],
  );

  /* The opening exchange is scripted, not generated. It reads the same every
   * time regardless, this guarantees the exact wording, and it means someone
   * who only scrolls past costs nothing against the daily allowance. */
  const greet = useCallback(async () => {
    if (exhaustedRef.current) return;

    commit([
      ...messagesRef.current,
      { role: "user", content: CHAT_AUTO_MESSAGE },
    ]);

    setPending(true);
    await new Promise((resolve) =>
      window.setTimeout(resolve, typingDelay(CHAT_AUTO_REPLY[0] ?? "")),
    );

    // A fresh controller so an interrupt cancels this the same as any reply.
    const controller = new AbortController();
    abortRef.current = controller;
    await playOut([...CHAT_AUTO_REPLY], controller);
  }, [commit, playOut]);

  /* Say hi by itself the first time someone scrolls the chat into view, so it
   * reads as a live conversation rather than a screenshot.
   *
   * Guarded twice: a ref stops it firing more than once per mount, and
   * sessionStorage stops it firing again on a refresh in the same tab. Each
   * trigger is a real API request, so an unguarded version would burn the
   * daily allowance on people who never type anything. */
  useEffect(() => {
    if (!CHAT_AUTO_MESSAGE || autoGreetedRef.current) return;

    try {
      if (window.sessionStorage.getItem(AUTO_GREET_KEY)) {
        autoGreetedRef.current = true;
        return;
      }
    } catch {
      /* storage blocked; the ref guard alone still applies */
    }

    /* A plain rect check on scroll rather than IntersectionObserver. IO is the
     * tidier API but it silently never fires inside some embedded browser
     * views, and a greeting that just doesn't happen is invisible to debug.
     * This works anywhere getBoundingClientRect does. */
    let lastCheck = 0;

    const check = () => {
      if (autoGreetedRef.current) return;
      const node = scrollRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 0;
      // Mostly scrolled into view, not merely peeking over the bottom edge.
      const inView = rect.top < viewportHeight * 0.9 && rect.bottom > 0;
      if (!inView) return;

      autoGreetedRef.current = true;
      try {
        window.sessionStorage.setItem(AUTO_GREET_KEY, "1");
      } catch {
        /* ignore */
      }
      stop();
      void greet();
    };

    const onScroll = () => {
      const now = Date.now();
      if (now - lastCheck < 100) return;
      lastCheck = now;
      check();
    };

    function stop() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check(); // in case the chat is already on screen at load

    return stop;
  }, [greet]);

  return (
    /* Content sits at the TOP and the box grows downward: it opens at min-h
     * with some room under the greeting, and stretches to max-h as the
     * conversation fills it, then scrolls.
     *
     * Top alignment is the half that matters most. Bottom-aligned content in
     * a fixed box stranded a lone greeting at the floor. A fixed 24rem box
     * was right for a full conversation but far too tall for one message. */
    <div className="relative">
      {/* Right-hand edges, panel-relative, are deliberate and must not overlap:
       *    controls (chips + composer) end at  panel - 48
       *    message scrollbar occupies          panel - 38 .. panel - 32
       *    master x occupies                   panel - 24 .. panel
       *  mr-8 on the list is what puts its scrollbar in that gap; a padded
       *  wrapper did not constrain the list's own box, so the scrollbar stayed
       *  at the panel edge underneath the x. */}
      <div
        ref={scrollRef}
        onScroll={(event) => {
          /* Only the top scrim. Nothing here may move a bubble: a scroll-driven
           * transform on the stack read as the whole conversation lurching
           * every time a reply landed. */
          const top = event.currentTarget.scrollTop > 4;
          if (top !== scrolledRef.current) {
            scrolledRef.current = top;
            setScrolled(top);
          }
        }}
        className="chat-scroll mr-8 overflow-y-auto pr-2 pt-1"
        aria-live="polite"
      >
        <div ref={contentRef} className="space-y-2">
          <Bubble
            message={{ role: "assistant", content: CHAT_GREETING }}
            animate={false}
          />

          {(pending
            ? [...messages, { role: "assistant" as const, content: null }]
            : messages
          ).map((row, index, rows) => (
            <Bubble
              key={index}
              message={row}
              animate
              live={index === rows.length - 1 && row.role === "assistant"}
            />
          ))}

          {/* Clears the controls stacked at the bottom, so the newest message
              comes to rest above the glass rather than under it. */}
          <div className="h-24" aria-hidden="true" />
        </div>
      </div>

      {/* Scrim, not a mask: page-coloured and masked into a gradient, so
          messages dissolve into the page as they pass beneath it. Only shown
          once there is history above, or the first bubble would sit in a
          permanent haze. */}
      <div
        className={`chat-fade-top pointer-events-none absolute inset-x-0 top-0 h-10 transition-opacity duration-300 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Controls float over the message area and stop short of the scrollbar,
          so nothing spills past it. right-10 lines their edge up with the
          message text, which the list insets by the same amount. */}
      {/* right-[38px] puts the controls flush against the scrollbar: 32px for
          the list margin plus the 6px scrollbar itself. Any more and they
          leave a gap; any less and they slide underneath it. */}
      <div className="absolute bottom-0 left-0 right-[38px]">
        <AnimatePresence>
          {notice && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mb-2 flex items-center gap-2 text-muted"
            >
              <span
                className="size-1 shrink-0 rounded-full bg-muted"
                aria-hidden="true"
              />
              {notice}
            </motion.p>
          )}
        </AnimatePresence>

        {!exhausted && (
          <Suggestions
            rowRef={chipsRowRef}
            chips={chips}
            flights={flights}
            onPick={send}
            onDismiss={dismissChip}
            onHoverChange={setChipsHover}
          />
        )}
        <Composer onSend={send} locked={exhausted} />
      </div>

      {/* Master control: its own element pinned to the far right of the panel,
          clear of both the chips row and the message scrollbar. */}
      {!exhausted && chips.length > 0 && (
        <div
          ref={binRef}
          onMouseEnter={() => setChipsHover(true)}
          onMouseLeave={() => setChipsHover(false)}
          className="absolute bottom-[3.4rem] right-0 grid size-6 place-items-center"
        >
          {flights ? (
            <Bin size="size-6" />
          ) : (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Remove all suggestions"
              className={`grid size-6 place-items-center rounded-full text-muted transition-all duration-200 hover:text-ink focus-visible:opacity-100 ${
                chipsHovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="size-3.5"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
