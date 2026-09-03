/* ============================================================================
 *  unlock.ts — the password gate for /scripts and the channel details.
 *
 *  SECURITY, and the whole point of this file: the check happens on the
 *  SERVER. A password prompt in the browser is theatre if the page it is
 *  guarding already contains the data, because devtools shows the whole
 *  document and every script that built it, prompt or no prompt.
 *
 *  So nothing protected is ever rendered until this says so. A locked visitor
 *  is sent a page that genuinely does not contain the titles, the links, the
 *  channel names or the ids: there is nothing in the response to dig out.
 *
 *  The password itself never reaches the browser either. It lives in
 *  SITE_UNLOCK_PASSWORD, with no NEXT_PUBLIC_ prefix, so Next.js will not put
 *  it in a bundle. What the browser gets after a correct guess is a signed
 *  cookie, which proves the check passed without carrying the password.
 *
 *  Do not import this from a "use client" component.
 * ========================================================================= */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* The two locked areas. Each is unlocked on its own: unlocking the scripts
 * does not quietly unlock the network as well. They share a password, but not
 * a session, so each one asks. */
export const UNLOCK_SCOPES = ["scripts", "network"] as const;
export type UnlockScope = (typeof UNLOCK_SCOPES)[number];

export function isUnlockScope(value: unknown): value is UnlockScope {
  return (
    typeof value === "string" &&
    (UNLOCK_SCOPES as readonly string[]).includes(value)
  );
}

/** One cookie per area, so they cannot stand in for each other. */
export function unlockCookie(scope: UnlockScope): string {
  return `crantwiz_unlock_${scope}`;
}

/* How long an unlock lasts before the password is asked for again.
 *
 * It used to be two minutes, and to be spent on the first page view, so every
 * reload asked again. That was asked for and then lived with for a while, and
 * living with it is what settled it: typing a password to reload your own site
 * is a tax you pay forever to slow down an attacker who is not there.
 *
 * Thirty days, tied to the browser rather than the network. An address is the
 * wrong thing to trust: home and mobile connections change theirs constantly,
 * so it would sign you out at random, and carriers put thousands of strangers
 * behind one address, so it would sign some of them in. */
export const UNLOCK_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/* Trimmed, both of them.
 *
 * Pasting a value into a hosting dashboard picks up a trailing newline more
 * often than not, and an invisible character on the end of the stored password
 * makes every correct guess fail on a length check with nothing on screen to
 * explain why. It cost an afternoon once; it will not cost another.
 *
 * Nothing is lost by trimming: a password whose first or last character is a
 * space is a mistake, never a decision. */
const secret = () => (process.env.SITE_UNLOCK_SECRET ?? "").trim();
const password = () => (process.env.SITE_UNLOCK_PASSWORD ?? "").trim();

/** False when the env vars are missing, in which case everything stays locked.
 *  Failing closed: a missing password must never mean "let everyone in". */
export function isUnlockConfigured(): boolean {
  return secret().length > 0 && password().length > 0;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Compare without leaking, through timing, how much of a value was right. */
function sameBytes(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function checkPassword(input: unknown): boolean {
  if (!isUnlockConfigured()) return false;
  if (typeof input !== "string") return false;

  // Trimmed at this end too: phone keyboards like to add a space after a word.
  const given = input.trim();
  if (given.length === 0) return false;

  return sameBytes(given, password());
}

/** A cookie value that proves the password was given, without containing it.
 *  Carries its own expiry AND its area, both signed, so neither can be edited
 *  by hand and a token for one area cannot be replayed against the other. */
export function mintToken(scope: UnlockScope): string {
  const expiresAt = String(Date.now() + UNLOCK_MAX_AGE_SECONDS * 1000);
  const payload = `${scope}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(
  scope: UnlockScope,
  token: string | undefined,
): boolean {
  if (!isUnlockConfigured() || !token) return false;

  const [tokenScope, expiresAt, mac] = token.split(".");
  if (!tokenScope || !expiresAt || !mac) return false;

  // The area is inside the signature, so this cannot be swapped for the other.
  if (tokenScope !== scope) return false;

  // Signature next: an unsigned token is a forgery, whatever it claims.
  if (!sameBytes(mac, sign(`${tokenScope}.${expiresAt}`))) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && expiry > Date.now();
}

/** The one question every protected page asks. */
export async function isUnlocked(scope: UnlockScope): Promise<boolean> {
  const store = await cookies();
  return verifyToken(scope, store.get(unlockCookie(scope))?.value);
}
