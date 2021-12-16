/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { CSS as textCSS, TextBubble } from "./TextBubble.tsx";
import { CardBubble, CSS as listCSS } from "./CardBubble.tsx";
import { CSS as cardCSS } from "./Card.tsx";
import { Fragment, h, render, useEffect } from "./deps/preact.tsx";
import { useBubbles } from "./hooks/useBubbles.ts";
import { useEventListener } from "./hooks/useEventListener.ts";
import { toLc } from "./utils.ts";
import { useProjectTheme } from "./hooks/useProjectTheme.ts";
import { sleep } from "./sleep.ts";
import { usePromiseSettledAnytimes } from "./hooks/usePromiseSettledAnytimes.ts";
import { getEditor } from "./dom.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const userscriptName = "scrap-bubble";
const App = (
  { delay = 500, expired = 60, whiteList = [] as string[] } = {},
) => {
  const { cards, cache, show, hide } = useBubbles({ expired, whiteList });
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

        const [, project, encodedTitleLc] = isPageLink(link)
          ? link.href.match(/\/([\w\-]+)\/([^#]*)/) ??
            ["", "", ""]
          : ["", scrapbox.Project.name, scrapbox.Page.title];
        // [/project]の形のリンクは何もしない
        if (project === "") return;
        const titleLc = toLc(decodeURIComponent(encodedTitleLc ?? ""));
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
          if (e === "timeout") continue;
          throw e;
        }

        // 表示位置を計算する
        const { top, right, left, bottom } = link.getBoundingClientRect();
        const root = getEditor().getBoundingClientRect();
        const adjustRight = (left - root.left) / root.width > 0.5; // 右寄せにするかどうか
        show(depth, project, titleLc, {
          top: Math.round(bottom - root.top),
          bottom: Math.round(root.bottom - top),
          ...(adjustRight
            ? { right: Math.round(root.right - right) }
            : { left: Math.round(left - root.left) }),
          maxWidth: adjustRight
            ? right - 10
            : document.documentElement.clientWidth - left - 10,
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
      <style>
        {`
          * {box-sizing: border-box;}
          ${textCSS}
          ${listCSS}
          ${cardCSS}
      `}
      </style>
      {cards.map(({
        project,
        titleLc,
        lines,
        position,
        linked,
      }, index) => (
        <Fragment key={`/${project}/${titleLc}/`}>
          <TextBubble
            project={project}
            titleLc={titleLc}
            theme={getTheme(project) ?? "default"}
            index={index + 1}
            position={position}
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
                theme: getTheme(project) ?? "default",
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
  { delay = 500, expired = 60, whiteList = [] as string[] } = {},
) {
  const app = document.createElement("div");
  app.dataset.userscriptName = userscriptName;
  getEditor().append(app);
  const shadowRoot = app.attachShadow({ mode: "open" });
  render(
    <App delay={delay} expired={expired} whiteList={whiteList} />,
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
