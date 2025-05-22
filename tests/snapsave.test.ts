import snapsave from "@/lib/snapsave";
import { expect, test } from "bun:test";

const MEME_URL = "https://www.instagram.com/p/DDmb7AooI0v/?img_index=1";

test("snapsave", async () => {
  const data = await snapsave(MEME_URL);
  expect(data.results).toBeArrayOfSize(4);
});
