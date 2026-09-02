"use client";

/* ============================================================================
 *  intro.tsx — the opening paragraphs, plus the "other stuff" they hide.
 *
 *  The point of the page is that it says very little up front. The extra
 *  details exist, but only once someone chooses to open them. This component
 *  owns that open/closed state; everything it renders comes from site.ts.
 * ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Segments } from "@/components/bio";
import type { Paragraph } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;
/** How long the list takes to open. Kept next to the value it must outlast. */
const OPEN_MS = 320;

export function Intro({
  paragraphs,
  extras,
}: {
  paragraphs: Paragraph[];
  extras: Paragraph[];
}) {
  const [open, setOpen] = useState(false);
  const disclosure = { open, onToggle: () => setOpen((prev) => !prev) };

  /* The list has to be clipped while it opens, so it slides out from behind
   * the line above instead of appearing whole. It then has to STOP being
   * clipped, because the hover cards inside are absolutely positioned and hang
   * below the list: anything still clipping cuts them off at the bottom.
   *
   * Released on a timer, set straight on the node. Motion's own hooks for this
   * (transitionEnd, onAnimationComplete) both depend on the animation actually
   * reporting completion, and it does not always arrive; the card stayed cut
   * off. A timer does not care. */
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    // Closing: clip again at once, so the list collapses cleanly.
    if (!open) {
      el.style.overflow = "hidden";
      return;
    }

    el.style.overflow = "hidden";
    const release = window.setTimeout(() => {
      el.style.overflow = "visible";
    }, OPEN_MS + 60);
    return () => window.clearTimeout(release);
  }, [open]);

  return (
    <div className="space-y-3.5 text-muted">
      {paragraphs.map((paragraph, index) => (
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 + index * 0.09, ease: EASE }}
        >
          <Segments paragraph={paragraph} disclosure={disclosure} />
        </motion.p>
      ))}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="other-stuff"
            ref={boxRef}
            /* overflow is deliberately absent from all three of these, and
               from the className: it belongs to the effect above, and Motion
               must not write over it. */
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: OPEN_MS / 1000, ease: EASE }}
          >
            <ul className="space-y-2.5 border-l border-line pl-4 pt-3.5">
              {extras.map((paragraph, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.06 + index * 0.05,
                    ease: EASE,
                  }}
                >
                  <Segments paragraph={paragraph} />
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
