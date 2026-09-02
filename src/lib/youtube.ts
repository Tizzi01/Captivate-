/* ============================================================================
 *  youtube.ts — server-side YouTube Data API v3 access.
 *
 *  SECURITY: this module is imported only by server components. The API key is
 *  read from process.env and never reaches the browser bundle. Do not import
 *  this file from a "use client" component.
 *
 *  Cost: one channels.list call covers every channel in one request and costs
 *  1 quota unit. At STATS_REVALIDATE_SECONDS = 300 that is 288 units/day out
 *  of a 10,000/day free allowance, regardless of how much traffic the site gets.
 * ========================================================================= */

import {
  STATS_REVALIDATE_SECONDS,
  type Channel,
  type Stats,
} from "@/data/site";

/** Where a card's numbers came from — the UI is honest about this. */
export type StatsSource = "live" | "fallback" | "unavailable";

export type ChannelStats = {
  stats: Stats | null;
  source: StatsSource;
  /** Channel avatar from the API; null when unavailable (UI draws a monogram). */
  avatarUrl: string | null;
  /** True when the channel owner has hidden their subscriber count. */
  subscribersHidden: boolean;
};

export type ResolvedChannel = Channel & ChannelStats;

type ApiItem = {
  id: string;
  snippet?: {
    title?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

const ENDPOINT = "https://www.googleapis.com/youtube/v3/channels";

function toInt(value: string | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetch stats for every channel in one request.
 * Never throws: on any failure each channel falls back to its configured
 * numbers, or to "unavailable" if it has none.
 */
export async function getChannelStats(
  list: Channel[],
): Promise<ResolvedChannel[]> {
  const key = process.env.YOUTUBE_API_KEY;

  const withFallback = (reason: string): ResolvedChannel[] => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[youtube] using fallback stats: ${reason}`);
    }
    return list.map((channel) => ({
      ...channel,
      stats: channel.fallback ?? null,
      source: channel.fallback ? ("fallback" as const) : ("unavailable" as const),
      avatarUrl: null,
      subscribersHidden: false,
    }));
  };

  if (!key) return withFallback("YOUTUBE_API_KEY is not set");
  if (list.length === 0) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", list.map((c) => c.channelId).join(","));
  url.searchParams.set("key", key);

  let payload: { items?: ApiItem[] };
  try {
    const response = await fetch(url, {
      next: { revalidate: STATS_REVALIDATE_SECONDS },
    });
    if (!response.ok) {
      return withFallback(`API responded ${response.status}`);
    }
    payload = await response.json();
  } catch (error) {
    return withFallback(`request failed: ${String(error)}`);
  }

  const byId = new Map<string, ApiItem>();
  for (const item of payload.items ?? []) byId.set(item.id, item);

  return list.map((channel) => {
    const item = byId.get(channel.channelId);
    if (!item?.statistics) {
      return {
        ...channel,
        stats: channel.fallback ?? null,
        source: channel.fallback ? ("fallback" as const) : ("unavailable" as const),
        avatarUrl: null,
        subscribersHidden: false,
      };
    }

    const thumbs = item.snippet?.thumbnails ?? {};
    const avatarUrl =
      thumbs.medium?.url ?? thumbs.high?.url ?? thumbs.default?.url ?? null;

    return {
      ...channel,
      stats: {
        subscribers: toInt(item.statistics.subscriberCount),
        views: toInt(item.statistics.viewCount),
        videos: toInt(item.statistics.videoCount),
      },
      source: "live" as const,
      avatarUrl,
      subscribersHidden: Boolean(item.statistics.hiddenSubscriberCount),
    };
  });
}


/* Formatting helpers live in src/lib/format.ts so that client
 * components can use them without pulling in this server-only module. */
