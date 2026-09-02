import type { Metadata } from "next";

import { BackLink } from "@/components/back-link";
import { FadeIn } from "@/components/fade-in";
import { ScriptEntry } from "@/components/script-entry";
import { UnlockForm } from "@/components/unlock-form";
import {
  DISCORD_URL,
  SCRIPTS_INTRO,
  SCRIPTS_INVOLVEMENT,
  SCRIPTS_NOTE,
  person,
  scripts,
} from "@/data/site";
import { isUnlocked } from "@/lib/unlock";

/* Same column, type and spacing as the homepage. Text first, one video per
 * entry, nothing that looks like a portfolio grid.
 *
 * The whole page is behind the password. Note how that is done: when locked,
 * the entries are never rendered, so the titles, the videos and the document
 * links are simply not in the response. Rendering them and hiding them with
 * CSS, or with a check in the browser, would leave every one of them sitting
 * in the page source for anyone who opened devtools. */

export const metadata: Metadata = {
  title: "Scripts",
  description: `Scripts ${person.name} has worked on.`,
};

export default async function ScriptsPage() {
  const unlocked = await isUnlocked();

  return (
    <main className="mx-auto w-full max-w-[var(--measure)] px-6 pb-24 pt-20 sm:pt-28">
      <FadeIn y={8}>
        <BackLink label="back" arrow />
      </FadeIn>

      <header className="mt-8">
        <FadeIn delay={0.05} y={8}>
          <h1 className="text-ink">Scripts</h1>
        </FadeIn>

        {unlocked ? (
          <>
            <FadeIn delay={0.12}>
              <p className="mt-4 pl-5 text-muted sm:pl-7">{SCRIPTS_INTRO}</p>
            </FadeIn>

            <FadeIn delay={0.18}>
              <p className="mt-2 max-w-md pl-5 text-sm text-muted sm:pl-7">
                {SCRIPTS_NOTE}
              </p>
            </FadeIn>

            <FadeIn delay={0.22}>
              <p className="mt-2 max-w-md pl-5 text-sm text-muted sm:pl-7">
                {SCRIPTS_INVOLVEMENT}
              </p>
            </FadeIn>
          </>
        ) : (
          <FadeIn delay={0.12}>
            <div className="mt-4 max-w-md pl-5 sm:pl-7">
              <p className="text-muted">
                This one isn&apos;t public yet. It needs authorised access for
                now.
              </p>
              <UnlockForm label="Unlock" />
            </div>
          </FadeIn>
        )}
      </header>

      {unlocked && (
        <section className="mt-12 pl-5 sm:pl-7">
          {scripts.length === 0 ? (
            <FadeIn delay={0.28}>
              <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-muted">
                nothing up here yet
              </p>
            </FadeIn>
          ) : (
            <div className="space-y-12">
              {scripts.map((script, index) => (
                <FadeIn key={script.slug} delay={0.28 + index * 0.08}>
                  <ScriptEntry script={script} />
                </FadeIn>
              ))}
            </div>
          )}
        </section>
      )}

      <FadeIn delay={0.5}>
        <footer className="mt-20 text-muted">
          <p>
            {person.name} · {new Date().getFullYear()} ·{" "}
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-ink hover:decoration-current"
            >
              Discord
            </a>
          </p>
        </footer>
      </FadeIn>
    </main>
  );
}
