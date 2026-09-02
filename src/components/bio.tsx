"use client";

/* ============================================================================
 *  bio.tsx — renders the bio paragraphs from src/data/site.ts.
 *
 *  A paragraph is a list of segments, so a single phrase can carry a link or
 *  a hover-reveal story card without any of that structure living in this
 *  file. To change the words, edit site.ts — not this component.
 * ========================================================================= */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useSound } from "@/components/sound";
import type { GalleryImage, Paragraph, Segment } from "@/data/site";

/* ------------------------------------------------------------ text link -- */

function TextLink({
  value,
  href,
  newTab,
}: {
  value: string;
  href: string;
  newTab?: boolean;
}) {
  const { play } = useSound();
  // newTab forces a real outbound link even for an in-site path — that's how
  // Captivate is linked, so it reads as its own site rather than a subsection.
  const internal = href.startsWith("/") && !newTab;
  const className =
    "group relative inline-block text-ink transition-colors duration-200 hover:text-accent";

  const inner = (
    <>
      {value}
      {/* Underline grows from the left on hover. */}
      <span className="absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
      <span className="absolute -bottom-px left-0 h-px w-full bg-line" />
    </>
  );

  if (internal) {
    return (
      <Link
        href={href}
        className={className}
        onPointerEnter={() => play("hover")}
        onClick={() => play("travel")}
      >
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={className}
      onPointerEnter={() => play("hover")}
      onClick={() => play("click")}
    >
      {inner}
    </a>
  );
}

/* --------------------------------------------------------- reveal story -- */

function RevealSegment({
  segment,
}: {
  segment: Extract<Segment, { kind: "reveal" }>;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const { play } = useSound();

  // Tapping outside closes the card on touch devices.
  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const show = () => {
    if (!open) play("hover");
    setOpen(true);
  };

  return (
    <span
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onFocus={show}
        aria-expanded={open}
        className="cursor-help text-ink underline decoration-accent decoration-dotted decoration-1 underline-offset-4 transition-colors duration-200 hover:text-accent"
      >
        {segment.value}
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            /* pt-3 rather than mt-3: no dead gap for the cursor to fall into. */
            className="absolute left-0 top-full z-40 block w-[min(21rem,calc(100vw-3rem))] pt-3"
          >
            <span className="block rounded-lg border border-line bg-surface p-5 text-left shadow-[0_12px_40px_-12px_rgb(0_0_0/0.18)]">
              {segment.title && (
                <span className="block text-ink">{segment.title}</span>
              )}
              <span
                className={`block text-muted ${segment.title ? "mt-1.5" : ""}`}
              >
                {segment.body}
              </span>
              {segment.href && (
                <a
                  href={segment.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => play("click")}
                  className="mt-3 inline-flex items-center gap-1.5 text-accent transition-all duration-200 hover:gap-2.5"
                >
                  {segment.hrefLabel ?? "Open"}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              )}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------- spoiler -- */

/* Hidden until clicked. Blurred rather than blanked, so you can see there is
 * something there without reading it by accident. */
function SpoilerSegment({
  segment,
}: {
  segment: Extract<Segment, { kind: "spoiler" }>;
}) {
  const [shown, setShown] = useState(false);
  const { play } = useSound();

  if (shown) {
    return (
      <motion.span
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="text-ink"
      >
        {segment.reveal}
      </motion.span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        play("click");
        setShown(true);
      }}
      onPointerEnter={() => play("hover")}
      aria-label="Reveal"
      className="rounded-sm bg-line/70 text-transparent transition-colors duration-200 [text-shadow:0_0_9px_var(--muted)] hover:bg-line"
    >
      {segment.value}
    </button>
  );
}

/* -------------------------------------------------------------- gallery -- */

/* A small, fixed tilt per picture, so the stack looks laid down by hand rather
 * than aligned by a machine. Derived from the filename, so a picture always
 * sits at the same angle instead of jumping about on every render. */
function tiltFor(src: string): number {
  let hash = 2166136261;
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (((hash >>> 0) % 1000) / 1000) * 2.4 - 1.2;
}

type ImageGroup = {
  images: GalleryImage[];
  caption?: string;
  overlay?: boolean;
};

/* Consecutive pictures sharing a group become one figure under one caption, so
 * a pair does not say the same line twice. Anything ungrouped stands alone. */
function groupImages(images: GalleryImage[]): ImageGroup[] {
  const out: ImageGroup[] = [];

  for (const image of images) {
    const previous = out[out.length - 1];
    const continues =
      image.group !== undefined &&
      previous !== undefined &&
      previous.images[0]?.group === image.group;

    if (continues) {
      previous.images.push(image);
      previous.caption = previous.caption ?? image.caption;
      previous.overlay = previous.overlay || image.overlay;
      continue;
    }

    out.push({
      images: [image],
      caption: image.caption,
      overlay: image.overlay,
    });
  }

  return out;
}

/* Teases on hover, opens a set of pictures on click. Rendered as a dialog so
 * keyboard and screen-reader users get the same thing hover users do. */
function GallerySegment({
  segment,
}: {
  segment: Extract<Segment, { kind: "gallery" }>;
}) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState(false);
  /* Sources that 404ed. A picture that is not there yet leaves the gallery
   * rather than sitting in it as a broken frame. */
  const [broken, setBroken] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const { play } = useSound();

  // Tapping outside closes the card on touch devices.
  useEffect(() => {
    if (!card) return;
    const onDocPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setCard(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [card]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const showCard = () => {
    if (!card) play("hover");
    setCard(true);
  };

  const groups = groupImages(
    segment.images.filter((image) => !broken.includes(image.src)),
  );

  return (
    <>
      <span
        ref={wrapperRef}
        className="relative inline-block"
        onMouseEnter={showCard}
        onMouseLeave={() => setCard(false)}
      >
        <button
          type="button"
          onClick={() => setCard((prev) => !prev)}
          onFocus={showCard}
          aria-expanded={card}
          title={segment.teaser}
          className="cursor-help text-ink underline decoration-accent decoration-dotted decoration-1 underline-offset-4 transition-colors duration-200 hover:text-accent"
        >
          {segment.value}
        </button>

        <AnimatePresence>
          {card && (
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-full z-40 block w-[min(21rem,calc(100vw-3rem))] pt-3 sm:left-full sm:top-0 sm:w-[21rem] sm:pl-3 sm:pt-0"
            >
              <span className="block rounded-lg border border-line bg-surface p-5 text-left shadow-[0_12px_40px_-12px_rgb(0_0_0/0.18)]">
                <span className="block text-muted">
                  {segment.lead}
                  <button
                    type="button"
                    onClick={() => {
                      play("click");
                      setOpen(true);
                    }}
                    className="text-ink underline decoration-accent decoration-dotted decoration-1 underline-offset-4 transition-colors duration-200 hover:text-accent"
                  >
                    {segment.trigger}
                  </button>
                  {segment.tail}
                </span>
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-6 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={segment.title}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-surface p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-ink">{segment.title}</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors duration-200 hover:text-ink"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {groups.length === 0 ? (
                <p className="mt-5 rounded-lg border border-dashed border-line px-4 py-6 text-center text-muted">
                  pictures coming
                </p>
              ) : (
                <div className="mt-5 space-y-7">
                  {groups.map((group, gi) => (
                    <motion.figure
                      key={group.images[0].src}
                      initial={{
                        opacity: 0,
                        y: 26,
                        scale: 0.96,
                        rotate: tiltFor(group.images[0].src) * 1.8,
                        filter: "blur(4px)",
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        rotate: tiltFor(group.images[0].src),
                        filter: "blur(0px)",
                      }}
                      transition={{
                        duration: 0.46,
                        delay: gi * 0.09,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="space-y-2 drop-shadow-[0_2px_3px_rgba(20,20,25,0.16)]"
                    >
                      {group.images.map((image) => (
                        <span key={image.src} className="relative block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.src}
                            alt={image.alt}
                            className="w-full rounded-lg border border-line"
                            loading="lazy"
                            onError={() =>
                              setBroken((prev) =>
                                prev.includes(image.src)
                                  ? prev
                                  : [...prev, image.src],
                              )
                            }
                          />
                          {image.overlay && image.caption && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 grid place-items-center text-6xl drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)] sm:text-7xl"
                            >
                              {image.caption}
                            </span>
                          )}
                        </span>
                      ))}
                      {group.caption && !group.overlay && (
                        <figcaption className="text-sm text-muted">
                          {group.caption}
                        </figcaption>
                      )}
                    </motion.figure>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------- exported -- */

/** Renders one segment. Shared by the bio and the "other stuff" list.
 *  `disclosure` is supplied by whoever owns the open/closed state. */
export function Segments({
  paragraph,
  disclosure,
}: {
  paragraph: Paragraph;
  disclosure?: { open: boolean; onToggle: () => void };
}) {
  return (
    <>
      {paragraph.map((segment, index) => {
        switch (segment.kind) {
          case "text":
            return <span key={index}>{segment.value}</span>;
          case "link":
            return (
              <TextLink
                key={index}
                value={segment.value}
                href={segment.href}
                newTab={segment.newTab}
              />
            );
          case "reveal":
            return <RevealSegment key={index} segment={segment} />;
          case "spoiler":
            return <SpoilerSegment key={index} segment={segment} />;
          case "gallery":
            return <GallerySegment key={index} segment={segment} />;
          case "expandable":
            return <ExpandableSegment key={index} segment={segment} />;

          case "disclosure":
            if (!disclosure) return <span key={index}>{segment.value}</span>;
            return (
              <DisclosureTrigger
                key={index}
                label={segment.value}
                open={disclosure.open}
                onToggle={disclosure.onToggle}
              />
            );
        }
      })}
    </>
  );
}

/* --------------------------------------------------------- expandable -- */

/* A drop-down that lives inside the extras list and carries its own items.
 * Same motion as the "other stuff" one in intro.tsx, and the same rule about
 * clipping: clipped while it moves so it slides out from behind the line
 * above, then released on a timer so any hover card inside it is not sliced
 * off at the bottom edge. */
function ExpandableSegment({
  segment,
}: {
  segment: Extract<Segment, { kind: "expandable" }>;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLSpanElement>(null);
  const { play } = useSound();

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    if (!open) {
      el.style.overflow = "hidden";
      return;
    }

    el.style.overflow = "hidden";
    const release = window.setTimeout(() => {
      el.style.overflow = "visible";
    }, 380);
    return () => window.clearTimeout(release);
  }, [open]);

  return (
    <span className="block">
      <button
        type="button"
        onClick={() => {
          play("click");
          setOpen((prev) => !prev);
        }}
        onPointerEnter={() => play("hover")}
        aria-expanded={open}
        className="group relative inline-flex items-center gap-1 text-ink transition-colors duration-200 hover:text-accent"
      >
        {segment.value}
        <span className="absolute -bottom-px left-0 h-px w-full bg-line" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3 transition-transform duration-300 ease-out ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.span
            ref={boxRef}
            className="block"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="mt-2.5 block space-y-2 border-l border-line pl-4">
              {segment.items.map((paragraph, index) => (
                <span key={index} className="block">
                  <Segments paragraph={paragraph} />
                </span>
              ))}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function DisclosureTrigger({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { play } = useSound();

  return (
    <button
      type="button"
      onClick={() => {
        play("click");
        onToggle();
      }}
      onPointerEnter={() => play("hover")}
      aria-expanded={open}
      className="group relative inline-flex items-center gap-1 text-ink transition-colors duration-200 hover:text-accent"
    >
      {label}
      <span className="absolute -bottom-px left-0 h-px w-full bg-line" />
      <span className="absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3"
        aria-hidden="true"
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <path d="M6 9l6 6 6-6" />
      </motion.svg>
    </button>
  );
}

export function Bio({ paragraphs }: { paragraphs: Paragraph[] }) {
  return (
    <div className="space-y-3.5 text-muted">
      {paragraphs.map((paragraph, pIndex) => (
        <motion.p
          key={pIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.15 + pIndex * 0.09,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Segments paragraph={paragraph} />
        </motion.p>
      ))}
    </div>
  );
}
