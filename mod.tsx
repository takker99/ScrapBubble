/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { h, render } from "./deps/preact.tsx";
import { ensureHTMLDivElement } from "./ensure.ts";
import { getWatchList } from "./watchList.ts";
import { editor } from "./deps/scrapbox-std-browser.ts";
import { App, AppProps, userscriptName } from "./App.tsx";
import { setDebugMode } from "./debug.ts";
import type { ProjectId, Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export type { AppProps };
export interface MountInit
  extends Partial<Omit<AppProps, "whiteList" | "watchList">> {
  /** debug用有効化フラグ */
  debug?: boolean | Iterable<string>;

  /** 透過的に扱うprojectのリスト */
  whiteList?: Iterable<string>;

  /** watch list */
  watchList?: Iterable<ProjectId>;
}

export const mount = (init?: MountInit): void => {
  const {
    delay = 500,
    whiteList = [],
    watchList = getWatchList().slice(0, 100),
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
      whiteList={new Set([scrapbox.Project.name, ...whiteList])}
      watchList={new Set(watchList)}
      style={style}
    />,
    shadowRoot,
  );
};
