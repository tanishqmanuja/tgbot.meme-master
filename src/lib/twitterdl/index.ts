import { z } from "zod/v4";

import { DEFAULT_HEADERS } from "./constants";
import { getStatusId } from "../../utils/url";

const VariantSchema = z.object({
  url: z.url(),
  bitrate: z.coerce.number().default(0),
});

const MediaItemSchema = z.object({
  url: z.url(),
  variants: z.array(VariantSchema).default([]),
});

const MediaSchema = z.object({
  videos: z.array(MediaItemSchema).default([]),
  photos: z.array(MediaItemSchema).default([]),
});

const ResponseSchema = z.object({
  code: z.number(),
  tweet: z
    .object({ media: MediaSchema.nullish() })
    .nullish(),
});

export type Media = { url: string };

// ponytail: fxtwitter mirrors the public tweet payload; swap for the official
// Graph API only if this ever needs to be reliable enough to pay for.
export default async function twitterdl(url: string): Promise<Media[]> {
  const id = getStatusId(url);
  if (!id) {
    throw new Error(`Not an X post link: ${url}`);
  }

  const response = await fetch(
    `https://api.fxtwitter.com/i/status/${encodeURIComponent(id)}`,
    { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(20_000) }
  );

  if (!response.ok) {
    throw new Error(`X lookup failed with status ${response.status}`);
  }

  const json = ResponseSchema.safeParse(await response.json());
  if (!json.success) {
    throw new Error("unexpected response from X");
  }

  const media = json.data.tweet?.media;
  if (json.data.code !== 200 || !media) {
    throw new Error("That post has no downloadable media");
  }

  // Videos first (highest bitrate wins), then plain photos. X never mixes the
  // two on one post, so this stays a small list.
  const videos = media.videos
    .map(
      (video) =>
        video.variants
          .filter((variant) => !variant.url.includes(".m3u8"))
          .sort((a, b) => b.bitrate - a.bitrate)[0]?.url ?? video.url
    )
    .map((url) => ({ url }));

  return [...videos, ...media.photos.map((photo) => ({ url: photo.url }))];
}