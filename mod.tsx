/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { h, render } from "./deps/preact.tsx";
import { ensureHTMLDivElement } from "./ensure.ts";
import { getWatchList } from "./watchList.ts";
import { editor } from "./deps/scrapbox-std.ts";
import { App, AppProps, userscriptName } from "./App.tsx";
import { setDebugMode } from "./debug.ts";
export type { AppProps };

export interface MountInit extends Partial<AppProps> {
  /** debug用有効化フラグ */
  debug?: boolean;
}

export const mount = (init?: MountInit): void => {
  const {
    delay = 500,
    whiteList = [],
    watchList = getWatchList().slice(0, 100),
    scrollTargets = ["link", "hashtag", "lineId", "title"],
    style = "",
    debug = false,
  } = init ?? {};

  setDebugMode(debug);
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
