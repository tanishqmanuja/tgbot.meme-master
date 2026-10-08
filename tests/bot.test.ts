import { expect, test } from "bun:test";

import { kindOf, resolveExtension } from "@/utils/mime";
import { extractLink, getPlatform, getStatusId } from "@/utils/url";

test("picks the link out of a caption", () => {
  expect(extractLink("lmaoo https://instagram.com/p/ABC123/?x=1 😭")).toBe(
    "https://instagram.com/p/ABC123/?x=1"
  );
  expect(extractLink("no link here")).toBeUndefined();
});

test("matches platforms regardless of www or brand", () => {
  expect(getPlatform("https://www.instagram.com/reel/ABC/")).toBe("instagram");
  expect(getPlatform("https://instagram.com/p/ABC/")).toBe("instagram");
  expect(getPlatform("https://x.com/u/status/1")).toBe("x");
  expect(getPlatform("https://twitter.com/u/status/1?s=20")).toBe("x");
  expect(getPlatform("https://youtube.com/watch?v=1")).toBe(null);
  expect(getStatusId("https://twitter.com/u/status/123?s=20")).toBe("123");
});

const res = (headers: Record<string, string>, url = "https://cdn.app/f") =>
  new Response(null, { headers }) as Response & { url: string };

test("resolves an extension from any of the three sources", () => {
  expect(
    resolveExtension(res({ "content-disposition": 'attachment; filename="a b.mp4"' }), "")
  ).toBe("mp4");
  expect(resolveExtension(res({ "content-type": "image/webp" }), "")).toBe("webp");
  const r = res({}, "https://video.twimg.com/x.mp4");
  Object.defineProperty(r, "url", { value: "https://video.twimg.com/x.mp4" });
  expect(resolveExtension(r, r.url)).toBe("mp4");
  expect(resolveExtension(res({}, ""), "")).toBeUndefined();
});

test("picks the Telegram send method", () => {
  expect(kindOf("mp4")).toBe("video");
  expect(kindOf("jpg")).toBe("photo");
  expect(kindOf("webm")).toBe("document");
  expect(kindOf(undefined)).toBe("document");
});