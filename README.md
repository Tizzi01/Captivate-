# Captivate

Personal site + network directory for Tizzi.

- `/` — the landing page (intro, bio, portfolio links)
- `/network` — the channel directory, with live YouTube stats

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Motion (Framer Motion).

---

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

> **Note on this machine:** Node.js is installed at `C:\Program Files\nodejs`.
> If a terminal says `node: command not found`, it was opened before Node was
> installed — just open a new terminal.

Other commands:

```bash
npm run build
```

```bash
npm run lint
```

---

## Edit the content

**Almost everything lives in one file: `src/data/site.ts`.**
You should not need to touch anything in `src/app` or `src/components` for
routine updates.

### Rename the brand

One line at the top of `site.ts`:

```ts
export const BRAND = "Captivate"; // -> "Captivate Media", "Captivate Studios"...
```

It updates the page titles, the landing-page card, and the `/network` heading.

### Add a channel

Append to the `channels` array. The `/network` grid is data-driven, so the new
card appears automatically:

```ts
{
  slug: "new-channel",                       // unique id, any URL-safe string
  name: "new channel",
  channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",     // the UC... id from the URL
  role: "Strategy lead",                     // short line under the name
  note: "What you do on this channel.",      // the strategy note
  highlight: "One video past 500k views",    // optional badge, omit if none
  flagship: false,                           // true floats it to the front
}
```

To find the `channelId`: open the channel and look at the URL. If it reads
`youtube.com/channel/UC...`, that trailing part is the id. If it reads
`youtube.com/@handle` instead, click any video, then the channel name under it —
that lands on the `/channel/UC...` form.

### Edit the bio

`bio` is a list of paragraphs, and each paragraph is a list of segments. That is
what lets a single phrase carry a link or a hover-reveal story:

```ts
[
  { kind: "text",   value: "Plain words. " },
  { kind: "link",   value: "A link", href: "https://example.com" },
  { kind: "reveal", value: "hover me",
    title: "Card heading",
    body:  "The story that expands on hover.",
    href:  "https://example.com", hrefLabel: "Open it" },
]
```

`kind: "link"` with an `href` starting `/` navigates inside the site; anything
else opens in a new tab.

### Portfolio links

The `links` array. An entry with `href: null` renders as a greyed-out row with a
**SOON** badge — that is how the scripts portfolio is set up until there's a URL:

```ts
{ label: "Scripts portfolio", href: null, description: "Writing" },
```

### Colours and fonts

Six CSS variables at the top of `src/app/globals.css`, with a second set under
`.dark`. Change those and the whole site follows. Fonts are set in
`src/app/layout.tsx` (Instrument Serif for headings, Inter for body).

---

## The YouTube API key

`/network` pulls subscriber, view, and video counts from the YouTube Data API.

### Getting a key

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in
2. Create a project (any name)
3. **APIs & Services → Library** → search *YouTube Data API v3* → **Enable**
4. **APIs & Services → Credentials** → *Create credentials* → *API key*
5. Click **Edit** on the new key → **API restrictions** → *Restrict key* →
   select **YouTube Data API v3** → Save

It's free, and no card is needed for this API.

### Using it locally

Put it in `.env.local` in the project root (copy `.env.example` if it's missing):

```
YOUTUBE_API_KEY=your_key_here
```

Restart `npm run dev` afterwards. `.env.local` is gitignored — it never gets
committed.

### Changing the key later

Replace the value in `.env.local` for local work, and update the environment
variable in Vercel (below) for the live site. Nothing in the code refers to the
key directly.

### Is this safe?

Yes. An API key of this type is **read-only access to public data** — the same
counts anyone sees on your channel page. It cannot upload, delete, edit, read
analytics, or sign in as you. Those need OAuth, which this site does not use.

The key is also never exposed: it is read only inside `src/lib/youtube.ts`,
which runs on the server, and the variable is deliberately **not** prefixed with
`NEXT_PUBLIC_`, so Next.js will not include it in anything the browser
downloads.

The worst case for a leaked key is someone burning the daily quota, which would
make stats go stale until it resets. The API restriction in step 5 keeps a
stolen key from touching anything else in your Google account.

### Quota and refresh rate

The free allowance is **10,000 units/day**. One `channels.list` call covers
every channel at once and costs **1 unit**, so cost does not grow with traffic
or with the number of channels.

| Refresh interval | Units/day | % of quota |
| ---------------- | --------- | ---------- |
| 20 min           | 72        | 0.7%       |
| 5 min (current)  | 288       | 2.9%       |
| 1 min            | 1,440     | 14%        |

Change it in `site.ts`:

```ts
export const STATS_REVALIDATE_SECONDS = 300; // seconds
```

Worth knowing: YouTube publicly rounds subscriber counts to three significant
figures above 1,000, so the displayed number rarely changes more than a few
times a day regardless of how often you poll.

### When the API is unavailable

If the key is missing or a request fails, the site does not break. Each channel
falls back to the optional `fallback` numbers in `site.ts`:

```ts
fallback: { subscribers: 45700, views: 3200000, videos: 128 },
```

A channel with no `fallback` shows a dash instead, and the header reads
*"Live stats offline"* rather than pretending. **The `fallback` fields are
currently unset** — add real numbers once you have them, or leave them and rely
on the API.

---

## Deploying

1. Push the repo to GitHub
2. Import it at [vercel.com/new](https://vercel.com/new) — it detects Next.js, no
   config needed
3. In **Settings → Environment Variables**, add `YOUTUBE_API_KEY` with your key,
   for all environments
4. Attach the domain under **Settings → Domains** and follow the DNS records it
   gives you

**One gotcha:** adding an environment variable in Vercel does not rebuild the
site by itself. After adding `YOUTUBE_API_KEY` for the first time, trigger a
redeploy (**Deployments → ⋯ → Redeploy**) or the page will keep serving the
build that had no key.

To redeploy after that, just push to the connected branch.

`/network` is a route on the same domain, so `yourdomain.com/network` works with
no extra setup. Putting it on a subdomain instead would need a separate Vercel
project.

---

## Project layout

```
src/
  app/
    layout.tsx           fonts, theme script, sound provider, corner controls
    page.tsx             the landing page
    network/page.tsx     the channel directory (server component, fetches stats)
    globals.css          colour tokens — the palette lives here
  components/
    bio.tsx              renders bio paragraphs + the hover-reveal card
    channel-card.tsx     one channel card
    links.tsx            the portfolio link rows
    network-invite.tsx   the doorway from / to /network
    sound.tsx            Web Audio UI sounds + mute toggle
    theme.tsx            light/dark toggle + the no-flash script
    fade-in.tsx          small reveal-on-mount wrapper
  data/
    site.ts              >>> ALL CONTENT <<<
  lib/
    youtube.ts           server-only API access
    format.ts            number formatting (1234567 -> "1.23M")
```

## Notes on behaviour

- **Theme** — follows your OS on a first visit; once you use the toggle that
  choice is remembered and the OS is ignored. Applied before first paint, so
  there is no white flash on a dark-mode load.
- **Sound** — off by default, and the choice is remembered. Three short tones are
  synthesised in the browser (no audio files). Muted automatically for anyone
  whose OS asks for reduced motion.
- **Motion** — all animation is skipped for visitors with reduced-motion set.

## Not built (deliberately)

A CMS, accounts/auth/comments, and any analytics beyond Vercel's built-in. Worth
adding a CMS only if editing `site.ts` ever becomes annoying.
