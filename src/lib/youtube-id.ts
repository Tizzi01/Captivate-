/** Pulls the id out of any normal YouTube URL: watch?v=, youtu.be/, /embed/,
 *  /shorts/. Returns null if it can't, and the caller degrades to a link.
 *
 *  Deliberately here rather than in script-entry.tsx: that file is a client
 *  component, and the scripts page needs this on the server to look up view
 *  counts before it renders. */
export function youtubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}
