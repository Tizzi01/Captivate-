"use client";

/* A phrase that finishes its own thought when you hover it.
 *
 * The treatment the trip to Japan uses, minus the pictures: the extra words are
 * set inline, after the phrase, so they carry on the line rather than floating
 * over it, and they are not in the page at all until hovered.
 *
 * This lives on its own rather than inside bio.tsx because the page heading
 * wants the same behaviour, and a second copy of it would drift from this one
 * the first time either was touched. */

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useSound } from "@/components/sound";

export function HoverAside({ label, lead }: { label: string; lead: string }) {
  const [shown, setShown] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const { play } = useSound();

  // Tapping elsewhere closes it on touch devices, which have no hover.
  useEffect(() => {
    if (!shown) return;
    const onDocPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setShown(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [shown]);

  const show = () => {
    if (!shown) play("hover");
    setShown(true);
  };

  return (
    /* The wrapper covers the phrase and the words it reveals, so reading to
       the end of them does not dismiss them halfway. */
    <span
      ref={wrapperRef}
      onMouseEnter={show}
      onMouseLeave={() => setShown(false)}
    >
      <button
        type="button"
        onClick={() => setShown((prev) => !prev)}
        onFocus={show}
        aria-expanded={shown}
        className="group relative cursor-help text-ink transition-colors duration-200 hover:text-accent"
      >
        {label}
        <span className="absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
        <span className="absolute -bottom-px left-0 h-px w-full bg-line" />
      </button>

      <AnimatePresence>
        {shown && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            /* Set inline, after the phrase, never before: if it appeared in
               front, the phrase would move and the pointer would slide off the
               very thing holding it open. */
            className="text-muted"
          >
            {lead}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
