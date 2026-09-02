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

/** The one contact given out anywhere on the site. Shown in the footer. */
export const DISCORD_URL = "https://discord.com/users/964523481666560061";

export const STATS_REVALIDATE_SECONDS = 300;

/* ----------------------------------------------------------------- types -- */

/** One picture in a gallery. Leave `images` empty and the gallery says so
 *  rather than rendering broken frames. Drop files in /public and point `src`
 *  at them, e.g. "/japan/invite.png". */
export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
  /** Consecutive pictures sharing a group become one figure under one
   *  caption, so a pair does not repeat the same line twice. */
  group?: string;
  /** Draw the caption over the picture, large. Meant for an emoji, not a
   *  sentence. */
  overlay?: boolean;
};

export type Segment =
  | { kind: "text"; value: string }
  | { kind: "link"; value: string; href: string; newTab?: boolean }
  /** Inline phrase that expands into a small story card on hover/tap.
   *  `title` is optional: leave it out when the card is one paragraph and a
   *  heading would just be repeating the phrase you hovered. */
  | {
      kind: "reveal";
      value: string;
      title?: string;
      body: string;
      href?: string;
      hrefLabel?: string;
    }
  /** Hidden until clicked. For things that are better as a small surprise. */
  | { kind: "spoiler"; value: string; reveal: string }
  /** A phrase that carries a set of pictures. Hovering it continues the
   *  sentence with `lead`; clicking it opens the pictures. */
  | {
      kind: "gallery";
      value: string;
      /** Shown on hover, to tease rather than explain. */
      teaser: string;
      /** The rest of the sentence, revealed beside the phrase on hover. */
      lead: string;
      title: string;
      images: GalleryImage[];
    }
  /** A phrase that finishes its own sentence on hover. Same treatment as
   *  the gallery phrase, without the pictures. */
  | { kind: "aside"; value: string; lead: string }
  /** A nested drop-down inside the extras list. Same motion as "other stuff",
   *  but it carries its own items and owns its own open state. */
  | { kind: "expandable"; value: string; items: Paragraph[] }
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
  /** Optional one-liner under the name. */
  role?: string;
  /** Someone to thank, shown when the card is hovered.
   *  `emphasis` names a phrase inside `text` to set in the solid colour, for
   *  the bit that is said with weight. */
  credit?: {
    name: string;
    avatar: string;
    text: string;
    emphasis?: string;
  };
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
  /** Optional aside, shown in brackets after the title. */
  note?: string;
  /** Written out as you want it displayed, e.g. "380K+". */
  views: string;
  /** The Google Doc for the script itself. */
  docUrl: string;
};

/* ------------------------------------------------------------------ site -- */

export const person = {
  name: "Tizzi",
  /* The page heading. It says what he does rather than hello, so the opening
     line underneath can get straight on with the detail. */
  greeting: "Creative Director (YouTube)",
  role: "Creative director",
};

export const TWITTER_URL: string | null = "https://x.com/tizzi_k";

/** The landing-page bio. Each array is one paragraph; each paragraph is a list
 *  of segments so a phrase can carry a link, a reveal, or a disclosure.
 *
 *  Deliberately short. The page should say who you are and stop; anything
 *  more is behind something the visitor chooses to open. */
