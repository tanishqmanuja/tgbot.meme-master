import snapsave from "@/lib/snapsave";
import { expect, test } from "bun:test";

const MEME_URL =
  "https://www.instagram.com/reel/DXduu9KAZUT/?igsh=bDBnOXlyd3g3YTZ4";

test("snapsave", async () => {
  const data = await snapsave(MEME_URL);
  expect(data.results).toBeArrayOfSize(4);
});
