module.exports = {
  name: "telegram-meme-bot",
  script: "./dist/index.js",
  interpreter: "bun",
  env: {
    NODE_ENV: "production",
  },
  autorestart: true,
  max_restarts: 20,
  restart_delay: 5000,
  exp_backoff_restart_delay: 10000,
};