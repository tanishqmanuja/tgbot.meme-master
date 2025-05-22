module.exports = {
  name: "telegram-meme-bot",
  script: "./dist/index.ts",
  interpreter: "bun",
  env: {
    NODE_ENV: "production",
    TELEGRAM_BOT_TOKEN: "",
  },
  watch: true,
  autorestart: true,
  max_restarts: 20,
  restart_delay: 5000,
  exp_backoff_restart_delay: 10000,
};
