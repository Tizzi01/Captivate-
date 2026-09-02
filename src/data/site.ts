/* ============================================================================
 *  site.ts — THE ONLY FILE YOU NEED TO EDIT FOR ROUTINE UPDATES.
 *
 *  Change the brand name, bio text, outbound links, or the channel list here.
 *  Nothing in src/components or src/app needs to be touched to add a channel,
 *  reword a bio line, or swap a portfolio URL.
 * ========================================================================= */

/* ---------------------------------------------------------------- brand -- */

/** Change this one line to rebrand: "Captivate Media", "Captivate Network"... */
export const BRAND = "Captivate";

/** Typeface for the whole site. Flip this one word to compare.
 *  Add another option by adding an `html.font-NAME` block in globals.css. */
export const FONT: "lexend" | "arial" = "lexend";

/** How often the server re-fetches YouTube stats, in seconds. 300 = 5 minutes.
 *  Costs 1 quota unit per refresh (free allowance is 10,000/day). */
/** Where the Captivate site lives.
 *  While it shares this deployment it is the "/network" route. Once Captivate
 *  has its own domain, paste the full URL here (e.g. "https://captivate.com")
 *  and every link to it across the site becomes an external link that opens in
 *  a new tab — no other file needs to change. */
export const CAPTIVATE_URL = "/network";

export const STATS_REVALIDATE_SECONDS = 300;

/* ----------------------------------------------------------------- types -- */

/** One picture in a gallery. Leave `images` empty and the gallery says so
 *  rather than rendering broken frames. Drop files in /public and point `src`
 *  at them, e.g. "/japan/letter.jpg". */
export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
};

export type Segment =
  | { kind: "text"; value: string }
  | { kind: "link"; value: string; href: string; newTab?: boolean }
  /** Inline phrase that expands into a small story card on hover/tap. */
  | {
      kind: "reveal";
      value: string;
      title: string;
      body: string;
      href?: string;
      hrefLabel?: string;
    }
  /** Hidden until clicked. For things that are better as a small surprise. */
  | { kind: "spoiler"; value: string; reveal: string }
  /** Opens a scrollable set of pictures with a short lead-in. */
  | {
      kind: "gallery";
      value: string;
      /** Shown on hover, to tease rather than explain. */
      teaser: string;
      title: string;
      body: string;
      images: GalleryImage[];
    }
  /** Toggles a list of extra items open. Used once, for "other stuff". */
  | { kind: "disclosure"; value: string };

export type Paragraph = Segment[];

export type Stats = {
  subscribers: number;
  views: number;
  videos: number;
};

export type Channel = {
  /** URL-safe id, also used as the React key. */
  slug: string;
  name: string;
  /** The UC... id from the channel URL. Used for the API call. */
  channelId: string;
  /** Short role line, shown under the name. */
  role: string;
  /** The strategy note — one or two sentences. */
  note: string;
  /** Optional badge, e.g. a standout video result. */
  highlight?: string;
  /** Marks the flagship channel so it can lead the grid. */
  flagship?: boolean;
  /** Shown only if the YouTube API is unreachable or no key is set.
   *  Leave undefined and the card renders a dash instead of a wrong number. */
  fallback?: Stats;
};

export type OutboundLink = {
  label: string;
  href: string | null;
  description: string;
  /** Shown on hover or tap. Keep it to a sentence or two. */
  note?: string;
  /** Optional link inside that note. */
  noteLink?: { label: string; href: string | null };
};

/** One entry on the /scripts page. Adding another is adding one object here.
 *  View counts are typed in by hand, so update them when you feel like it. */
export type Script = {
  slug: string;
  title: string;
  /** Any normal YouTube URL; the video id is pulled out of it. */
  youtubeUrl: string;
  /** Written out as you want it displayed, e.g. "1.2M" or "480K". */
  views: string;
  /** The Google Doc for the script itself. */
  docUrl: string;
};

/* ------------------------------------------------------------------ site -- */

export const person = {
  name: "Tizzi",
  greeting: "Hi, I'm Tizzi",
  role: "Creative director",
};

/** Not set up yet. Put the profile URL here and the editing portfolio note
 *  turns into a real link on its own. */
export const TWITTER_URL: string | null = null;

/** The landing-page bio. Each array is one paragraph; each paragraph is a list
 *  of segments so a phrase can carry a link, a reveal, or a disclosure.
 *
 *  Deliberately short. The page should say who you are and stop; anything
 *  more is behind something the visitor chooses to open. */
