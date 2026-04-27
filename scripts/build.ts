await Bun.build({
  entrypoints: ["src/index.ts"],
  packages: "bundle",
  format: "esm",
  outdir: "dist",
  target: "bun",
});
