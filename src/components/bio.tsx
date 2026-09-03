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

import { HoverAside } from "@/components/hover-aside";
import { useSound } from "@/components/sound";
import { Slam, composeStack, hashSeed } from "@/components/slam-stack";
import { useMagnetism } from "@/components/use-magnetism";
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
  // Crantwiz is linked, so it reads as its own site rather than a subsection.
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
        className="cursor-help group relative text-ink transition-colors duration-200 hover:text-accent"
      >
        {segment.value}
        <span className="absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
        <span className="absolute -bottom-px left-0 h-px w-full bg-line" />
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

/* ---------------------------------------------------------------- aside -- */

/* The behaviour lives in HoverAside, because the page heading uses it too.
 * This only unwraps the segment into it. */
function AsideSegment({
  segment,
}: {
  segment: Extract<Segment, { kind: "aside" }>;
}) {
  return <HoverAside label={segment.value} lead={segment.lead} />;
}

/* -------------------------------------------------------------- gallery -- */

/** How far each picture tucks under the one above it, in px. */
const PILE_OVERLAP = 18;

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

/* The pile itself, split out so it mounts with the dialog. If the reveal lived
 * in GallerySegment it would fire on page load, and by the time anyone opened
 * the pictures the entrance would be long over.
 *
 * This is also the host for the pointer physics: everything inside it leans
 * toward the cursor, can be dragged around, and springs back when released.
 * See use-magnetism. */
function GalleryPictures({
  groups,
  seed,
  onBroken,
}: {
  groups: ImageGroup[];
  seed: string;
  onBroken: (src: string) => void;
}) {
  const pileRef = useRef<HTMLDivElement>(null);
  useMagnetism(pileRef);

  const stack = composeStack(groups.length, hashSeed(seed));

  return (
    <div ref={pileRef} className="mt-5 flex flex-col">
      {groups.map((group, gi) => (
        <div
          key={group.images[0].src}
          /* Each one tucks under the bottom of the one above it, and sits on
             top of it, so the stack reads as a pile with depth rather than a
             list with gaps. */
          style={{ marginTop: gi === 0 ? 0 : -PILE_OVERLAP }}
        >
          {/* Stacking order lives on the Slam, not here, so that picking a
              picture up can lift it above the others. */}
          <Slam placed={stack[gi]} idx={gi} z={gi + 1} className="block">
            <figure className="relative">
              {group.images.map((image, ii) => (
                <span
                  key={image.src}
                  className="relative block"
                  style={{ marginTop: ii === 0 ? 0 : -PILE_OVERLAP / 2 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt={image.alt}
                    draggable={false}
                    className="w-full select-none rounded-lg border border-line bg-surface"
                    loading="lazy"
                    onError={() => onBroken(image.src)}
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

              {/* Captions sit at the TOP of their picture, not the bottom.
                  The next picture in the pile overlaps this one's bottom edge,
                  so a caption down there would be buried by it. */}
              {/* A label stuck on at the edge, not printed across the
                  picture. It hangs off the top so it covers none of the image
                  itself, and sits in the seam where the picture above overlaps
                  this one. */}
              {group.caption && !group.overlay && (
                <figcaption className="pointer-events-none absolute -top-3 left-5 -rotate-2 rounded-[3px] border border-line bg-surface px-2 py-1 text-xs leading-snug text-ink shadow-[0_2px_6px_rgba(20,20,25,0.16)]">
                  {group.caption}
                </figcaption>
              )}
            </figure>
          </Slam>
        </div>
      ))}
    </div>
  );
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
        /* Plain inline, not inline-block: the continuation below has to be
           able to wrap onto the next line with the rest of the paragraph.
           The wrapper covers the phrase AND the continuation, so moving onto
           the text to click through to the pictures does not dismiss it. */
        onMouseEnter={showCard}
        onMouseLeave={() => setCard(false)}
      >
        <button
          type="button"
          /* The phrase is the way in now. Hovering it finishes the
             sentence, clicking it opens the pictures. There used to be a
             second link buried in the revealed text doing the opening, which
             meant reading a line before you could find the thing to click. */
          onClick={() => {
            play("click");
            setOpen(true);
          }}
          onFocus={showCard}
          aria-haspopup="dialog"
          title={segment.teaser}
          className="cursor-help group relative text-ink transition-colors duration-200 hover:text-accent"
        >
          {segment.value}
          <span className="absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
          <span className="absolute -bottom-px left-0 h-px w-full bg-line" />
        </button>

        <AnimatePresence>
          {card && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              /* Set inline, inside the paragraph, so it genuinely continues
                 the sentence and wraps with it.
              
                 It used to be positioned absolutely beside the phrase, which
                 takes it out of the flow entirely. With the phrase near the
                 end of a line there was nothing to sit beside, so it landed
                 on top of the lines underneath instead.
              
                 It goes AFTER the phrase, never before, so the phrase does not
                 move when it appears. If it moved, the pointer would slide off
                 the very thing holding it open and it would flicker.
              
                 And it is not rendered at all until hovered, rather than
                 hidden: there is nothing sitting in the page to be selected or
                 clicked by accident. */
              className="text-muted"
            >
              {segment.lead}
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
            /* The whole screen, and the scroller itself. This used to be a
               narrow bordered box with its own scrollbar, which is a cage:
               there was nowhere to drag a picture to. The pictures now sit in
               open space with room either side of them. */
            className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-bg/85 px-6 py-16 backdrop-blur-sm"
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
              className="mx-auto w-full max-w-md"
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <h3 className="text-ink">{segment.title}</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="fixed right-6 top-6 z-10 grid size-8 place-items-center rounded-full border border-line bg-bg/80 text-muted backdrop-blur-sm transition-colors duration-200 hover:text-ink"
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
                <GalleryPictures
                  groups={groups}
                  seed={segment.value}
                  onBroken={(src) =>
                    setBroken((prev) =>
                      prev.includes(src) ? prev : [...prev, src],
                    )
                  }
                />
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
          case "aside":
            return <AsideSegment key={index} segment={segment} />;

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
