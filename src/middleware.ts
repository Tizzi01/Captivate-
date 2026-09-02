/* ============================================================================
 *  middleware.ts — makes an unlock last exactly one page view.
 *
 *  The cookie is spent the moment it is used. This request still carries it,
 *  so the page renders unlocked; the response clears it, so the next load asks
 *  again. Refresh, reopen, come back tomorrow: the password is asked for every
 *  time, and a cookie copied off the machine is worthless by the time anyone
 *  gets to it.
 *
 *  It runs here rather than in the page because a Server Component cannot set
 *  cookies. Middleware sees the same request and owns the response.
 * ========================================================================= */

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED: Record<string, string> = {
  "/scripts": "captivate_unlock_scripts",
  "/network": "captivate_unlock_network",
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const cookieName = PROTECTED[request.nextUrl.pathname];
  if (!cookieName) return response;

  /* Next prefetches links on hover. Spending the unlock on a page nobody has
   * opened yet would lock them out of the one they are about to click. */
  if (request.headers.get("next-router-prefetch")) return response;

  if (request.cookies.has(cookieName)) {
    /* Written as a raw header rather than through response.cookies.delete().
     *
     * That helper rewrites the request cookies as well as the response ones,
     * so the page underneath would render as though it had never been
     * unlocked: the visitor types the right password and is shown the lock
     * again. Setting the header directly clears it in the browser and leaves
     * this request alone, so this view is unlocked and the next one is not. */
    response.headers.append(
      "Set-Cookie",
      `${cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    );
  }

  return response;
}

export const config = {
  matcher: ["/scripts", "/network"],
};
