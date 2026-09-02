"use client";

/* ============================================================================
 *  tilt-card.tsx — a pane of glass that turns to face the pointer.
 *
 *  The behaviour is taken from Arlan's holo card, which he publishes as a free
 *  resource: https://www.arlan.me/vault/holo
 *
 *  What is kept is the feel: the card turns toward the pointer on a spring,
 *  the light that lands on it lags a beat behind the turn, letting go throws it
 *  slightly past level before it settles, and left alone it drifts.
 *
 *  What is dropped is the foil. The original is rainbow, which would be loud
 *  next to everything else here, so the surface is glass instead: one
 *  specular highlight, a sheen that slides across, and a rim that lights on
 *  whichever edge is turned toward you. All of it in the palette already on
 *  the page, so it reads as material rather than as colour.
 *
 *  Everything is written to CSS variables rather than React state. This runs
 *  every frame the pointer moves, and re-rendering a tree that often to turn a
 *  card two degrees is the wrong tool.
 * ========================================================================= */

import { useEffect, useRef, type ReactNode } from "react";

/** How far the card turns at full deflection, in degrees. */
const MAX_TILT = 9;

/* Two springs at different stiffnesses. The card turns on the first, the light
 * follows on the second, and because the second is slacker the highlight
 * arrives a moment after the movement. That lag is most of what sells it as
 * something with a surface rather than a div being rotated. */
const TILT_STIFFNESS = 0.16;
const LIGHT_STIFFNESS = 0.09;

/** Under this, it has stopped and the loop can too. */
const ASLEEP = 0.0008;

type Vec = { x: number; y: number };

class Follow {
  value: Vec = { x: 0, y: 0 };
  target: Vec = { x: 0, y: 0 };
  velocity: Vec = { x: 0, y: 0 };

  constructor(private stiffness: number) {}

  step() {
    const px = this.value.x;
    const py = this.value.y;
    this.value.x += (this.target.x - this.value.x) * this.stiffness;
    this.value.y += (this.target.y - this.value.y) * this.stiffness;
    this.velocity.x = this.value.x - px;
    this.velocity.y = this.value.y - py;
  }

  get settled(): boolean {
    return (
      Math.abs(this.target.x - this.value.x) < ASLEEP &&
      Math.abs(this.target.y - this.value.y) < ASLEEP
    );
  }
}

/* The throw on release. Carries the speed the card was moving at into a short
 * decaying push, so letting go mid-turn coasts past level and comes back
 * instead of stopping dead where the pointer left it. */
class Kick {
  private amount: Vec = { x: 0, y: 0 };
  private life = 0;

  fire(v: Vec, gain = 2.4) {
    if (Math.hypot(v.x, v.y) < 0.002) return;
    this.amount = { x: v.x * gain, y: v.y * gain };
    this.life = 1;
  }

  step(): Vec {
    if (this.life <= 0) return { x: 0, y: 0 };
    this.life = Math.max(0, this.life - 0.035);
    const e = Math.sin(this.life * Math.PI) * this.life;
    return { x: this.amount.x * e, y: this.amount.y * e };
  }

  get active(): boolean {
    return this.life > 0;
  }
}

const clamp = (v: number, min = -1, max = 1) => Math.min(Math.max(v, min), max);
const mix = (v: number, a: number, b: number) => a + ((b - a) * (v + 1)) / 2;

export function TiltCard({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Record<`data-${string}`, string | undefined>) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tilt = new Follow(TILT_STIFFNESS);
    const light = new Follow(LIGHT_STIFFNESS);
    const kick = new Kick();

    let frame = 0;
    let running = false;
    let onScreen = false;
    let hidden = false;
    let pointerOn = false;
    let aim: Vec = { x: 0, y: 0 };
    let drift = 0;

    const paint = () => {
      const { x, y } = tilt.value;
      const l = light.value;
      const s = host.style;

      // The turn itself.
      s.setProperty("--rx", `${(-y * MAX_TILT).toFixed(2)}deg`);
      s.setProperty("--ry", `${(x * MAX_TILT).toFixed(2)}deg`);

      /* Where the light lands, on the slower spring so it trails the turn. */
      s.setProperty("--gx", `${mix(l.x, 12, 88).toFixed(1)}%`);
      s.setProperty("--gy", `${mix(l.y, 12, 88).toFixed(1)}%`);

      /* How far from level, 0 to 1. Everything that should strengthen as the
       * card turns reads this: the highlight, the sheen, the shadow. */
      const off = Math.min(1, Math.hypot(x, y));
      s.setProperty("--off", off.toFixed(3));

      /* The sheen slides across as it turns, and the rim lights on whichever
       * edge is coming toward you. */
      s.setProperty("--sheen", `${mix(l.x, -30, 130).toFixed(1)}%`);
      s.setProperty("--edge-l", Math.max(0, -x).toFixed(3));
      s.setProperty("--edge-r", Math.max(0, x).toFixed(3));
      s.setProperty("--edge-t", Math.max(0, -y).toFixed(3));
      s.setProperty("--edge-b", Math.max(0, y).toFixed(3));
    };

    const tick = () => {
      frame = 0;

      if (!pointerOn) {
        /* Left alone it drifts, very slightly, on two out of step sines so it
         * never repeats a path exactly. Enough to look alive, not enough to
         * catch your eye while reading. */
        drift += 0.0035;
        tilt.target = {
          x: Math.sin(drift) * 0.16,
          y: Math.cos(drift * 0.73) * 0.12,
        };
      } else {
        tilt.target = aim;
      }

      const k = kick.step();
      if (k.x || k.y) {
        tilt.target = { x: tilt.target.x + k.x, y: tilt.target.y + k.y };
      }

      tilt.step();
      light.target = tilt.value;
      light.step();
      paint();

      if (running && (!tilt.settled || !light.settled || kick.active)) {
        frame = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const wake = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const box = host.getBoundingClientRect();
      aim = {
        x: clamp(((event.clientX - box.left) / box.width) * 2 - 1),
        y: clamp(((event.clientY - box.top) / box.height) * 2 - 1),
      };
      pointerOn = true;
      wake();
    };

    const onLeave = () => {
      pointerOn = false;
      // Whatever speed it was turning at becomes the throw.
      kick.fire(tilt.velocity);
      wake();
    };

    /* Nothing animates off screen, in a hidden tab, or for anyone who asked
     * for less motion. A grid of these all running at once is the difference
     * between a page that feels alive and a page that heats a laptop. */
    const sync = () => {
      const should = onScreen && !hidden;
      if (should) wake();
      else {
        running = false;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: "150px" },
    );
    io.observe(host);

    const onVisibility = () => {
      hidden = document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    return () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={hostRef} className={`tilt-host ${className}`} {...rest}>
      <div className="tilt-card">
        {children}
        {/* The surface, over the content: one highlight where the light lands,
            one sheen sliding across, one rim on the leading edge. */}
        <span className="tilt-glare" aria-hidden="true" />
        <span className="tilt-sheen" aria-hidden="true" />
        <span className="tilt-rim" aria-hidden="true" />
      </div>
    </div>
  );
}
