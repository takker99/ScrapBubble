/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { TextBubble } from "./TextBubble.tsx";
import { CardBubble } from "./CardBubble.tsx";
import { CSS } from "./app.min.css.ts";
import { Fragment, h, render, useEffect } from "./deps/preact.tsx";
import { useBubbles } from "./hooks/useBubbles.ts";
import { useEventListener } from "./hooks/useEventListener.ts";
import { isLiteralStrings, toLc } from "./utils.ts";
import { useProjectTheme } from "./hooks/useProjectTheme.ts";
import { sleep } from "./sleep.ts";
import { usePromiseSettledAnytimes } from "./hooks/usePromiseSettledAnytimes.ts";
import { getEditor } from "./dom.ts";
import { parseLink } from "./parseLink.ts";
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
  const { cards, cache, show, hide } = useBubbles({ expired, whiteList });
  const getTheme = useProjectTheme();
  const [waitPointerEnter, handlePointerEnter] = usePromiseSettledAnytimes<
    PointerEvent
  >();

  useEffect(() => {
    /** trueになったらevent loopを終了する */
    let finished = false;
    (async () => {
      while (!finished) {
        const event = await waitPointerEnter();
        if (!(event.currentTarget instanceof HTMLDivElement)) {
          throw TypeError(`event.currentTarget must be HTMLDivElement`);
        }
        const base = event.currentTarget;
        const depth = parseInt(base.dataset.index ?? "0");
        const link = event.target as HTMLElement;

        // 処理を<a>か.line-titleのときに限定する
        if (!isPageLink(link) && !isTitle(link)) continue;

        const { project = scrapbox.Project.name, title, hash = "" } =
          isPageLink(link)
            ? parseLink({
              pathType: "root",
              href: `${new URL(link.href).pathname}${new URL(link.href).hash}`,
            })
            : { project: scrapbox.Project.name, title: scrapbox.Page.title };
        // [/project]の形のリンクは何もしない
        if (project === "") return;
        const titleLc = toLc(decodeURIComponent(title ?? ""));
        cache(project, titleLc);

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
        const root = getEditor().getBoundingClientRect();
        // linkが画面の右寄りにあったら、bubbleを左側に出す
        const adjustRight = (left - root.left) / root.width > 0.5;
        show(depth, project, titleLc, {
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
  const editor = getEditor();
  useEventListener(editor, "pointerenter", handlePointerEnter, {
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
      {cards.map(({
        project,
        titleLc,
        lines,
        position,
        scrollTo,
        type,
        linked,
      }, index) => (
        <Fragment key={`/${project}/${titleLc}/`}>
          <TextBubble
            project={project}
            titleLc={titleLc}
            theme={getTheme(project)}
            index={index + 1}
            position={position}
            scrollTo={scrollTo}
            lines={lines}
            onPointerEnterCapture={handlePointerEnter}
            onClick={() => hide(index + 1)}
            hasChildCards={cards.length > index + 1}
          />
          <CardBubble
            position={position}
            cards={linked.map(
              ({ project, ...rest }) => ({
                project,
                linkedTo: titleLc,
                linkedType: type,
                theme: getTheme(project),
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

export function mount(
  {
    delay = 500,
    expired = 60,
    whiteList = [],
    scrollTargets = ["link", "hashtag", "lineId", "title"],
  }: Partial<AppProps> = {},
) {
  const app = document.createElement("div");
  app.dataset.userscriptName = userscriptName;
  getEditor().append(app);
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
}

function isTitle(
  element: HTMLElement,
): element is HTMLSpanElement {
  return element instanceof HTMLSpanElement &&
    element.matches(".line-title .text");
}
function isPageLink(
  element: HTMLElement,
): element is HTMLAnchorElement {
  return element instanceof HTMLAnchorElement &&
    element.classList.contains("page-link");
}
function getLinkType(element: HTMLSpanElement | HTMLAnchorElement): LinkType {
  return isPageLink(element)
    ? (element.type === "link" ? "link" : "hashtag")
    : "title";
}
