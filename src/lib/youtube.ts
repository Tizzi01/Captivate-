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
 *
 *  A channel whose total is stale costs 2 more units per refresh while it is
 *  stale, and nothing once YouTube catches up. See countViewsFromVideos.
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
  contentDetails?: {
    relatedPlaylists?: { uploads?: string };
  };
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
const PLAYLIST_ITEMS = "https://www.googleapis.com/youtube/v3/playlistItems";
const VIDEOS = "https://www.googleapis.com/youtube/v3/videos";

/** Most uploads worth adding up before giving in. Five pages, and a bound on
 *  what a stale channel can cost per refresh. */
const MAX_VIDEOS_TO_COUNT = 250;

/* Add up the views of a channel's uploads, one video at a time.
 *
 * Needed because YouTube's own channel total can be wrong for a while. Make a
 * channel's videos public after a spell unlisted and videoCount corrects
 * itself straight away while viewCount sits at zero, so the channel reads as
 * having nine videos and no audience, which is a worse lie than either number
 * alone.
 *
 * The per-video figures are right immediately, so they are what gets used
 * until the channel total agrees with them. Nothing here is written down or
 * maintained by hand: it is the same API, asked a more specific question.
 *
 * Returns null on any trouble at all, and the caller keeps the original
 * number. A wrong total is bad; a crashed page is worse. */
async function countViewsFromVideos(
  uploads: string,
  key: string,
): Promise<number | null> {
  try {
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(PLAYLIST_ITEMS);
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("playlistId", uploads);
      url.searchParams.set("key", key);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await fetch(url, {
        next: { revalidate: STATS_REVALIDATE_SECONDS },
      });
      if (!response.ok) return null;

      const page = (await response.json()) as {
        items?: { contentDetails?: { videoId?: string } }[];
        nextPageToken?: string;
      };
      for (const item of page.items ?? []) {
        const id = item.contentDetails?.videoId;
        if (id) ids.push(id);
      }
      pageToken = page.nextPageToken;
    } while (pageToken && ids.length < MAX_VIDEOS_TO_COUNT);

    if (ids.length === 0) return null;

    let total = 0;
    for (let i = 0; i < ids.length; i += 50) {
      const url = new URL(VIDEOS);
      url.searchParams.set("part", "statistics");
      url.searchParams.set("id", ids.slice(i, i + 50).join(","));
      url.searchParams.set("key", key);

      const response = await fetch(url, {
        next: { revalidate: STATS_REVALIDATE_SECONDS },
      });
      if (!response.ok) return null;

      const page = (await response.json()) as {
        items?: { statistics?: { viewCount?: string } }[];
      };
      for (const video of page.items ?? []) {
        total += toInt(video.statistics?.viewCount);
      }
    }

    return total;
  } catch {
    return null;
  }
}

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
      source: channel.fallback
        ? ("fallback" as const)
        : ("unavailable" as const),
      avatarUrl: null,
      subscribersHidden: false,
    }));
  };

  if (!key) return withFallback("YOUTUBE_API_KEY is not set");
  if (list.length === 0) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set("part", "snippet,statistics,contentDetails");
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

  return Promise.all(
    list.map(async (channel) => {
      const item = byId.get(channel.channelId);
      if (!item?.statistics) {
        return {
          ...channel,
          stats: channel.fallback ?? null,
          source: channel.fallback
            ? ("fallback" as const)
            : ("unavailable" as const),
          avatarUrl: null,
          subscribersHidden: false,
        };
      }

      const thumbs = item.snippet?.thumbnails ?? {};
      const avatarUrl =
        thumbs.medium?.url ?? thumbs.high?.url ?? thumbs.default?.url ?? null;

      const live = {
        subscribers: toInt(item.statistics.subscriberCount),
        views: toInt(item.statistics.viewCount),
        videos: toInt(item.statistics.videoCount),
      };

      /* A channel total that disagrees with the channel's own videos.
       *
       * Making videos public again after a spell unlisted fixes videoCount at
       * once and leaves viewCount at zero for a while, so the card would read
       * as nine videos and no audience. That is not a number anyone should
       * publish, and it is not something to paper over with a figure typed in
       * by hand either.
       *
       * The per-video counts are right immediately, so they get added up and
       * used instead. The moment YouTube's own total catches up this stops
       * running by itself, with nothing to remember to delete. */
      const uploads = item.contentDetails?.relatedPlaylists?.uploads;
      if (live.views === 0 && live.videos > 0 && uploads) {
        const counted = await countViewsFromVideos(uploads, key);
        if (counted && counted > 0) {
          console.warn(
            `[youtube] ${channel.name}: channel total is stale, counted ${counted} views from ${live.videos} videos`,
          );
          live.views = counted;
        }
      }

      /* A channel with everything unlisted answers, but with nothing in it.
       *
       * YouTube only counts PUBLIC videos in these figures, so a channel whose
       * uploads are all unlisted reports zero videos and zero views however many
       * views they have actually earned. Showing that would say the channel has
       * no audience, which is the opposite of true.
       *
       * So where the API sees nothing public and the channel carries recorded
       * numbers, the recorded ones are used for views and videos. The subscriber
       * count stays live, because that one is public and correct either way.
       *
       * This resolves itself: the moment the videos are made public the API
       * reports real figures, this branch stops running, and the recorded
       * numbers can be deleted. Note that a channel part way through that
       * change, with its videos back but its total not yet, is handled above
       * and never reaches here. */
      const nothingPublic = live.videos === 0 && live.views === 0;
      if (nothingPublic && channel.fallback) {
        return {
          ...channel,
          stats: {
            subscribers: live.subscribers,
            views: channel.fallback.views,
            videos: channel.fallback.videos,
          },
          source: "fallback" as const,
          avatarUrl,
          subscribersHidden: Boolean(item.statistics.hiddenSubscriberCount),
        };
      }

      return {
        ...channel,
        stats: live,
        source: "live" as const,
        avatarUrl,
        subscribersHidden: Boolean(item.statistics.hiddenSubscriberCount),
      };
    }),
  );
}

/* Formatting helpers live in src/lib/format.ts so that client
 * components can use them without pulling in this server-only module. */
