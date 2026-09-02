/* ============================================================================
 *  /api/unlock — trades the password for a signed cookie.
 *
 *  The only place the password is ever compared, and it runs on the server.
 *  A wrong guess gets a flat "no": no hint about how close it was, and the
 *  comparison itself is timing safe so the response time does not leak the
 *  answer a character at a time.
 *
 *  Rate limited per IP, because a four second brute force of a short password
 *  is otherwise trivial to script.
 * ========================================================================= */

import { NextResponse } from "next/server";

import {
  UNLOCK_COOKIE,
  UNLOCK_MAX_AGE_SECONDS,
  checkPassword,
  isUnlockConfigured,
  mintToken,
} from "@/lib/unlock";

/** Guesses allowed per IP per window, and the window. */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;

/* In memory, so it resets on redeploy and is per instance. Enough to stop a
 * script; a determined attacker is handled by the password not being guessable
 * and by there being nothing to read without it. */
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  if (!isUnlockConfigured()) {
    return NextResponse.json(
      { error: "The password is not set up on this deployment." },
      { status: 503 },
    );
  }

  if (tooManyAttempts(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many tries. Give it a few minutes." },
      { status: 429 },
    );
  }

  let submitted: unknown;
  try {
    submitted = ((await request.json()) as { password?: unknown }).password;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!checkPassword(submitted)) {
    return NextResponse.json({ error: "That's not it." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(UNLOCK_COOKIE, mintToken(), {
    httpOnly: true, // JavaScript in the page cannot read it
    sameSite: "lax", // not sent from other sites
    secure: process.env.NODE_ENV === "production", // https only when deployed
    path: "/",
    maxAge: UNLOCK_MAX_AGE_SECONDS,
  });
  return response;
}
