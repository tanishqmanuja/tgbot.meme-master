import z from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TMP_DIR: z.string().optional(),
});

const result = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TMP_DIR: process.env.TMP_DIR,
});

if (!result.success) {
  console.error("ENV Validation Failed");
  console.error(z.prettifyError(result.error));
  process.exit(1);
}

export const env = result.data;
export default env;
