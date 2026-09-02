"use client";

/* Quiet credit link from the Captivate site back to the personal site. */

import Link from "next/link";
import { useSound } from "@/components/sound";

export function BackLink({ label }: { label: string }) {
  const { play } = useSound();

  return (
    <Link
      href="/"
      onPointerEnter={() => play("hover")}
      onClick={() => play("travel")}
      className="group relative text-muted transition-colors duration-200 hover:text-ink"
    >
      {label}
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </Link>
  );
}
