"use client";

/* ============================================================================
 *  script-entry.tsx — one script on /scripts.
 *
 *  The thumbnail is a still until you click it, then it swaps to the real
 *  player. That keeps the page light (no YouTube iframes loading on arrival,
 *  no tracking until someone actually asks to watch) and keeps it quiet
 *  visually, which is the point of the page.
 * ========================================================================= */

import { useState } from "react";

import { useSound } from "@/components/sound";
import type { Script } from "@/data/site";

/** Pulls the id out of any normal YouTube URL: watch?v=, youtu.be/, /embed/,
 *  /shorts/. Returns null if it can't, and the entry degrades to a link. */
export function youtubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function ScriptEntry({ script }: { script: Script }) {
  const [playing, setPlaying] = useState(false);
  const { play } = useSound();
  const id = youtubeId(script.youtubeUrl);

  return (
    <article className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {id === null ? (
          <a
            href={script.youtubeUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="grid aspect-video place-items-center text-muted transition-colors duration-200 hover:text-ink"
          >
            Watch on YouTube
          </a>
        ) : playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
            title={script.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              play("click");
              setPlaying(true);
            }}
            onPointerEnter={() => play("hover")}
            aria-label={`Play ${script.title}`}
            className="group relative block aspect-video w-full"
          >
            {/* Plain img: YouTube's still, straight from their CDN. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              loading="lazy"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/15 transition-colors duration-300 group-hover:bg-black/25">
              <span className="grid size-12 place-items-center rounded-full bg-bg/85 text-ink backdrop-blur-sm transition-transform duration-300 ease-out group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="ml-0.5 size-5"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-ink">{script.title}</h2>
        <span className="text-muted">{script.views} views</span>
      </div>

      <a
        href={script.docUrl}
        target="_blank"
        rel="noreferrer noopener"
        onPointerEnter={() => play("hover")}
        onClick={() => play("click")}
        className="group inline-flex items-center gap-1.5 text-ink transition-colors duration-200 hover:text-accent"
      >
        Script
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </article>
  );
}
