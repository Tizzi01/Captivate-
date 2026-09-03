import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { person } from "@/data/site";

/* ============================================================================
 *  opengraph-image.tsx — the card chat apps draw when the link is shared.
 *
 *  A shared link used to be a bare name on a bare row, because the description
 *  underneath it was removed and nothing replaced it. This is what replaces it:
 *  the same two lines the page itself opens with, drawn rather than written, so
 *  the preview is a small piece of the site instead of a sentence about it.
 *
 *  Both lines come from `person`, so the card cannot drift from the heading it
 *  is quoting. Change the greeting and the card changes with it.
 *
 *  Generated once at build, not per request: nothing here varies.
 * ========================================================================= */

export const alt = `${person.name}, ${person.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Lexend, the site's own typeface, from Google's font CDN and committed to
 * assets/ as a build input. next/font already self-hosts it for the pages, but
 * only as woff2, which the image renderer cannot read: it takes ttf, otf or
 * woff only. Two weights, because the name is set bold against a regular line
 * and there is no faking a weight that is not in the file.
 *
 * Read at module scope so both are in memory once, not per image. */
const [regular, bold] = await Promise.all([
  readFile(join(process.cwd(), "assets/Lexend-Regular.ttf")),
  readFile(join(process.cwd(), "assets/Lexend-Bold.ttf")),
]);

/* Straight from --bg, --ink and --muted in globals.css. The light palette
 * rather than the dark one: a card has no way to know which theme the person
 * reading it prefers, and light is what the site opens as for most people. */
const BG = "#fcfcfc";
const INK = "#1b1b1b";
const MUTED = "#8a8a85";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Lexend",
        }}
      >
        <div
          style={{
            fontSize: 83,
            fontWeight: 700,
            color: INK,
            /* Pushes the pair down half of this, and it is the difference
               between measuring centred and looking centred.

               Centring the block puts equal space above and below it, but the
               two lines are nowhere near equal weight: a big black word over a
               small grey one. The eye finds the centre of the ink, not of the
               box, and that sat 12.5px high. This drops it onto the real one.
               Measured, not guessed: see the centre of mass, not the bounding
               box, if either line ever changes size. */
            marginTop: 25,
            /* No letter-spacing, and that is the fix rather than an omission.
               Tracking is applied after every character including the last, so
               a negative value makes the text box end inside the final glyph.
               Centre that box and the glyphs sit right of true centre, by half
               the tracking, which is what made the name look off against the
               line below it. */
            lineHeight: 1,
          }}
        >
          {person.name}
        </div>

        <div
          style={{
            fontSize: 26,
            fontWeight: 400,
            color: MUTED,
            /* Both lines pinned to lineHeight 1 so the block's height is the
               two font sizes plus this gap, and nothing else. Left to default,
               the second line carries invisible leading below it that pushes
               the whole block above the true centre. */
            lineHeight: 1,
            marginTop: 22,
          }}
        >
          {person.role}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Lexend", data: regular, style: "normal", weight: 400 },
        { name: "Lexend", data: bold, style: "normal", weight: 700 },
      ],
    },
  );
}
