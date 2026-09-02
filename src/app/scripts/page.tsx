import type { Metadata } from "next";

import { BackLink } from "@/components/back-link";
import { FadeIn } from "@/components/fade-in";
import { ScriptEntry } from "@/components/script-entry";
import { SCRIPTS_INTRO, SCRIPTS_NOTE, person, scripts } from "@/data/site";

/* Same column, type and spacing as the homepage. Text first, one video per
 * entry, nothing that looks like a portfolio grid. */

export const metadata: Metadata = {
  title: "Scripts",
  description: `Scripts ${person.name} has worked on.`,
};

export default function ScriptsPage() {
  return (
    <main className="mx-auto w-full max-w-[var(--measure)] px-6 pb-24 pt-20 sm:pt-28">
      <FadeIn y={8}>
        <BackLink label={person.name} />
      </FadeIn>

      <header className="mt-8">
        <FadeIn delay={0.05} y={8}>
          <h1 className="text-ink">Scripts</h1>
        </FadeIn>

        <FadeIn delay={0.12}>
          <p className="mt-4 pl-5 text-muted sm:pl-7">{SCRIPTS_INTRO}</p>
        </FadeIn>

        <FadeIn delay={0.18}>
          <p className="mt-2 max-w-md pl-5 text-sm text-muted sm:pl-7">
            {SCRIPTS_NOTE}
          </p>
        </FadeIn>
      </header>

      <section className="mt-12 pl-5 sm:pl-7">
        {scripts.length === 0 ? (
          <FadeIn delay={0.24}>
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-muted">
              nothing up here yet
            </p>
          </FadeIn>
        ) : (
          <div className="space-y-12">
            {scripts.map((script, index) => (
              <FadeIn key={script.slug} delay={0.24 + index * 0.08}>
                <ScriptEntry script={script} />
              </FadeIn>
            ))}
          </div>
        )}
      </section>

      <FadeIn delay={0.5}>
        <footer className="mt-20 text-muted">
          <p>
            {person.name} · {new Date().getFullYear()}
          </p>
        </footer>
      </FadeIn>
    </main>
  );
}
