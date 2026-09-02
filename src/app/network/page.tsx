import type { Metadata } from "next";

import { ChannelCard } from "@/components/channel-card";
import { FadeIn } from "@/components/fade-in";
import { BackLink } from "@/components/back-link";
import { BRAND, NETWORK_NOTE, orderedChannels, person } from "@/data/site";
import { compact } from "@/lib/format";
import { isUnlocked } from "@/lib/unlock";
import { getChannelStats } from "@/lib/youtube";
import { UnlockForm } from "@/components/unlock-form";

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
  const unlocked = await isUnlocked("network");

  /* Locked visitors get the shape of the network, not its identity: the
   * numbers stay, the names, avatars and links do not.
   *
   * Redacted HERE, on the server, and not merely hidden with CSS or skipped in
   * the markup. Everything handed to ChannelCard is serialised into the page
   * for React to pick up, so a name passed down and then not displayed would
   * still be sitting in the page source. What is not in this object never
   * leaves the building.
   *
   * slug included: it is derived from the channel name, so it gives the game
   * away as readily as the name does. */
  const channels = unlocked
    ? resolved
    : resolved.map((channel, index) => ({
        ...channel,
        slug: `locked-${index}`,
        name: `Channel ${index + 1}`,
        channelId: "",
        avatarUrl: null,
        /* Everything else about them goes too. Hiding the name while leaving
         * the description, the thank you and the exact subscriber count is not
         * hiding a channel, it is putting a hat on it. */
        role: undefined,
        note: "",
        highlight: undefined,
        credit: undefined,
        stats: null,
      }));

  const withStats = resolved.filter((channel) => channel.stats !== null);
  const totals = withStats.reduce(
    (acc, channel) => ({
      subscribers:
        acc.subscribers +
        (channel.subscribersHidden ? 0 : channel.stats!.subscribers),
      views: acc.views + channel.stats!.views,
      videos: acc.videos + channel.stats!.videos,
    }),
    { subscribers: 0, views: 0, videos: 0 },
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
            A small network of YouTube channels.
          </p>
        </FadeIn>

        {!unlocked && (
          <FadeIn delay={0.3}>
            <div className="mt-6 rounded-lg border border-dashed border-line px-4 py-5 pl-5 sm:pl-7">
              <p className="text-muted">
                The channels themselves aren&apos;t public yet. They will be
                before long. Until then the names, logos and links need
                authorised access.
              </p>
              <UnlockForm scope="network" label="Unlock" />
            </div>
          </FadeIn>
        )}
      </header>

      <section className="channel-grid mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2">
        {channels.map((channel, index) => (
          <ChannelCard
            key={channel.slug}
            channel={channel}
            index={index}
            locked={!unlocked}
          />
        ))}
      </section>

      {/* Room for the credit that hangs under a card, opened only while that
          card is hovered. See globals.css: everything below slides down to make
          way and slides back after, rather than a permanent gap sitting there
          for a thank you nobody is currently reading. */}
      <div className="credit-room" aria-hidden="true" />

      {/* The network at a glance, under the cards.
       *
       * Every number here is added up from the same live response the cards
       * use, so the summary can never disagree with the grid above it. */}
      <FadeIn delay={0.6}>
        <section className="mt-14 border-t border-line pt-10">
          <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div>
              <dt className="text-ink">Views</dt>
              <dd className="mt-0.5 text-muted">Total long form views</dd>
              <dd className="mt-3 text-3xl text-ink">
                {anyStats ? `${compact(totals.views)}+` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-ink">Videos</dt>
              <dd className="mt-0.5 text-muted">Across all channels</dd>
              <dd className="mt-3 text-3xl text-ink">
                {anyStats ? `${totals.videos}+` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-ink">Channels</dt>
              <dd className="mt-0.5 text-muted">Growing network</dd>
              <dd className="mt-3 text-3xl text-ink">{channels.length}+</dd>
            </div>
            <div>
              <dt className="text-ink">Subscribers</dt>
              <dd className="mt-0.5 text-muted">Across all channels</dd>
              <dd className="mt-3 text-3xl text-ink">
                {anyStats ? `${compact(totals.subscribers)}+` : "-"}
              </dd>
            </div>
          </dl>

          <p className="mt-8 flex max-w-md items-start gap-2.5 text-sm text-muted">
            {/* The same live dot as the header, so the claim and the proof
                that it is live sit together. */}
            <span
              className="relative mt-1.5 flex size-1.5 shrink-0"
              aria-hidden="true"
            >
              {isLive && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              )}
              <span
                className={`relative inline-flex size-1.5 rounded-full ${isLive ? "bg-accent" : "bg-muted"}`}
              />
            </span>
            <span>
              These come straight from the YouTube Data API and refresh on their
              own, so they are never typed in by hand. {NETWORK_NOTE}
            </span>
          </p>
        </section>
      </FadeIn>

      <FadeIn delay={0.75}>
        <footer className="mt-20 flex flex-wrap items-center justify-between gap-3 text-muted">
          <p>
            {BRAND} · {new Date().getFullYear()}
          </p>
          <BackLink label={`Built by ${person.name}`} silent />
        </footer>
      </FadeIn>
    </main>
  );
}
