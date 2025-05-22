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

  ctx.react("👀");

  const scrapped = await snapsave(ctx.message.text).catch(() => undefined);

  if (!scrapped || scrapped.results.length === 0) {
    return ctx.react("👎");
  }

  console.log("Downloading:", scrapped.results.length, "items");
  const downloadPromises = scrapped.results.map(({ url }) =>
    download(url, ctx.message.message_id.toString(), (r) =>
      r.headers.get("content-disposition")?.split(".").at(-1)
    )
  );
  const downloadResults = await Promise.allSettled(downloadPromises);

  ctx.react("✍");

  await ctx.replyWithMediaGroup(
    downloadResults.filter(isFulfilled).map(({ value: { file } }, index) => ({
      type: file.endsWith(".mp4") ? "video" : "photo",
      media: Input.fromLocalFile(file),
      caption: index === 0 ? ctx.message.text : "",
    }))
  );

  downloadResults
    .filter(isFulfilled)
    .forEach(({ value: { file } }) =>
      unlink(file).catch((err) => console.warn(err))
    );

  downloadResults.every((p) => p.status === "fulfilled")
    ? ctx.react("👍")
    : ctx.react("👎");
});

bot.on(message("text"), async (ctx, next) => {
  if (!ctx.message.text.startsWith("https://x.com")) {
    return next();
  }

  ctx.react("👀");

  const scrapped = await twitterdl(ctx.message.text).catch(() => undefined);

  if (!scrapped || scrapped.length === 0) {
    return ctx.react("👎");
  }

  const url = scrapped.sort((a, b) => b.bitrate - a.bitrate).at(0)!.url;

  console.log("Downloading:", 1, "items");

  const result = await download(url, ctx.message.message_id.toString(), (r) =>
    getExtension(r.headers.get("content-type") ?? "")
  ).catch(undefined);
  ctx.react("✍");

  if (!result || !result.success) {
    ctx.react("👎");
  } else {
    ctx.react("👍");
    await ctx.replyWithMediaGroup([
      {
        type: result.file.endsWith(".mp4") ? "video" : "photo",
        media: Input.fromLocalFile(result.file),
        caption: ctx.message.text,
      },
    ]);
  }

  if (result) {
    unlink(result.file).catch((err) => console.warn(err));
  }
});

export default bot;

/* HELPERS */

async function download(
  url: string,
  id: string,
  ext: ((res: Response) => string | undefined) | string | undefined
) {
  const response = await fetch(url);

  const extension = ext instanceof Function ? ext(response) : ext;

  const filename = `${id}-${Bun.randomUUIDv7()}`;
  const fp = path.join(
    TMP_DIR,
    extension ? `${filename}.${extension}` : filename
  );

  const success = await Bun.write(fp, response, {
    createPath: true,
  }).then(
    () => true,
    () => false
  );

  return { file: fp, success };
}
