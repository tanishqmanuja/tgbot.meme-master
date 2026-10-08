import { expect, test } from "bun:test";

import snapsave from "@/lib/snapsave";

const MEME_URL =
  "https://www.instagram.com/reel/DXduu9KAZUT/?igsh=bDBnOXlyd3g3YTZ4";

// Live upstream, so assert the shape only. SnapSave returns a single best
// rendition per reel now; carousels return one entry per item.
test("snapsave resolves download urls", async () => {
  const data = await snapsave(MEME_URL);
  expect(data.results.length).toBeGreaterThan(0);
  for (const result of data.results) {
    expect(result.url).toStartWith("https://");
  }
});