/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { h, render } from "./deps/preact.tsx";
import { ensureHTMLDivElement } from "./ensure.ts";
import { getWatchList } from "./watchList.ts";
import { editor } from "./deps/scrapbox-std.ts";
import { App, AppProps, userscriptName } from "./App.tsx";
export { setDebugMode } from "./debug.ts";
export type { AppProps };

export const mount = (init?: Partial<AppProps>): void => {
  const {
    delay = 500,
    whiteList = [],
    watchList = getWatchList().slice(0, 100),
    scrollTargets = ["link", "hashtag", "lineId", "title"],
    style = "",
  } = init ?? {};

  const app = document.createElement("div");
  app.dataset.userscriptName = userscriptName;
  const editorDiv = editor();
  ensureHTMLDivElement(editorDiv, "#editor");
  editorDiv.append(app);
  const shadowRoot = app.attachShadow({ mode: "open" });
  render(
    <App
      delay={delay}
      whiteList={whiteList}
      watchList={watchList}
      scrollTargets={scrollTargets}
      style={style}
    />,
    shadowRoot,
  );
};
