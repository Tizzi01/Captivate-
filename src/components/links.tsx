"use client";

/* Portfolio rows. Driven entirely by `links` in src/data/site.ts — an entry
 * with href: null renders as an inert "soon" row.
 *
 * Styled like arlan.me's work list: label on the left, quiet meta on the
 * right, no boxes or dividers. A row with a `note` expands it underneath on
 * hover, and on tap for anyone without a pointer.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useSound } from "@/components/sound";
import type { OutboundLink } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;

function Row({
  item,
  index,
  open,
  onOpen,
  onToggle,
}: {
  item: OutboundLink;
  index: number;
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const { play } = useSound();
  const internal = item.href?.startsWith("/") ?? false;

  const label = (
    <>
      <span className="relative">
        {item.label}
        {item.href && (
          <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100" />
        )}
      </span>
    </>
  );

  const rowClass =
    "group flex items-baseline justify-between gap-4 py-1 text-ink transition-colors duration-200 hover:text-accent";

  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 + index * 0.06 }}
      /* Opens on hover anywhere in the row. Closing is the list's job, not
         this row's: see LinkList. */
      onMouseEnter={() => item.note && onOpen()}
      onFocus={() => item.note && onOpen()}
    >
      {item.href ? (
        <a
          href={item.href}
          {...(internal
            ? {}
            : { target: "_blank", rel: "noreferrer noopener" })}
          onPointerEnter={() => play("hover")}
          onClick={() => play("click")}
          className={rowClass}
        >
          {label}
        </a>
      ) : (
        <div className={`${rowClass} cursor-default text-muted`}>{label}</div>
      )}

      {item.note && (
        <>
          {/* Touch devices have no hover, so the note needs a way in. */}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`About ${item.label}`}
            className="text-sm text-muted underline decoration-dotted underline-offset-4 sm:hidden"
          >
            {open ? "less" : "more"}
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.26, ease: EASE }}
                className="overflow-hidden"
              >
                <p className="pb-1 pt-1.5 text-sm text-muted">
                  {item.note}
                  {item.noteLink && (
                    <>
                      {" "}
                      {item.noteLink.href ? (
                        <a
                          href={item.noteLink.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={() => play("click")}
                          className="text-accent underline underline-offset-4"
                        >
                          {item.noteLink.label}
                        </a>
                      ) : (
                        /* No URL configured yet: name it without a dead link
                           rather than inventing an address. */
                        <span className="text-muted/80">
                          ({item.noteLink.label} link coming)
                        </span>
                      )}
                    </>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.li>
  );
}

export function LinkList({ items }: { items: OutboundLink[] }) {
  /* Which notes are open is held here rather than per row, so that crossing
   * from one row to the next reads as browsing the list rather than flicking
   * notes open and shut. A note opens when you reach its row and stays open
   * while you are anywhere in the list; they all close together when you
   * leave it.
   *
   * Keyed by label, which is already unique enough to be the React key. */
  const [opened, setOpened] = useState<string[]>([]);

  const open = (label: string) =>
    setOpened((prev) => (prev.includes(label) ? prev : [...prev, label]));

  const toggle = (label: string) =>
    setOpened((prev) =>
      prev.includes(label)
        ? prev.filter((entry) => entry !== label)
        : [...prev, label],
    );

  return (
    <ul
      onMouseLeave={() => setOpened([])}
      /* Same rule for the keyboard: only once focus has left the list
         entirely, not while it moves between rows inside it. */
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpened([]);
        }
      }}
    >
      {items.map((item, index) => (
        <Row
          key={item.label}
          item={item}
          index={index}
          open={opened.includes(item.label)}
          onOpen={() => open(item.label)}
          onToggle={() => toggle(item.label)}
        />
      ))}
    </ul>
  );
}
