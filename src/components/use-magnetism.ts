"use client";

/* ============================================================================
 *  use-magnetism.ts — hover lean, drag, and spring back.
 *
 *  The other half of the ransom-note feel. The entrance in slam-stack.tsx puts
 *  the pictures down; this is what makes them behave like objects afterwards.
 *  They lean toward the cursor as it passes, they can be picked up and thrown
 *  about, and they spring home when let go.
 *
 *  The original piece imports a hook like this but does not publish it, so the
 *  physics here is written from scratch. The contract it has to meet is
 *  visible in the part that is published: every item's outer transform reads
 *  --px, --py, --pr and --ps, and carries a depth used to weight how strongly
 *  it reacts. This writes exactly those four variables.
 *
 *  Why CSS variables and not React state: this runs on every frame the pointer
 *  moves. Re-rendering a component tree sixty times a second to shift a
 *  picture a few pixels is the wrong tool. The browser can composite a
 *  transform without React hearing about it at all.
 * ========================================================================= */

import { useEffect, type RefObject } from "react";

/** How far away the pointer can be and still pull on something, in px. */
const RADIUS = 300;
/** How far an item at full depth leans toward the pointer, in px. */
const REACH = 18;
/** How much it twists as it leans, in degrees. */
const TWIST = 5;
/** How much it swells as the pointer closes in. */
const SWELL = 0.035;

/* Spring constants. The settle is deliberately a little under-damped: it
 * arrives, goes very slightly past, and comes back. That overshoot is what
 * reads as weight, rather than as an element being repositioned. */
const REST_STIFFNESS = 0.11;
const REST_DAMPING = 0.68;

/* Dragging is stiffer and damped harder, so it tracks the hand closely instead
 * of trailing behind it on a piece of elastic. */
const DRAG_STIFFNESS = 0.4;
const DRAG_DAMPING = 0.6;

/** Below this everything has stopped, and so can the loop. */
const ASLEEP = 0.01;

type Node = {
  el: HTMLElement;
  depth: number;
  x: number;
  y: number;
  r: number;
  s: number;
  vx: number;
  vy: number;
  vr: number;
  vs: number;
  tx: number;
  ty: number;
  tr: number;
  ts: number;
  dragging: boolean;
  grabX: number;
  grabY: number;
};

function spring(
  current: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
): [number, number] {
  const next = (velocity + (target - current) * stiffness) * damping;
  return [current + next, next];
}

