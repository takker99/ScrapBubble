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
import { encodeTitle, toLc } from "./utils.ts";
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
  const { getBubbles, show, hide } = useBubbles({ expired, whiteList });
  const bubbles = getBubbles();
  const getTheme = useProjectTheme();
  const [waitPointerEnter, handlePointerEnter] = usePromiseSettledAnytimes<
    PointerEvent
  >();

  useEffect(() => {
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
        if (!isLinkOrTitle(link)) continue;

        const { project = scrapbox.Project.name, title, hash = "" } =
          isPageLink(link)
            ? parseLink({
              pathType: "root",
              href: `${new URL(link.href).pathname}${new URL(link.href).hash}`,
            })
            : { project: scrapbox.Project.name, title: scrapbox.Page.title };
        // [/project]の形のリンクは何もしない
        if (project === "") return;
        const titleLc = toLc(decodeURI(title ?? ""));

        // delay以内にカーソルが離れるかクリックしたら何もしない
        try {
          const waited = sleep(delay);
          link.addEventListener("pointerleave", () => waited.cancel(), {
            once: true,
          });
          link.addEventListener("click", () => waited.cancel(), { once: true });
          await waited;
        } catch (e) {
          if (e === "timeout") continue;
          throw e;
        }

        // スクロール先を設定する
        const scrollTo = hash !== "" && scrollTargets.includes("lineId")
          ? { type: "id", value: hash } as const
          : link.dataset.linkedTo
          ? link.dataset.linkedTo &&
              (["link", "hashtag", "title"] as const).some((type) =>
                link.dataset.linkedType === type && scrollTargets.includes(type)
              )
            ? { type: "link", value: link.dataset.linkedTo } as const
            : undefined
          : undefined;

        // 表示位置を計算する
        const { top, right, left, bottom } = link.getBoundingClientRect();
        const root = getEditor().getBoundingClientRect();
        const adjustRight = (left - root.left) / root.width > 0.5; // 右寄せにするかどうか
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
  }, [delay, show]);
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
      {bubbles.map((bubble, index) => {
        if (bubble.loading) return <></>;
        const {
          pages: [{
            project,
            title,
            lines,
          }],
          cards,
          position,
          scrollTo,
          type,
        } = bubble;
        return (
          <Fragment key={`/${project}/${title}/`}>
            <TextBubble
              project={project}
              titleLc={encodeTitle(title)}
              theme={getTheme(project) ?? "default"}
              position={position}
              lines={lines}
              onPointerEnterCapture={handlePointerEnter}
              onClick={() => hide(index + 1)}
              hasChildCards={cards.length > index + 1}
              index={index + 1}
              scrollTo={scrollTo}
            />
            <CardBubble
              position={position}
              cards={cards.map(
                ({ project, ...rest }) => ({
                  project,
                  linkedTo: title,
                  linkedType: type,
                  theme: getTheme(project) ?? "default",
                  ...rest,
                }),
              )}
              onPointerEnterCapture={handlePointerEnter}
              index={index + 1}
              onClick={() => hide(index + 1)}
            />
          </Fragment>
        );
      })}
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

function isLinkOrTitle(
  element: HTMLElement,
): element is HTMLDivElement | HTMLAnchorElement {
  return element.matches("a.page-link, .line-title .text");
}
function isPageLink(
  element: HTMLElement,
): element is HTMLAnchorElement {
  return element.classList.contains("page-link");
}
function getLinkType(element: HTMLDivElement | HTMLAnchorElement): LinkType {
  return isPageLink(element)
    ? (element.type === "link" ? "link" : "hashtag")
    : "title";
}
