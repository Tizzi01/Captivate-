/* ============================================================================
 *  discord.ts — mirrors chatbot conversations into a Discord channel.
 *
 *  Server-only. The webhook URL lives in DISCORD_WEBHOOK_URL and never reaches
 *  the browser. Anyone holding that URL can post to the channel, so it is a
 *  secret like the API keys.
 *
 *  Every call is fire-and-forget and swallows its own errors: logging must
 *  never be able to break or slow down a reply to a visitor.
 * ========================================================================= */

/** Discord rejects messages over 2000 characters. */
const DISCORD_LIMIT = 2000;

function clip(text: string, max: number): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Post one exchange to the channel. `sessionId` is a short random id from the
 * visitor's browser so a back-and-forth reads as one thread rather than a pile
 * of unrelated lines.
 */
export function logConversation({
  userMessage,
  botReply,
  sessionId,
}: {
  userMessage: string;
  botReply: string;
  sessionId: string;
}): void {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  const body = [
    `\`${sessionId}\``,
    `**them:** ${clip(userMessage, 700)}`,
    `**bot:** ${clip(botReply, 900)}`,
  ].join("\n");

  // Deliberately not awaited: the visitor's reply must not wait on Discord.
  void fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: clip(body, DISCORD_LIMIT),
      // Stop a visitor typing "@everyone" from pinging the server.
      allowed_mentions: { parse: [] },
    }),
  })
    .then(async (response) => {
      // fetch only rejects on network failure, so a deleted or mistyped
      // webhook would otherwise fail completely silently.
      if (!response.ok) {
        console.error(
          `[discord] webhook rejected (${response.status}):`,
          (await response.text()).slice(0, 200),
        );
      }
    })
    .catch((error) => {
      console.error("[discord] log failed:", error);
    });
}
