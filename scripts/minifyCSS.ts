import { build, initialize } from "../deps/esbuild.ts";

// prepare esbuild
await initialize({
  wasmURL: "https://cdn.jsdelivr.net/npm/esbuild-wasm@0.14.10/esbuild.wasm",
  worker: false,
});

// bundle & minify app.css
const name = "file-loader";
const { outputFiles: [css] } = await build({
  stdin: {
    loader: "css",
    contents: '@import "../app.css";',
  },
  bundle: true,
  minify: true,
  write: false,
  plugins: [{
    name,
    setup: ({ onLoad, onResolve }) => {
      onResolve({ filter: /.*/ }, ({ path, importer }) => {
        importer = importer === "<stdin>" ? import.meta.url : importer;
        return {
          path: new URL(path, importer).href,
          namespace: name,
        };
      });
      onLoad({ filter: /.*/, namespace: name }, async ({ path }) => ({
        contents: await Deno.readTextFile(new URL(path)),
        loader: "css",
      }));
    },
  }],
});

// create app.min.css.ts
await Deno.writeTextFile(
  new URL("../app.min.css.ts", import.meta.url),
  `export const CSS =\`${css.text}\`;`,
);

// format code
await Deno.run({
  cmd: ["deno", "fmt"],
}).status();
