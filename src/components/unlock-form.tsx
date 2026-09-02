"use client";

/* The password prompt. It knows nothing: it posts the guess to /api/unlock and
 * does as it is told. The answer is not in this file, this bundle, or anything
 * else the browser receives.
 *
 * On success it refreshes the route rather than revealing anything itself. The
 * server then rebuilds the page, this time including the protected content,
 * because the request now carries the unlock cookie. */

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";

import { useSound } from "@/components/sound";

/* A clock that ticks once a second, and only while something is watching it.
 *
 * Through useSyncExternalStore rather than a setInterval in an effect: this is
 * the browser's own state, not React's, and reading it this way means no timer
 * runs at all unless a countdown is actually on screen. */
const nowSeconds = () => Math.floor(Date.now() / 1000);
const nowOnServer = () => 0;

function subscribeToClock(onTick: () => void): () => void {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}

function subscribeToNothing(): () => void {
  return () => {};
}

export function UnlockForm({
  scope,
  label = "Unlock",
}: {
  /** Which area this form unlocks. Each is unlocked separately. */
  scope: "scripts" | "network";
  label?: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** When they may try again, in epoch seconds. Null when they may right now. */
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const router = useRouter();
  const { play } = useSound();

  // The clock only runs while there is a countdown to show.
  const now = useSyncExternalStore(
    lockedUntil === null ? subscribeToNothing : subscribeToClock,
    nowSeconds,
    nowOnServer,
  );

  const remaining = lockedUntil === null ? 0 : Math.max(0, lockedUntil - now);
  const lockedOut = remaining > 0;

  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || lockedOut || value.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value, scope }),
      });

      if (response.ok) {
        play("travel");
        setValue("");
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        retryAfterSeconds?: number;
      };

      /* Too many guesses. Hold the moment they can try again, and let the
       * countdown above do the talking, so nobody is left wondering whether
       * "a few minutes" means one or ten. */
      if (response.status === 429 && body.retryAfterSeconds) {
        setLockedUntil(nowSeconds() + body.retryAfterSeconds);
        setError(null);
      } else {
        setError(body.error ?? "That's not it.");
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 max-w-sm">
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={lockedOut ? "too many tries" : "password"}
          autoComplete="off"
          aria-label="Password"
          disabled={lockedOut}
          /* chat-input suppresses the focus ring, the same exception the
             composer makes: a hard rectangle drawn around a pill looks broken.
             The border going solid is the focus indicator instead. */
          className="chat-input min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-ink transition-colors duration-200 placeholder:text-muted focus:border-ink disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || lockedOut || value.length === 0}
          onPointerEnter={() => play("hover")}
          className="shrink-0 rounded-full border border-line px-4 py-2 text-muted transition-colors duration-200 hover:text-ink disabled:opacity-40"
        >
          {busy ? "..." : label}
        </button>
      </div>

      {lockedOut && (
        <p className="mt-2 text-sm text-muted" role="status">
          Too many tries. Try again in{" "}
          <span className="tabular-nums text-ink">{countdown}</span>
        </p>
      )}

      {error && !lockedOut && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-muted"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </form>
  );
}
