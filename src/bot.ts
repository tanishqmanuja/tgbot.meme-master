import os from "os";
import path from "path";
import { unlink } from "fs/promises";

import { Input, Telegraf } from "telegraf";
import { message } from "telegraf/filters";

import env from "./env";
import snapsave from "./lib/snapsave";
import twitterdl from "./lib/twitterdl";
import { getExtension } from "./utils/mime";
import { isFulfilled } from "./utils/promises";

const PKG_NAME = process.env["npm_package_name"] ?? "telegram-meme-bot";

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const TMP_DIR = env.TMP_DIR || path.join(os.tmpdir(), PKG_NAME);

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => ctx.reply("Chin Tapak Dum Dum"));

bot.on(message("text"), async (ctx, next) => {
  if (!ctx.message.text.startsWith("https://www.instagram.com")) {
    return next();
  }

  console.log("Request Start:", ctx.message.text);
  ctx.react("👀");

  const scrapped = await snapsave(ctx.message.text).catch((e) => {
    console.log("SnapSave Error", e);
  });

  if (!scrapped || scrapped.results.length === 0) {
    return ctx.react("👎");
  }

  console.log(
    "Downloading:",
    scrapped.results.length,
    scrapped.results.length > 1 ? "items" : "item"
  );
  const downloadPromises = scrapped.results.map(({ url }) =>
    download(url, ctx.message.message_id.toString(), (r) =>
      r.headers.get("content-disposition")?.split(".").at(-1)
    )
  );
  const downloadResults = await Promise.allSettled(downloadPromises);
  const fulfilledDownloads = downloadResults.filter(isFulfilled);

  ctx.react("✍");

  if (fulfilledDownloads.length === 0) {
    return ctx.react("👎");
  }

  const sent = await replyWithDownloadedMedia(
    ctx,
    fulfilledDownloads.map(({ value: { file } }) => file),
    ctx.message.text
  ).catch((err) => {
    console.warn("Failed to send Instagram media", err);
    return false;
  });

  fulfilledDownloads.forEach(({ value: { file } }) =>
    unlink(file).catch((err) => console.warn(err))
  );

  sent && downloadResults.every((p) => p.status === "fulfilled")
    ? ctx.react("👍")
    : ctx.react("👎");

  console.log("Request End");
});

bot.on(message("text"), async (ctx, next) => {
  if (!ctx.message.text.startsWith("https://x.com")) {
    return next();
  }

  console.log("Request Start:", ctx.message.text);
  ctx.react("👀");

  const scrapped = await twitterdl(ctx.message.text).catch((e) => {
    console.log("TwitterDL Error", e);
  });

  if (!scrapped || scrapped.length === 0) {
    return ctx.react("👎");
  }

  const url = scrapped.sort((a, b) => b.bitrate - a.bitrate).at(0)!.url;

  console.log("Downloading:", 1, "item");

  const result = await download(url, ctx.message.message_id.toString(), (r) =>
    getExtension(r.headers.get("content-type") ?? "")
  ).catch((err) => {
    console.warn("Twitter download failed", err);
  });
  ctx.react("✍");

  if (!result || !result.success) {
    ctx.react("👎");
  } else {
    const sent = await replyWithDownloadedMedia(ctx, [result.file], ctx.message.text)
      .catch((err) => {
        console.warn("Failed to send Twitter media", err);
        return false;
      });

    sent ? ctx.react("👍") : ctx.react("👎");
  }

  if (result) {
    unlink(result.file).catch((err) => console.warn(err));
  }

  console.log("Request End");
});

export default bot;

/* HELPERS */

async function download(
  url: string,
  id: string,
  ext: ((res: Response) => string | undefined) | string | undefined
) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const extension = ext instanceof Function ? ext(response) : ext;
  const contentType = response.headers.get("content-type") ?? "";
  if (!isSupportedMediaContentType(contentType)) {
    throw new Error(`Unsupported media content type: ${contentType || "unknown"}`);
  }

  const filename = `${id}-${Bun.randomUUIDv7()}`;
  const fp = path.join(
    TMP_DIR,
    extension ? `${filename}.${extension}` : filename
  );

  await Bun.write(fp, response, {
    createPath: true,
  });

  return { file: fp, success: true };
}

async function replyWithDownloadedMedia(
  ctx: Parameters<typeof bot.on>[1] extends (ctx: infer T, next: infer _N) => unknown
    ? T
    : never,
  files: string[],
  caption: string
) {
  if (files.length === 1) {
    const [file] = files;
    if (!file) {
      return false;
    }

    if (file.endsWith(".mp4")) {
      await ctx.replyWithVideo(Input.fromLocalFile(file), { caption });
    } else {
      await ctx.replyWithPhoto(Input.fromLocalFile(file), { caption });
    }

    return true;
  }

  if (files.length >= 2) {
    await ctx.replyWithMediaGroup(
      files.map((file, index) => ({
        type: file.endsWith(".mp4") ? "video" : "photo",
        media: Input.fromLocalFile(file),
        caption: index === 0 ? caption : "",
      }))
    );

    return true;
  }

  return false;
}

function isSupportedMediaContentType(contentType: string) {
  return contentType.startsWith("image/") || contentType.startsWith("video/");
}
