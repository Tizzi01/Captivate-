"use client";

/* ============================================================================
 *  intro.tsx — the opening paragraphs, plus the "other stuff" they hide.
 *
 *  The point of the page is that it says very little up front. The extra
 *  details exist, but only once someone chooses to open them. This component
 *  owns that open/closed state; everything it renders comes from site.ts.
 * ========================================================================= */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Segments } from "@/components/bio";
import type { Paragraph } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Intro({
  paragraphs,
  extras,
}: {
  paragraphs: Paragraph[];
  extras: Paragraph[];
}) {
  const [open, setOpen] = useState(false);
  const disclosure = { open, onToggle: () => setOpen((prev) => !prev) };

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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            /* Clipped so the list slides out from behind the line above
               rather than appearing all at once. */
            className="overflow-hidden"
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
