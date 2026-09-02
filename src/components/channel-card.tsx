"use client";

/* One channel in the network grid. Purely presentational — it renders whatever
 * getChannelStats() resolved, so adding a channel means editing site.ts only. */

import Image from "next/image";
import { motion } from "motion/react";

import { useSound } from "@/components/sound";
import { TiltCard } from "@/components/tilt-card";
import { compact, exact } from "@/lib/format";
import type { ResolvedChannel } from "@/lib/youtube";

function Stat({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div>
      <div title={title} className="text-lg leading-none text-ink">
        {value}
      </div>
      <div className="mt-1.5 truncate text-[0.7rem] uppercase tracking-[0.1em] text-muted">
        {label}
      </div>
    </div>
  );
}

/* Splits a line so one phrase inside it can carry more weight than the rest.
 *
 * The emphasis is set in the ink colour rather than made bold, so it darkens in
 * light mode and lightens in dark rather than being nailed to black. Falls back
 * to the plain line if the phrase is not in it, so a typo in the data loses the
 * emphasis and never the sentence. */
function withEmphasis(text: string, phrase?: string) {
  if (!phrase) return text;

  const at = text.indexOf(phrase);
  if (at === -1) return text;

  return (
    <>
      {text.slice(0, at)}
      <span className="text-ink">{phrase}</span>
      {text.slice(at + phrase.length)}
    </>
  );
}

export function ChannelCard({
  channel,
  index,
  locked = false,
}: {
  channel: ResolvedChannel;
  index: number;
  /* Identity withheld. The server has already stripped the name, avatar and
   * id out of `channel` before it got here, so this only decides how to
   * present the absence: no link to follow, and a lock where the logo goes. */
  locked?: boolean;
}) {
  const { play } = useSound();
  const { stats } = channel;
  /* A locked card is not a link: there is nowhere to send anyone, and the id
   * that would build the URL was never sent. */
  const Wrapper = locked ? "div" : "a";
  const href = `https://www.youtube.com/channel/${channel.channelId}`;

  const subscriberValue = channel.subscribersHidden
    ? "Hidden"
    : stats
      ? compact(stats.subscribers)
      : "-";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.2 + index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <TiltCard
        className="h-full"
        data-credit={channel.credit ? "" : undefined}
      >
        <Wrapper
          {...(locked
            ? {}
            : {
                href,
                target: "_blank",
                rel: "noreferrer noopener",
                onPointerEnter: () => play("hover"),
                onClick: () => play("click"),
              })}
          className={`group relative flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition-all duration-300 ease-out ${
            locked ? "" : "hover:border-ink/25"
          }`}
        >
          {/* header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {locked ? (
                <div
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-full border border-line text-muted"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="size-4"
                  >
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>
              ) : channel.avatarUrl ? (
                <Image
                  src={channel.avatarUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 rounded-full border border-line object-cover"
                  unoptimized
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-full border border-line text-muted"
                >
                  {channel.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="leading-tight text-ink">{channel.name}</h3>
                {channel.role && (
                  <p className="mt-0.5 text-muted">{channel.role}</p>
                )}
              </div>
            </div>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 shrink-0 text-muted transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
              aria-hidden="true"
            >
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </div>

          {/* stats */}
          <div className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4">
            <Stat
              label="Subs"
              value={subscriberValue}
              title={
                stats && !channel.subscribersHidden
                  ? exact(stats.subscribers)
                  : undefined
              }
            />
            <Stat
              label="Views"
              value={stats ? compact(stats.views) : "-"}
              title={stats ? exact(stats.views) : undefined}
            />
            <Stat label="Videos" value={stats ? exact(stats.videos) : "-"} />
          </div>

          {/* note */}
          {channel.note ? (
            <p className="mt-4 flex-1 text-muted">{channel.note}</p>
          ) : (
            <div className="flex-1" />
          )}

          {/* Someone to thank, hanging under the card rather than over it.
            It used to sit inside, across the note, which meant hovering to
            read the credit hid the sentence it was crediting. Below the
            bottom edge it covers nothing. */}
          {channel.credit && (
            <span className="pointer-events-none absolute left-0 right-0 top-full z-20 mt-2 flex translate-y-1 items-start gap-2.5 rounded-lg border border-line bg-surface/95 p-3 opacity-0 shadow-[0_12px_34px_-12px_rgb(0_0_0/0.4)] backdrop-blur-sm transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
              {/* The face and the name together, so it is obvious whose face
                  it is. An arrow pointing at it would need explaining; a name
                  under a photograph does not. */}
              <span className="flex shrink-0 flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={channel.credit.avatar}
                  alt=""
                  className="size-9 rounded-full border border-line object-cover"
                  loading="lazy"
                />
                <span className="text-[0.65rem] leading-none text-muted">
                  {channel.credit.name}
                </span>
              </span>
              <span className="text-xs leading-snug text-muted">
                {withEmphasis(channel.credit.text, channel.credit.emphasis)}
              </span>
            </span>
          )}

          {channel.highlight && (
            <p className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
              <span
                className="size-1 rounded-full bg-accent"
                aria-hidden="true"
              />
              {channel.highlight}
            </p>
          )}
        </Wrapper>
      </TiltCard>
    </motion.article>
  );
}
