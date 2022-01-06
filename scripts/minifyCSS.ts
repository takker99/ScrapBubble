import { build, initialize } from "../deps/esbuild.ts";

await initialize({
  wasmURL: "https://cdn.jsdelivr.net/npm/esbuild-wasm@0.14.10/esbuild.wasm",
  worker: false,
});
const contents = await Deno.readTextFile(
  new URL("../app.css", import.meta.url),
);
const { outputFiles: [css] } = await build({
  stdin: {
    loader: "css",
    contents,
  },
  minify: true,
  write: false,
});
await Deno.writeTextFile(
  new URL("../app.min.css.ts", import.meta.url),
  `export const CSS =\`${css.text}\`;`,
);

// format code
await Deno.run({
  cmd: ["deno", "fmt"],
}).status();
