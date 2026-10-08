const LINK = /https?:\/\/[^\s<>"']+/i;

const INSTAGRAM = /(^|\.)instagram\.com$/i;
const X = /(^|\.)(x\.com|twitter\.com)$/i;
const SHORTENER = /(^|\.)t\.co$/i;

/** First http(s) link in a message, trailing punctuation stripped. */
export function extractLink(text: string) {
  const raw = text.match(LINK)?.[0];
  return raw?.replace(/[.,;:!?)\]}'"]+$/, "");
}

export function getHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** X share links from the mobile app are t.co redirects; unwrap them. */
export async function resolveShortLink(url: string) {
  if (!SHORTENER.test(getHost(url))) {
    return url;
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    return response.url || url;
  } catch {
    return url;
  }
}

export function getStatusId(url: string) {
  return url.match(/status\/(\d+)/)?.[1] ?? url.match(/statuses\/(\d+)/)?.[1];
}

export type Platform = "instagram" | "x" | null;

export function getPlatform(url: string): Platform {
  const host = getHost(url);
  if (INSTAGRAM.test(host)) return "instagram";
  if (X.test(host)) return "x";
  return null;
}