export const bio: Paragraph[] = [
  [
    {
      kind: "text",
      value:
        "I'm a creative director. I'm 17, and I've been making videos since I was 10.",
    },
  ],
  [
    { kind: "text", value: "Right now I run the " },
    {
      kind: "link",
      value: "Captivate network",
      href: CAPTIVATE_URL,
      newTab: true,
    },
    {
      kind: "text",
      value: ", a small group of YouTube channels I lead strategy on.",
    },
  ],
  [
    { kind: "text", value: "Outside of YouTube, I sometimes do " },
    { kind: "disclosure", value: "other stuff" },
    { kind: "text", value: " too." },
  ],
];

/** Opened by the "other stuff" link above. Same segment format as the bio, so
 *  these can carry reveals, spoilers and galleries too. */
export const otherStuff: Paragraph[] = [
  [
    { kind: "text", value: "I finished top 13 in a " },
    {
      kind: "reveal",
      value: "game jam",
      title: "The game jam",
      body: "Hack Club hosted a game jam and I somehow finished in the top 13. The game is still playable, and it's pretty rough around the edges in the way jam games usually are.",
      href: "https://lovely-torte-2b3aef.netlify.app/tizzis%20final%20game%20tt",
      hrefLabel: "Play the game",
    },
    { kind: "text", value: " hosted by Hack Club and won a " },
    {
      kind: "gallery",
      value: "trip to Japan",
      teaser: "there are pictures",
      title: "The Japan trip",
      body: "I didn't actually get to go, visa stuff got in the way. Here's the next best thing: the letter, and a few shots from the people who made it.",
      /* TODO(Tizzi): drop the files in /public/japan and list them here.
         Order is the order they appear in. */
      images: [],
    },
    { kind: "text", value: "." },
  ],
  [
    { kind: "text", value: "I can type at around " },
    {
      kind: "reveal",
      value: "120 WPM",
      title: "On typing",
      body: "Typing is genuinely one of the most underrated skills to have. If you don't know how to touch type, learn it. It'll save you a ridiculous amount of time in the long run.",
    },
    { kind: "text", value: "." },
  ],
  [
    {
      kind: "text",
      value:
        "I got way too into Rubik's Cubes during COVID. My best 3x3 solve was around 18 seconds.",
    },
  ],
  [
    { kind: "text", value: "The skill I'm most proud of: " },
    {
      kind: "spoiler",
      value: "I can figure things out",
      reveal: "I can figure things out.",
    },
  ],
];

/** Outbound portfolio links. href: null renders a "coming soon" placeholder. */
export const links: OutboundLink[] = [
  {
    label: "Editing portfolio",
    href: "https://sites.google.com/view/tizzi-portfolio/home",
    description: "Video work",
    note: "This is pretty outdated. I don't update it much anymore, but newer work occasionally ends up on Twitter.",
    noteLink: { label: "Twitter", href: TWITTER_URL },
  },
  {
    label: "Thumbnail portfolio",
    href: "https://dazzling-bonbon-df7594.netlify.app/",
    description: "Packaging and design",
    note: "This one's pretty outdated too. I don't really consider myself a thumbnail artist these days.",
  },
  {
    label: "Scripts portfolio",
    href: "/scripts",
    description: "Writing",
  },
];

/* --------------------------------------------------------------- scripts -- */

/** Shown under the heading on /scripts. */
export const SCRIPTS_INTRO = "A few scripts I've worked on.";

export const SCRIPTS_NOTE =
  "There aren't many here because these days I mostly read through and edit other people's scripts rather than writing whole ones from scratch.";

/** Add an entry by adding an object. Nothing else needs touching.
 *  View counts are typed by hand on purpose: nothing scrapes YouTube. */
export const scripts: Script[] = [
  /* TODO(Tizzi): fill these in as you get them. Shape:
  {
    slug: "some-video",
    title: "The video title",
    youtubeUrl: "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    views: "120K",
    docUrl: "https://docs.google.com/document/d/.../edit",
  },
  */
];

/* -------------------------------------------------------------- channels -- */

/** Append to this array to add a channel. No component changes needed. */
export const channels: Channel[] = [
  {
    slug: "staranime",
    name: "staranime",
    channelId: "UCW-RsP9NXc_4pWZqucRnPAA",
    role: "Strategy lead",
    note: "The flagship channel and the fastest-growing one in the network. I lead strategy end to end here: packaging, retention structure, and release cadence.",
    flagship: true,
  },
  {
    slug: "also-ran",
    name: "also ran",
    channelId: "UCru3lHd7hvDsOePEIKeK9Vw",
    role: "Strategy + packaging",
    note: "A smaller channel with an outsized hit. Proof that the packaging approach carries across formats.",
    highlight: "One video past 200k views",
  },
];

/** Convenience: flagship first, then the rest in the order written above. */
export const orderedChannels: Channel[] = [...channels].sort(
  (a, b) => Number(Boolean(b.flagship)) - Number(Boolean(a.flagship)),
);
