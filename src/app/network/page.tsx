import type { Metadata } from "next";

import { ChannelCard } from "@/components/channel-card";
import { FadeIn } from "@/components/fade-in";
import { BackLink } from "@/components/back-link";
import { BRAND, orderedChannels, person } from "@/data/site";
import { compact } from "@/lib/format";
import { getChannelStats } from "@/lib/youtube";

/* This page is written to stand on its own — it carries the Captivate brand,
 * not Tizzi's, so the URL can be shared by itself without handing someone a
 * personal portfolio. The only personal reference is one credit in the footer. */

export const metadata: Metadata = {
  title: {
    absolute: `${BRAND} · Network`,
  },
  description: `${BRAND} is a network of YouTube channels. Live subscriber and view counts.`,
};

export default async function NetworkPage() {
  // Server-side. One request covers every channel; the result is cached and
  // revalidated on the interval set in src/data/site.ts.
  const resolved = await getChannelStats(orderedChannels);

  const withStats = resolved.filter((channel) => channel.stats !== null);
  const totals = withStats.reduce(
    (acc, channel) => ({
      subscribers:
        acc.subscribers + (channel.subscribersHidden ? 0 : channel.stats!.subscribers),
      views: acc.views + channel.stats!.views,
    }),
    { subscribers: 0, views: 0 },
  );

  const isLive = resolved.some((channel) => channel.source === "live");
  const anyStats = withStats.length > 0;

  return (
    <main className="mx-auto w-full max-w-[var(--measure)] px-6 pb-24 pt-20 sm:pt-28">
      <header>
        <FadeIn y={8}>
          <h1 className="text-ink">{BRAND}</h1>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="mt-4 pl-5 text-muted sm:pl-7">
            A small network of YouTube channels. Subscriber and view counts come
            straight from the YouTube Data API and refresh on their own.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 pl-5 text-muted sm:pl-7">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex size-1.5" aria-hidden="true">
                {isLive && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                )}
                <span
                  className={`relative inline-flex size-1.5 rounded-full ${isLive ? "bg-accent" : "bg-muted"}`}
                />
              </span>
              {isLive
                ? "Live"
                : anyStats
                  ? "Showing saved figures"
                  : "Live stats offline"}
            </span>

            {anyStats && (
              <>
                <span>
                  <span className="text-ink">{compact(totals.subscribers)}</span>{" "}
                  subscribers
                </span>
                <span>
                  <span className="text-ink">{compact(totals.views)}</span> views
                </span>
              </>
            )}
          </div>
        </FadeIn>
      </header>

      <section className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2">
        {resolved.map((channel, index) => (
          <ChannelCard key={channel.slug} channel={channel} index={index} />
        ))}
      </section>

      <FadeIn delay={0.7}>
        <footer className="mt-20 flex flex-wrap items-center justify-between gap-3 text-muted">
          <p>
            {BRAND} · {new Date().getFullYear()}
          </p>
          <BackLink label={`Built by ${person.name}`} />
        </footer>
      </FadeIn>
    </main>
  );
}
