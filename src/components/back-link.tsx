"use client";

/* Back to the previous level. Used as a quiet credit link on /network, and as
 * the only way out of /scripts, where it carries an arrow so it reads as a
 * back control rather than a stray name. */

import Link from "next/link";
import { useSound } from "@/components/sound";

export function BackLink({
  label,
  arrow = false,
  href = "/",
}: {
  label: string;
  arrow?: boolean;
  href?: string;
}) {
  const { play } = useSound();

  return (
    <Link
      href={href}
      onPointerEnter={() => play("hover")}
      onClick={() => play("travel")}
      className="group inline-flex items-center gap-1.5 text-muted transition-colors duration-200 hover:text-ink"
    >
      {arrow && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 transition-transform duration-300 ease-out group-hover:-translate-x-0.5"
          aria-hidden="true"
        >
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
      )}
      {/* The underline tracks the word only, never the arrow. */}
      <span className="relative">
        {label}
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100" />
      </span>
    </Link>
  );
}