export const bio: Paragraph[] = [
  [
    {
      kind: "text",
      value: "Go by Tizzi online. I'm 17, living in Toronto. Running ",
    },
    /* Captivate stays a link. Since the Network section came off the homepage
       this is the only way into /network from here. */
    {
      kind: "link",
      value: "Captivate",
      href: CAPTIVATE_URL,
      newTab: true,
    },
    { kind: "text", value: ", a small network of YouTube channels." },
  ],
  [
    {
      kind: "text",
      value:
        "Started out as a video editor and now I'm obsessed with all things YouTube. Also heading into my senior year of high school.",
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
    { kind: "text", value: "I finished top 30 in a " },
    {
      kind: "reveal",
      value: "game jam",
      body: "Hack Club is a global nonprofit network of student led high school coding clubs. They basically want teens to code and ship stuff. I finished in the top 30 of their Shiba Arcade event. The game is still playable, and it's pretty rough around the edges, but I'm still happy with how it turned out since it was my first time.",
      href: "https://lovely-torte-2b3aef.netlify.app/tizzis%20final%20game%20tt",
      hrefLabel: "Play the game",
    },
    { kind: "text", value: " hosted by " },
    {
      kind: "link",
      value: "Hack Club",
      href: "https://shiba.hackclub.com/",
    },
    { kind: "text", value: " and won a " },
    {
      kind: "gallery",
      value: "trip to Japan",
      teaser: "there are pictures",
      title: "Shiba Arcade",
      /* Opens with the full stop that closes "trip to Japan", because the
         paragraph supplies its own after this segment and that one then lands
         at the very end of the sentence. */
      lead: ". 🥹 Wasn't able to go due to visa complications",
      /* The files these point at live in public/japan. Anything that fails to
         load is dropped from the gallery rather than showing a broken frame,
         so a missing file is invisible rather than embarrassing. */
      images: [
        {
          src: "/japan/invite.png",
          alt: "The invitation email to the Shiba Arcade exhibition at Spacebar Studio",
          caption: "The invite.",
        },
        {
          src: "/japan/arcade.jpg",
          alt: "Participants building arcade cabinets at Spacebar Studio",
          caption: "From the people who made it.",
        },
        {
          src: "/japan/room.png",
          alt: "Someone asleep in a bunk at the venue",
        },
        {
          src: "/japan/ticket.png",
          alt: "The order for the first 30 tickets to Shiba Arcade",
          caption: "Bought the ticket.",
        },
        {
          src: "/japan/couldnt-go.png",
          alt: "A list of people who bought a ticket and then could not go",
          caption: "🥀",
          overlay: true,
        },
        {
          src: "/japan/la-peace.png",
          alt: "The la peace meme",
          caption: "Sucked a lot in the moment, but I've found la peace.",
        },
      ],
    },
    { kind: "text", value: "." },
  ],
  [
    {
      kind: "expandable",
      value: "some random facts about me",
      items: [
        [
          {
            kind: "text",
            value:
              "I was really into Rubik's Cubes during Covid. My best 3x3 solve was around 18 seconds.",
          },
        ],
        [
          { kind: "text", value: "I can type at around " },
          {
            kind: "reveal",
            value: "120 wpm",
            body: "Genuinely one of the most underrated skills to have. Saves a ton of time in the long run.",
          },
        ],
        [{ kind: "text", value: "I LOVE drones." }],
        [{ kind: "text", value: "Also into Robotics/tech" }],
        [
          { kind: "text", value: "The skill I'm most proud of: " },
          {
            kind: "spoiler",
            value: "I can make it work",
            reveal: "I can make it work.",
          },
        ],
      ],
    },
  ],
];

/** Outbound portfolio links. href: null renders a "coming soon" placeholder. */
export const links: OutboundLink[] = [
  {
    label: "Editing portfolio",
    href: "https://sites.google.com/view/tizzi-portfolio/home",
    note: "This is really outdated. But I post my latest work on",
    noteLink: { label: "Twitter/X", href: TWITTER_URL },
  },
  {
    label: "Thumbnail portfolio",
    href: "https://dazzling-bonbon-df7594.netlify.app/",
    note: "This one's pretty outdated too. I don't really consider myself a \"thumbnail artist\" these days.",
  },
  {
    label: "Scripts portfolio",
    href: "/scripts",
    note: "Mostly read through and edit scripts instead of writing from scratch.",
  },
];

/* --------------------------------------------------------------- scripts -- */

/** Shown under the heading on /scripts. */
export const SCRIPTS_INTRO = "A few scripts I've worked on.";

export const SCRIPTS_NOTE =
  "There aren't many here because these days I mostly read through and edit scripts rather than writing whole ones from scratch.";

/** The second line under the intro: what "editing other people's scripts"
 *  actually involves, so the short list above does not undersell it. */
export const SCRIPTS_INVOLVEMENT =
  "I'm still heavily involved in almost all of them. I write almost all of the intros (for the videos I produce) myself, cause I'm extremely picky when it comes to that.";

/** Add an entry by adding an object. Nothing else needs touching.
 *
 *  View counts are typed by hand on purpose: nothing here calls YouTube. */
export const scripts: Script[] = [
  {
    slug: "child-abuse-anime",
    title: "The Greatest Depiction of Child Abuse in Anime",
    youtubeUrl: "https://youtu.be/OXdBvXPF2mQ",
    views: "380K+",
    note: "scripted the first half",
    docUrl:
      "https://docs.google.com/document/d/14ifkEmnqCZVVhKBKJGE9QLPALFreTdAPrJg2T3un3NU/edit?usp=sharing",
  },
  {
    slug: "blox-fruits-money-glitches",
    title:
      'ABUSING All "Billion Money" Glitches in BLOX FRUITS! | 1st 2nd and 3rd Sea!',
    youtubeUrl: "https://youtu.be/u1Yg_ORtdbs",
    views: "185K+",
    note: "a gaming video, so not much to script. Rough outline and the overall idea of the video",
    docUrl:
      "https://docs.google.com/document/d/1JTiAjZV3ebExbtYSqvVDfnkcq05rjdtgOHsV_u0A57Q/edit?usp=sharing",
  },
];

/* -------------------------------------------------------------- channels -- */

/** Shown under the grid. */
export const NETWORK_NOTE = "More channels will be added soon.";

/** Append to this array to add a channel. No component changes needed. */
export const channels: Channel[] = [
  {
    slug: "staranime",
    name: "Star Anime",
    channelId: "UCW-RsP9NXc_4pWZqucRnPAA",
    note: "The flagship channel and the fastest-growing one in the network. I do everything on it myself apart from the scripts and the voiceover, and I still review every script closely.",
    credit: {
      name: "Alserex",
      avatar: "/people/alserex.png",
      text: "Huge shoutout to Alserex, couldn't have done it without him. 10/10 voiceovers, literally THE best person I could have met for this 🍀",
      emphasis: "THE best",
    },
    flagship: true,
  },
  {
    slug: "also-ran",
    name: "Forge",
    channelId: "UCru3lHd7hvDsOePEIKeK9Vw",
    note: "Every video here is temporarily unlisted. I don't really post on this one anymore, but it gave me my first taste of success with long form YouTube.",
    /* Every video on this channel is currently unlisted, so YouTube reports
       zero videos and zero views for it however many it has really had. These
       are the real figures, counted by hand from Studio on 2 Sep 2026: nine
       videos totalling 277,968 views, the largest 185,078.

       Delete this block once the videos are public. The API will report the
       true numbers by itself and they will be live from then on. */
    fallback: { subscribers: 3500, views: 277968, videos: 9 },
  },
];

/** Convenience: flagship first, then the rest in the order written above. */
export const orderedChannels: Channel[] = [...channels].sort(
  (a, b) => Number(Boolean(b.flagship)) - Number(Boolean(a.flagship)),
);
