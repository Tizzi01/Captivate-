/* ============================================================================
 *  /api/chat — the chatbot's server side, running on Google Gemini's free tier.
 *
 *  SECURITY: the Gemini API key is read from process.env here and never leaves
 *  the server. The browser talks to THIS route; this route talks to Google.
 *  The key is never in the page, the bundle, or any response.
 *
 *  COST: nothing. The free tier has a daily request cap and no billing
 *  attached, so the worst a spammer can do is use up the day's allowance and
 *  make the bot go quiet until it resets. When that happens we return 429 and
 *  the UI shows CHAT_QUOTA_MESSAGE instead of looking broken.
 * ========================================================================= */

import { GoogleGenAI, ApiError } from "@google/genai";

import { logConversation } from "@/lib/discord";

import {
  CHAT_BUSY_MESSAGE,
  CHAT_LIMITS,
  CHAT_MODEL,
  CHAT_QUOTA_MESSAGE,
  SYSTEM_PROMPT,
} from "@/data/persona";

export const runtime = "nodejs";
/** Never cache a chat reply. */
export const dynamic = "force-dynamic";

/* ---------------------------------------------------------- rate limit ---- */

/* In-memory sliding window, keyed by IP. This mostly exists to make the free
 * daily quota last: it stops one person burning the whole day's allowance in
 * a minute. Serverless instances each hold their own copy, so it's a speed
 * bump rather than a hard guarantee — which is fine, because hitting the
 * ceiling costs nothing here. */
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = CHAT_LIMITS.rateLimitWindowSeconds * 1000;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= CHAT_LIMITS.rateLimitRequests) {
    hits.set(ip, recent);
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map can't grow without bound.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(key);
    }
  }
  return false;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/* ------------------------------------------------------------- request ---- */

type IncomingMessage = { role: "user" | "assistant"; content: string };

function isValidHistory(value: unknown): value is IncomingMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
  );
}

/** A 429 that tells the client WHICH limit was hit. Only a daily one should
 *  close the input; a per-minute one just needs a few seconds. */
function limitResponse(daily: boolean): Response {
  return new Response(daily ? CHAT_QUOTA_MESSAGE : CHAT_BUSY_MESSAGE, {
    status: 429,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Chat-Limit": daily ? "day" : "minute",
    },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return textResponse("the chat isn't switched on yet", 503);
  }

  if (rateLimited(clientIp(request))) {
    return limitResponse(false);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return textResponse("bad request", 400);
  }

  const { messages, sessionId } = (payload ?? {}) as {
    messages?: unknown;
    sessionId?: unknown;
  };
  if (!isValidHistory(messages) || messages.length === 0) {
    return textResponse("bad request", 400);
  }

  // Trim to the last N turns, cap each message's length, drop empties.
  const trimmed = messages
    .slice(-CHAT_LIMITS.maxHistoryMessages)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, CHAT_LIMITS.maxMessageChars),
    }))
    .filter((m) => m.content.trim().length > 0);

  if (trimmed.length === 0 || trimmed[trimmed.length - 1]!.role !== "user") {
    return textResponse("bad request", 400);
  }

  // Gemini calls the assistant side "model", not "assistant".
  const contents = trimmed.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const stream = await ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: CHAT_LIMITS.maxOutputTokens,
        temperature: 0.9, // a bit loose, so it doesn't sound robotic
      },
    });

    const lastUserMessage = trimmed[trimmed.length - 1]!.content;
    const thread =
      typeof sessionId === "string" && /^[A-Za-z0-9_-]{1,16}$/.test(sessionId)
        ? sessionId
        : "anon";

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Collected so the finished exchange can be mirrored to Discord.
        let full = "";
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              full += text;
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (error) {
          console.error("[chat] stream failed:", error);
          controller.enqueue(encoder.encode("\n\n(connection dropped, sorry)"));
        } finally {
          controller.close();
          if (full.trim()) {
            logConversation({
              userMessage: lastUserMessage,
              botReply: full,
              sessionId: thread,
            });
          }
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        /* Google returns 429 for TWO very different things:
         *   - per-minute rate limit — a few seconds' pause fixes it
         *   - per-day quota — genuinely done until tomorrow
         * Treating both as "done for today" wrongly locks the chat after a
         * quick burst of messages. The quota id in the error names which. */
        const detail = String(error.message ?? "");
        const daily = /per[-\s]?day|perday|daily/i.test(detail);
        console.error(
          `[chat] 429 (${daily ? "daily quota" : "rate limit"}):`,
          detail.slice(0, 600),
        );
        return limitResponse(daily);
      }
      if (error.status === 401 || error.status === 403) {
        console.error("[chat] bad GEMINI_API_KEY:", error.message);
        return textResponse("the chat isn't configured right", 503);
      }
      console.error(`[chat] API error ${error.status}:`, error.message);
      return textResponse("something broke on my end", 502);
    }
    console.error("[chat] unexpected:", error);
    return textResponse("something broke on my end", 500);
  }
}
