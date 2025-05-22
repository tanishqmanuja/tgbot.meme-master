import bot from "./bot";
import env from "./env";
import { obfuscateToken } from "./utils/token";

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const IS_PRODUCTION = env.NODE_ENV === "production";

console.log("====== Configuration ======");
console.log(" - Env:", IS_PRODUCTION ? "PROD" : "DEV");
console.log(
  " - Bot token:",
  IS_PRODUCTION ? obfuscateToken(BOT_TOKEN) : BOT_TOKEN
);
console.log("===========================", "\n");

await bot.launch();
console.log("⚡ Bot Started");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
