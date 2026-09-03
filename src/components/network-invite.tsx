"use client";

/* The doorway to the Crantwiz site. Kept as a small chip rather than a big
 * banner — it should read as a distinct destination without shouting, which is
 * roughly how arlan.me treats its "Vault" link. */

import { motion } from "motion/react";

import { useSound } from "@/components/sound";

export function NetworkInvite({
  brand,
  channelCount,
  href,
}: {
  brand: string;
  channelCount: number;
  href: string;
}) {
  const { play } = useSound();

  // Crantwiz is its own destination, so this is always a full outbound
  // navigation in a new tab — even while it still lives at an in-site path.
  // The moment CRANTWIZ_URL points at a real domain, nothing here changes.
  const anchorProps = {
    href,
    target: "_blank",
    rel: "noreferrer noopener",
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.65 }}
    >
      <a
        {...anchorProps}
        onPointerEnter={() => play("hover")}
        onClick={() => play("travel")}
        className="group inline-flex items-center gap-2.5 rounded-md border border-line px-2.5 py-1.5 text-ink transition-colors duration-300 hover:border-ink/30"
      >
        <span className="relative flex size-1.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
        </span>

        {brand}

        <span className="text-muted">
          {channelCount} {channelCount === 1 ? "channel" : "channels"}
        </span>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 text-muted transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:text-ink"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </motion.div>
  );
}
