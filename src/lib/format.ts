/* Pure number formatting. Safe to import from client components — this file
 * deliberately contains no API access and no environment variables. */

/** 1234567 -> "1.23M". Mirrors how YouTube itself abbreviates counts. */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k < 100 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}K`;
  }
  if (n < 1_000_000_000) {
    const m = n / 1_000_000;
    return `${m < 100 ? m.toFixed(2).replace(/\.?0+$/, "") : Math.round(m)}M`;
  }
  return `${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B`;
}

/** Full number with separators, used for the hover title attribute. */
export function exact(n: number): string {
  return n.toLocaleString("en-US");
}