export function useMagnetism(host: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = host.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = new Map<HTMLElement, Node>();
    let pointerX = 0;
    let pointerY = 0;
    let pointerInside = false;
    /* A plain flag rather than the frame id. Keying "is the loop running" off
     * an id means a cancelled or already-fired frame leaves a stale non-zero
     * value, wake() decides there is nothing to start, and everything freezes
     * halfway home. */
    let running = false;
    let frame = 0;

    const scan = () => {
      for (const el of root.querySelectorAll<HTMLElement>("[data-magnet]")) {
        if (nodes.has(el)) continue;
        nodes.set(el, {
          el,
          depth: Number(el.dataset.depth ?? 0.6),
          x: 0,
          y: 0,
          r: 0,
          s: 1,
          vx: 0,
          vy: 0,
          vr: 0,
          vs: 0,
          tx: 0,
          ty: 0,
          tr: 0,
          ts: 1,
          dragging: false,
          grabX: 0,
          grabY: 0,
        });
      }
      for (const el of [...nodes.keys()]) {
        if (!el.isConnected) nodes.delete(el);
      }
    };

    /** Where each item wants to be, given where the pointer is. */
    const aim = () => {
      for (const node of nodes.values()) {
        if (node.dragging) continue;

        if (!pointerInside) {
          node.tx = 0;
          node.ty = 0;
          node.tr = 0;
          node.ts = 1;
          continue;
        }

        const box = node.el.getBoundingClientRect();
        const dx = pointerX - (box.left + box.width / 2);
        const dy = pointerY - (box.top + box.height / 2);
        const distance = Math.hypot(dx, dy);

        if (distance > RADIUS) {
          node.tx = 0;
          node.ty = 0;
          node.tr = 0;
          node.ts = 1;
          continue;
        }

        /* Falls off faster than linearly, so the pull is felt around the
         * picture rather than as the whole pile drifting at the cursor. */
        const pull = (1 - distance / RADIUS) ** 1.6 * node.depth;
        const unit = distance || 1;

        node.tx = (dx / unit) * REACH * pull;
        node.ty = (dy / unit) * REACH * pull;
        node.tr = (dx / RADIUS) * TWIST * pull;
        node.ts = 1 + SWELL * pull;
      }
    };

    const tick = () => {
      let moving = false;

      for (const node of nodes.values()) {
        const stiffness = node.dragging ? DRAG_STIFFNESS : REST_STIFFNESS;
        const damping = node.dragging ? DRAG_DAMPING : REST_DAMPING;

        [node.x, node.vx] = spring(
          node.x,
          node.vx,
          node.tx,
          stiffness,
          damping,
        );
        [node.y, node.vy] = spring(
          node.y,
          node.vy,
          node.ty,
          stiffness,
          damping,
        );
        [node.r, node.vr] = spring(
          node.r,
          node.vr,
          node.tr,
          stiffness,
          damping,
        );
        [node.s, node.vs] = spring(
          node.s,
          node.vs,
          node.ts,
          stiffness,
          damping,
        );

        node.el.style.setProperty("--px", node.x.toFixed(2) + "px");
        node.el.style.setProperty("--py", node.y.toFixed(2) + "px");
        node.el.style.setProperty("--pr", node.r.toFixed(3) + "deg");
        node.el.style.setProperty("--ps", node.s.toFixed(4));

        if (
          node.dragging ||
          Math.abs(node.vx) > ASLEEP ||
          Math.abs(node.vy) > ASLEEP ||
          Math.abs(node.x - node.tx) > ASLEEP ||
          Math.abs(node.y - node.ty) > ASLEEP
        ) {
          moving = true;
        }
      }

      // Stop once everything has settled and nothing is hovering it.
      if (moving || pointerInside) {
        frame = requestAnimationFrame(tick);
      } else {
        running = false;
        frame = 0;
      }
    };

    const wake = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    /* Tracked on the window and decided by geometry, rather than by
     * pointerenter and pointerleave on the host.
     *
     * Those two are unreliable here: the pile lives in a scrolling dialog, its
     * items are dragged out from under the cursor, and a leave that arrives
     * while the loop is asleep does nothing. Asking "is the pointer over the
     * host right now" on every move cannot get out of step. */
    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      const box = root.getBoundingClientRect();
      pointerInside =
        pointerX >= box.left - RADIUS &&
        pointerX <= box.right + RADIUS &&
        pointerY >= box.top - RADIUS &&
        pointerY <= box.bottom + RADIUS;

      for (const node of nodes.values()) {
        if (!node.dragging) continue;
        node.tx = event.clientX - node.grabX;
        node.ty = event.clientY - node.grabY;
        /* Tips the way it is being pulled, like something held at one corner
         * rather than carried flat. */
        node.tr = Math.max(-12, Math.min(12, node.tx * 0.06));
        node.ts = 1.03;
      }

      aim();
      wake();
    };

    const onPointerLeave = () => {
      pointerInside = false;
      aim();
      wake();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-magnet]",
      );
      if (!target) return;
      const node = nodes.get(target);
      if (!node) return;

      // Otherwise the browser starts its own image drag instead.
      event.preventDefault();
      target.setPointerCapture(event.pointerId);

      node.dragging = true;
      node.el.dataset.dragging = "true";
      node.grabX = event.clientX - node.x;
      node.grabY = event.clientY - node.y;
      wake();
    };

    const release = (event: PointerEvent) => {
      for (const node of nodes.values()) {
        if (!node.dragging) continue;
        node.dragging = false;
        delete node.el.dataset.dragging;
        try {
          node.el.releasePointerCapture(event.pointerId);
        } catch {
          /* capture already gone */
        }
      }
      // Targets return to the magnet, and the spring carries it home.
      aim();
      wake();
    };

    scan();
    const observer = new MutationObserver(() => {
      scan();
      wake();
    });
    observer.observe(root, { childList: true, subtree: true });

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    /* Still worth having: the pointer can leave the window entirely without a
     * final move event inside it. */
    document.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [host]);
}
