import type { Metadata } from "next";
import { Lexend } from "next/font/google";

import { SoundProvider, SoundToggle } from "@/components/sound";
import { THEME_SCRIPT, ThemeToggle } from "@/components/theme";
import { FONT, person } from "@/data/site";

import "./globals.css";

/* Lexend is loaded from Google Fonts and self-hosted by Next at build time —
 * no third-party request at runtime. Arial needs no loading; it ships with the
 * OS. Which one is used comes from FONT in src/data/site.ts. */
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

/* No description on purpose.
 *
 * A description is what chat apps and search results print under the link, and
 * a one-line summary of a person is exactly the pitch this site spends its
 * whole design avoiding. With none, a shared link shows the name and nothing
 * else, and whoever opens it reads the page rather than a summary of it.
 *
 * The two pages that do set their own keep them: they describe a thing, not a
 * person. */
export const metadata: Metadata = {
  title: {
    default: `${person.name}`,
    template: `%s · ${person.name}`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${lexend.variable} font-${FONT}`}
    >
      <head>
        {/* Runs before paint so the correct theme is applied with no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-ink">
        <SoundProvider>
          <div className="fixed right-4 top-4 z-50 flex items-center gap-1 sm:right-6 sm:top-6">
            <SoundToggle />
            <ThemeToggle />
          </div>
          {children}
        </SoundProvider>
      </body>
    </html>
  );
}
