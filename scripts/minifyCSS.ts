import { build, initialize } from "../deps/esbuild.ts";

// prepare esbuild
await initialize({
  wasmURL: "https://cdn.jsdelivr.net/npm/esbuild-wasm@0.21.5/esbuild.wasm",
  worker: false,
});

// bundle & minify app.css
const name = "file-loader";
const { outputFiles: [css] } = await build({
  entryPoints: [new URL("../app.css", import.meta.url).href],
  bundle: true,
  minify: true,
  write: false,
  plugins: [{
    name,
    setup: ({ onLoad, onResolve }) => {
      onResolve({ filter: /.*/ }, ({ path, importer }) => {
        return {
          path: importer ? new URL(path, importer).href : path,
          namespace: name,
        };
      });
      onLoad({ filter: /.*/, namespace: name }, async ({ path }) => ({
        contents: await (await fetch(new URL(path))).text(),
        loader: "css",
      }));
    },
  }],
});

// create app.min.css.ts
await Deno.writeTextFile(
  new URL("../app.min.css.ts", import.meta.url),
  `// deno-fmt-ignore-file\nexport const CSS = String.raw\`${css.text}\`;`,
);
