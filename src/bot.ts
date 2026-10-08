import os from "os";
import path from "path";
import { mkdir, readdir, rm, unlink } from "fs/promises";

import { Input, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { Context } from "telegraf";
import type { Convenience } from "telegraf/types";

import env from "./env";
import snapsave from "./lib/snapsave";
import twitterdl from "./lib/twitterdl";
import { kindOf, resolveExtension } from "./utils/mime";
import type { MediaKind } from "./utils/mime";
import { isFulfilled, isRejected } from "./utils/promises";
import {
  extractLink,
  getPlatform,
  resolveShortLink,
} from "./utils/url";

const PKG_NAME = process.env["npm_package_name"] ?? "telegram-meme-bot";

const SYSTEM_TMP_DIR = path.join(os.tmpdir(), PKG_NAME);
const TMP_DIR = env.TMP_DIR || SYSTEM_TMP_DIR;

/** Telegram's download ceiling for bots. */
const MAX_BYTES = 50 * 1024 * 1024;
/** Telegram accepts 2-10 items in an album. */
const MAX_ALBUM = 10;

type Downloaded = { file: string; kind: MediaKind };

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => ctx.reply("Chin Tapak Dum Dum"));
bot.help((ctx) =>
  ctx.reply(
    "Send an Instagram or X/Twitter post link and I'll send the media back.\n\n" +
      "Works with instagram.com, x.com, twitter.com and t.co share links."
  )
);

bot.on(message("text"), async (ctx) => {
  const caption = ctx.message.text.slice(0, 1024);

  let link = extractLink(caption);
  if (!link) return;

  link = await resolveShortLink(link);
  const platform = getPlatform(link);
  if (!platform) return;

  console.log("Request Start:", link);
  ctx.react("👀").catch(noop);

  let sources: { url: string }[];
  try {
    sources =
      platform === "instagram"
        ? (await snapsave(link)).results
        : await twitterdl(link);
  } catch (error) {
    console.warn(`${platform} lookup failed`, error);
    await ctx.react("👎").catch(noop);
    return ctx.reply(`Couldn't read that link: ${errorMessage(error)}`).catch(
      () => undefined
    );
  }

  if (sources.length === 0) {
    await ctx.react("👎").catch(noop);
    return ctx.reply("No downloadable media found on that link.").catch(
      () => undefined
    );
  }

  const results = await Promise.allSettled(
    sources
      .slice(0, MAX_ALBUM)
      .map(({ url }, index) => download(url, `${ctx.chat.id}-${index}`))
  );

  const files = results.filter(isFulfilled).map(({ value }) => value);
  const failed = results.filter(isRejected);
  failed.forEach(({ reason }) => console.warn("Download failed", reason));

  await ctx.react("✍").catch(noop);

  let sent = false;
  if (files.length > 0) {
    try {
      sent = await send(ctx, files, caption);
    } catch (error) {
      console.warn("Upload failed", error);
    }
  }

  await Promise.all(files.map(({ file }) => unlink(file).catch(noop)));

  await ctx.react(sent && failed.length === 0 ? "👍" : "👎").catch(noop);
  console.log("Request End");
});

export default bot;
export { TMP_DIR, SYSTEM_TMP_DIR };

/** Drop leftovers from a previous run so /tmp never grows unbounded. */
export async function sweepTmp() {
  const dir = await ensureTmpDir();
  const entries = await readdir(dir).catch(() => []);
  await Promise.all(
    entries.map((entry) => rm(path.join(dir, entry), { force: true }).catch(noop))
  );
  if (entries.length) console.log(`Swept ${entries.length} stale temp file(s)`);
}

/* HELPERS */

async function send(ctx: Context, files: Downloaded[], caption: string) {
  const [first] = files;
  if (!first) return false;

  if (files.length === 1) {
    await replyOne(ctx, first, caption);
    return true;
  }

  // Telegram allows mixed photo/video albums; telegraf's MediaGroup type is a
  // union of homogeneous arrays, so it can't express one.
  await ctx.replyWithMediaGroup(
    files.map((file, index) =>
      toMediaItem(file, index === 0 ? caption : undefined)
    ) as Convenience.MediaGroup
  );

  return true;
}

function toMediaItem(
  { file, kind }: Downloaded,
  caption?: string
): Convenience.MediaGroup[number] {
  const media = Input.fromLocalFile(file);
  if (kind === "video") return { type: "video", media, caption };
  if (kind === "photo") return { type: "photo", media, caption };
  return { type: "document", media, caption };
}

async function replyOne(ctx: Context, { file, kind }: Downloaded, caption: string) {
  const input = Input.fromLocalFile(file);
  if (kind === "video") return ctx.replyWithVideo(input, { caption });
  if (kind === "photo") return ctx.replyWithPhoto(input, { caption });
  return ctx.replyWithDocument(input, { caption });
}

async function download(url: string, id: string): Promise<Downloaded> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`download failed with status ${response.status}`);
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]!
    .trim();
  if (/^(text\/|application\/(json|xml|xhtml))/.test(contentType)) {
    throw new Error(`unexpected content type: ${contentType}`);
  }

  const length = Number(response.headers.get("content-length"));
  if (length > MAX_BYTES) {
    throw new Error(`too large: ${(length / 1024 / 1024).toFixed(1)}MB`);
  }

  const extension = resolveExtension(response, url);
  const fp = path.join(
    await ensureTmpDir(),
    `${id}-${Bun.randomUUIDv7()}${extension ? `.${extension}` : ""}`
  );

  await Bun.write(fp, response);
  console.log(`Downloaded ${fp} (${contentType || "unknown"})`);

  return { file: fp, kind: kindOf(extension) };
}

async function ensureTmpDir() {
  try {
    await mkdir(TMP_DIR, { recursive: true });
    return TMP_DIR;
  } catch (error) {
    if (TMP_DIR === SYSTEM_TMP_DIR) throw error;
    console.warn(`Falling back to OS temp dir, ${TMP_DIR} unusable`, error);
    await mkdir(SYSTEM_TMP_DIR, { recursive: true });
    return SYSTEM_TMP_DIR;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function noop() {}