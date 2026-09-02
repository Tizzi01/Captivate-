"use client";

/* The password prompt. It knows nothing: it posts the guess to /api/unlock and
 * does as it is told. The answer is not in this file, this bundle, or anything
 * else the browser receives.
 *
 * On success it refreshes the route rather than revealing anything itself. The
 * server then rebuilds the page, this time including the protected content,
 * because the request now carries the unlock cookie. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";

import { useSound } from "@/components/sound";

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
  const router = useRouter();
  const { play } = useSound();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || value.length === 0) return;

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
      };
      setError(body.error ?? "That's not it.");
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
          placeholder="password"
          autoComplete="off"
          aria-label="Password"
          /* chat-input suppresses the focus ring, the same exception the
             composer makes: a hard rectangle drawn around a pill looks broken.
             The border going solid is the focus indicator instead. */
          className="chat-input min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-ink transition-colors duration-200 placeholder:text-muted focus:border-ink"
        />
        <button
          type="submit"
          disabled={busy || value.length === 0}
          onPointerEnter={() => play("hover")}
          className="shrink-0 rounded-full border border-line px-4 py-2 text-muted transition-colors duration-200 hover:text-ink disabled:opacity-40"
        >
          {busy ? "..." : label}
        </button>
      </div>

      {error && (
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
