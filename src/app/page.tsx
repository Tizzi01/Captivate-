import { Chat } from "@/components/chat";
import { FadeIn } from "@/components/fade-in";
import { HoverAside } from "@/components/hover-aside";
import { Intro } from "@/components/intro";
import { LinkList } from "@/components/links";
import { DISCORD_URL, bio, links, otherStuff, person } from "@/data/site";

/* The whole page is one narrow column with a hanging indent: section headings
 * sit at the left margin, their content is indented under them. Column width
 * comes from --measure in globals.css. */

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[var(--measure)] px-6 pb-24 pt-20 sm:pt-28">
      <FadeIn y={8}>
        <h1 className="text-ink">
          <HoverAside label={person.greeting} lead={person.greetingAside} />
        </h1>
      </FadeIn>

      <div className="mt-4 pl-5 sm:pl-7">
        <Intro paragraphs={bio} extras={otherStuff} />
      </div>

      <section className="mt-14">
        <FadeIn delay={0.35}>
          <h2 className="text-ink">Portfolio</h2>
        </FadeIn>
        <div className="mt-3 pl-5 sm:pl-7">
          <LinkList items={links} />
        </div>
      </section>

      <section className="mt-12">
        <FadeIn delay={0.6}>
          <h2 className="text-ink">Chat</h2>
        </FadeIn>
        {/* The chat used to be the one thing on the page that was simply
            there on load, while every heading, paragraph and link around it
            rose into place. It read as though it had failed to animate.
            Delayed past its own heading so it still arrives in order. */}
        <FadeIn delay={0.68}>
          <div className="mt-3 pl-5 sm:pl-7">
            <Chat />
          </div>
        </FadeIn>
      </section>

      <FadeIn delay={0.75}>
        <footer className="mt-20 text-muted">
          <p>
            {person.name} · {new Date().getFullYear()} ·{" "}
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-4"
            >
              Discord
            </a>
          </p>
        </footer>
      </FadeIn>
    </main>
  );
}
