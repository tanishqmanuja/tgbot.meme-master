module.exports = {
  name: "telegram-meme-bot",
  script: "./dist/index.ts",
  interpreter: "bun",
  env: {
    NODE_ENV: "production",
  },
};
