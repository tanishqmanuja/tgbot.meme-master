import bot, { sweepTmp } from "./bot";
import env from "./env";
import { obfuscateToken } from "./utils/token";

console.log("====== Configuration ======");
console.log(" - Env:", env.NODE_ENV);
console.log(" - Bot token:", obfuscateToken(env.TELEGRAM_BOT_TOKEN));
console.log("===========================", "\n");

await sweepTmp();

// launch() long-polls forever, so it never resolves: probe connectivity with
// getMe instead. Without the backoff a flaky boot becomes a hot restart loop.
for (let attempt = 1; ; attempt++) {
  try {
    const me = await bot.telegram.getMe();
    bot.launch().catch((error) => {
      console.error("Bot stopped", error);
      process.exit(1);
    });
    console.log("⚡ Bot Started as", me.username);
    break;
  } catch (error) {
    const delay = Math.min(attempt * 5_000, 60_000);
    console.error(
      `Telegram unreachable (attempt ${attempt}), retrying in ${delay}ms`,
      error
    );
    await Bun.sleep(delay);
  }
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));