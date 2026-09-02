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
  checkPassword,
  isUnlockConfigured,
  isUnlockScope,
  mintToken,
  unlockCookie,
} from "@/lib/unlock";

/** Guesses allowed per IP per window, and the window. */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;

/* In memory, so it resets on redeploy and is per instance. Enough to stop a
 * script; a determined attacker is handled by the password not being guessable
 * and by there being nothing to read without it. */
const attempts = new Map<string, { count: number; resetAt: number }>();

/** 0 when the guess is allowed, otherwise seconds until they can try again.
 *  Returning the number rather than a boolean is what lets the form count
 *  down instead of saying "a few minutes" and leaving people guessing. */
function retryAfterSeconds(ip: string): number {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return 0;
  }

  record.count += 1;
  if (record.count <= MAX_ATTEMPTS) return 0;

  return Math.max(1, Math.ceil((record.resetAt - now) / 1000));
}

/* Whose guesses these are. The limit is per address, so running out of tries
 * never locks anybody else out.
 *
 * Two headers rather than one: x-forwarded-for is what proxies normally set,
 * x-real-ip is the fallback. If neither is there everyone lands in the same
 * bucket, which WOULD be shared, so it is worth knowing that Vercel always
 * sets the first one. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  if (!isUnlockConfigured()) {
    return NextResponse.json(
      { error: "The password is not set up on this deployment." },
      { status: 503 },
    );
  }

  const wait = retryAfterSeconds(clientIp(request));
  if (wait > 0) {
    return NextResponse.json(
      { error: "Too many tries.", retryAfterSeconds: wait },
      // Retry-After is the standard header for this, for anything that is not
      // our own form: browsers, crawlers, monitoring.
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }

  let submitted: unknown;
  let scope: unknown;
  try {
    const body = (await request.json()) as {
      password?: unknown;
      scope?: unknown;
    };
    submitted = body.password;
    scope = body.scope;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Only the areas that exist, so a made-up scope cannot mint a cookie.
  if (!isUnlockScope(scope)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!checkPassword(submitted)) {
    return NextResponse.json({ error: "That's not it." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(unlockCookie(scope), mintToken(scope), {
    httpOnly: true, // JavaScript in the page cannot read it
    sameSite: "lax", // not sent from other sites
    secure: process.env.NODE_ENV === "production", // https only when deployed
    path: "/",
    /* No maxAge: a session cookie, gone when the browser closes. It rarely
     * lives that long anyway, since the middleware spends it on the next page
     * view, but it means a browser left open overnight is not holding one. */
  });
  return response;
}
