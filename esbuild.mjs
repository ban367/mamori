import * as esbuild from "esbuild";

const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: !isProduction,
  minify: isProduction,
  treeShaking: true,
};

async function main() {
  if (isWatch) {
    let isFirstBuild = true;
    const ctx = await esbuild.context({
      ...buildOptions,
      plugins: [
        {
          name: "watch-logger",
          setup(build) {
            build.onStart(() => {
              console.log("[esbuild] ビルド開始...");
            });
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                console.log("[esbuild] ビルド失敗");
              } else {
                console.log("[esbuild] ビルド完了");
              }
              if (isFirstBuild) {
                isFirstBuild = false;
                console.log("[esbuild] 監視モードで起動中...");
              }
            });
          },
        },
      ],
    });
    await ctx.watch();
  } else {
    await esbuild.build(buildOptions);
    console.log("[esbuild] ビルド完了");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
