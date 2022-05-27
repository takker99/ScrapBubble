/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { TextBubble } from "./TextBubble.tsx";
import { CardBubble } from "./CardBubble.tsx";
import { CSS } from "./app.min.css.ts";
import { Fragment, h, render, useEffect } from "./deps/preact.tsx";
import { useBubbles } from "./useBubbles.ts";
import { useEventListener } from "./useEventListener.ts";
import { toId } from "./utils.ts";
import { sleep } from "./sleep.ts";
import { usePromiseSettledAnytimes } from "./usePromiseSettledAnytimes.ts";
import { isLiteralStrings, isPageLink, isTitle } from "./is.ts";
import { ensureHTMLDivElement } from "./ensure.ts";
import { parseLink } from "./parseLink.ts";
import { editor } from "./deps/scrapbox-std.ts";
import type { LinkType } from "./types.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const userscriptName = "scrap-bubble";

export interface AppProps {
  /** hoverしてからbubbleを表示するまでのタイムラグ */ delay: number;
  /** cacheの有効期間 */ expired: number;
  /** 透過的に扱うprojectのリスト */ whiteList: string[];
  /** リンク先へスクロールする機能を有効にする対象
   *
   * `link`: []で囲まれたリンク
   * `hashtag`: ハッシュタグ
   * `lineId`: 行リンク
   */
  scrollTargets: ("title" | "link" | "hashtag" | "lineId")[];
}
const App = (
  { delay, expired, whiteList, scrollTargets }: AppProps,
) => {
  const { bubbles, cache, show, hide } = useBubbles({ expired, whiteList });
  const [waitPointerEnter, handlePointerEnter] = usePromiseSettledAnytimes<
    PointerEvent
  >();

  const editorDiv = editor();
  ensureHTMLDivElement(editorDiv, "#editor");
  useEffect(() => {
    /** trueになったらevent loopを終了する */
    let finished = false;
    (async () => {
      while (!finished) {
        const event = await waitPointerEnter();
        ensureHTMLDivElement(event.currentTarget, "event.currentTarget");
        const base = event.currentTarget;
        const depth = parseInt(base.dataset.index ?? "0");
        const link = event.target as HTMLElement;

        // 処理を<a>か.line-titleのときに限定する
        if (!isPageLink(link) && !isTitle(link)) continue;

        const {
          project = scrapbox.Project.name,
          title: encodedTitle,
          hash = "",
        } = isPageLink(link)
          ? parseLink({
            pathType: "root",
            href: `${new URL(link.href).pathname}${new URL(link.href).hash}`,
          })
          : { project: scrapbox.Project.name, title: scrapbox.Page.title };
        // [/project]の形のリンクは何もしない
        if (project === "") return;
        const title = decodeURIComponent(encodedTitle ?? "");
        cache(project, title);

        // delay以内にカーソルが離れるかクリックしたら何もしない
        try {
          const waited = sleep(delay);
          link.addEventListener("pointerleave", () => waited.cancel(), {
            once: true,
          });
          link.addEventListener("click", () => waited.cancel(), { once: true });
          await waited;
        } catch (e) {
          if (e === "cancelled") continue;
          throw e;
        }

        // スクロール先を設定する
        const scrollTo = hash !== "" && scrollTargets.includes("lineId")
          ? { type: "id", value: hash } as const
          : link.dataset.linkedTo &&
              isLiteralStrings(
                link.dataset.linkedType,
                "link",
                "hashtag",
                "title",
              ) && scrollTargets.includes(link.dataset.linkedType)
          ? { type: "link", value: link.dataset.linkedTo } as const
          : undefined;

        // 表示位置を計算する
        const { top, right, left, bottom } = link.getBoundingClientRect();
        const root = editorDiv.getBoundingClientRect();
        // linkが画面の右寄りにあったら、bubbleを左側に出す
        const adjustRight = (left - root.left) / root.width > 0.5;
        show(depth, project, title, {
          scrollTo,
          position: {
            top: Math.round(bottom - root.top),
            bottom: Math.round(root.bottom - top),
            ...(adjustRight
              ? { right: Math.round(root.right - right) }
              : { left: Math.round(left - root.left) }),
            maxWidth: adjustRight
              ? right - 10
              : document.documentElement.clientWidth - left - 10,
          },
          type: getLinkType(link),
        });
      }
    })();
    return () => finished = true;
  }, [delay, cache, show]);
  useEventListener(editorDiv, "pointerenter", handlePointerEnter, {
    capture: true,
  });
  useEventListener(document, "click", (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.userscriptName === userscriptName) return;
    hide(0);
  }, { capture: true });

  useEffect(() => {
    const callback = () => hide(0);
    scrapbox.addListener("page:changed", callback);
    return () => scrapbox.removeListener("page:changed", callback);
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.12.0/katex.min.css"
      />
      <style>{CSS}</style>
      {bubbles.map(({
        project,
        title,
        lines,
        emptyLinks,
        position,
        scrollTo,
        type,
        linked,
      }, index) => (
        <Fragment key={toId(project, title)}>
          <TextBubble
            project={project}
            title={title}
            index={index + 1}
            position={position}
            scrollTo={scrollTo}
            lines={lines}
            emptyLinks={emptyLinks}
            onPointerEnterCapture={handlePointerEnter}
            onClick={() => hide(index + 1)}
            hasChildCards={bubbles.length > index + 1}
          />
          <CardBubble
            position={position}
            cards={linked.map(
              ({ project, ...rest }) => ({
                project,
                linkedTo: title,
                linkedType: type,
                ...rest,
              }),
            )}
            index={index + 1}
            onPointerEnterCapture={handlePointerEnter}
            onClick={() => hide(index + 1)}
          />
        </Fragment>
      ))}
    </>
  );
};

export const mount = (
  {
    delay = 500,
    expired = 60,
    whiteList = [],
    scrollTargets = ["link", "hashtag", "lineId", "title"],
  }: Partial<AppProps> = {},
): void => {
  const app = document.createElement("div");
  app.dataset.userscriptName = userscriptName;
  const editorDiv = editor();
  ensureHTMLDivElement(editorDiv, "#editor");
  editorDiv.append(app);
  const shadowRoot = app.attachShadow({ mode: "open" });
  render(
    <App
      delay={delay}
      expired={expired}
      whiteList={whiteList}
      scrollTargets={scrollTargets}
    />,
    shadowRoot,
  );
};

const getLinkType = (element: HTMLSpanElement | HTMLAnchorElement): LinkType =>
  isPageLink(element)
    ? (element.type === "link" ? "link" : "hashtag")
    : "title";
