import axios from "axios";
import { z } from "zod/v4";

import { DEFAULT_HEADERS } from "./constants.js";
import { generateTokenId } from "./utils.js";

export const TwitterDLVariantSchema = z.object({
  bitrate: z.number().default(0),
  content_type: z.string(),
  url: z.string().url(),
  height: z.coerce.string().transform(Number),
  width: z.coerce.string().transform(Number),
});

export const TwitterDlSchema = TwitterDLVariantSchema.array();

export const TwitterDLResponseSchema = z.object({
  includes: z.object({
    media: z.array(
      z.object({
        media_url_https: z.string().url(),
        type: z.string(),
        variants: z.array(TwitterDLVariantSchema),
      })
    ),
  }),
});

export default async function twitterdl(url: string) {
  url = z.string().url().parse(url);
  const id = (url.match(/status\/(\d+)/) || url.match(/(\d+)/))![1];
  const token = generateTokenId(id);

  const { data } = await axios(
    `https://api.redketchup.io/tweetAttachments-v6?id=${encodeURIComponent(
      token
    )}`,
    {
      headers: {
        ...DEFAULT_HEADERS,
        origin: "https://redketchup.io",
        referer: "https://redketchup.io/",
      },
    }
  );

  const json = TwitterDLResponseSchema.parse(data);
  const media = json.includes.media.find((media) => media.type === "video")!;
  const result = media.variants.filter(
    (variant) => variant.content_type !== "application/x-mpegURL"
  );

  return TwitterDlSchema.parse(result);
}
