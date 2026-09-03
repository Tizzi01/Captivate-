"use client";

/* ============================================================================
 *  theme.tsx — light/dark toggle with a circular wipe.
 *
 *  Strategy: a .dark class on <html>. The choice is stored in localStorage;
 *  with nothing stored we follow the OS preference and keep following it live.
 *  THEME_SCRIPT (below) runs before first paint so there is no flash.
 *
 *  The wipe uses the View Transitions API: the browser snapshots the page,
 *  we flip the class, and a CSS keyframe animation on ::view-transition-new
 *  reveals the result behind a circle growing from the button. Browsers with
 *  no View Transitions support just flip. See the rules in globals.css.
 * ========================================================================= */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { useSound } from "@/components/sound";

const STORAGE_KEY = "crantwiz:theme";
const WIPE_MS = 700;

/** Injected into <head>. Deliberately tiny and dependency-free. */
export const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}");
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Watch the <html> class, and follow the OS while no explicit choice exists. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = (event: MediaQueryListEvent) => {
    if (readStored()) return; // visitor has chosen; stop following the OS
    document.documentElement.classList.toggle("dark", event.matches);
  };
  media.addEventListener("change", onSystemChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystemChange);
  };
}

const isDark = () => document.documentElement.classList.contains("dark");
const isDarkOnServer = () => false;

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

function applyTheme(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  } catch {
    /* private mode — the class still applies for this session */
  }
}

/* Anything Enter already means something to. Enter is a global shortcut for
 * the theme here, so it has to stay out of the way of typing a message and of
 * activating whatever is focused — including this button itself, which would
 * otherwise flip the theme twice on one keypress. */
const ENTER_IS_SPOKEN_FOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "summary",
  "[contenteditable]",
  '[role="button"]',
  '[role="textbox"]',
].join(",");

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, isDarkOnServer);
  const { play } = useSound();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => {
    /* Read the class rather than the rendered value: the keyboard path can
     * fire between renders, and a stale value flips the theme to where it
     * already is. */
    const next = !isDark();
    play("theme");

    const doc = document as ViewTransitionDocument;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // No View Transitions support (or motion turned down): just flip.
    if (!doc.startViewTransition || reduced) {
      applyTheme(next);
      return;
    }

    // The circle grows from the middle of the button, whether the button was
    // clicked or Enter was pressed somewhere else entirely. This is the ONLY
    // thing measured here — element rects are reliable, while reading the
    // viewport size proved not to be. The end radius is a fixed 150vmax set in
    // globals.css, which clears every corner from any origin.
    const box = buttonRef.current?.getBoundingClientRect();
    const root = document.documentElement;
    if (box) {
      root.style.setProperty("--wipe-x", `${box.left + box.width / 2}px`);
      root.style.setProperty("--wipe-y", `${box.top + box.height / 2}px`);
    }
    root.style.setProperty("--wipe-duration", `${WIPE_MS}ms`);

    doc.startViewTransition(() => applyTheme(next));
  }, [play]);

  /* Enter anywhere flips the theme.
   *
   * Skipped whenever Enter already has a job: typing in the chat, or
   * activating whatever is focused. With nothing focused the target is the
   * body, which is the case this is for. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }
      if (event.isComposing) return; // mid IME composition
      const target = event.target as HTMLElement | null;
      if (target?.closest(ENTER_IS_SPOKEN_FOR)) return;
      toggle();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      onPointerEnter={() => play("hover")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={`${dark ? "Light mode" : "Dark mode"} (or press Enter)`}
      className="relative grid size-8 place-items-center rounded-full text-muted transition-colors duration-200 hover:text-ink"
    >
      {/* Both icons are rendered; CSS picks one off the .dark class on <html>.
          That matters: the class flips synchronously inside the transition
          callback, so the new snapshot is captured with the correct icon
          already in place. Driving this from React state instead would swap
          the icon a frame late, after the wipe had finished. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute size-4 dark:hidden"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute hidden size-4 dark:block"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
  );
}
