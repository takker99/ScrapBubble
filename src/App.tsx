/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import {
  CSS as textCSS,
  TextBubble,
} from "https://scrapbox.io/api/code/programming-notes/ScrapBubble@0.2.0%2FTextBubble/script.js";
import {
  CardBubble,
  CSS as listCSS,
} from "https://scrapbox.io/api/code/programming-notes/ScrapBubble@0.2.0%2FCardBubble/script.js";
import {
  CSS as cardCSS,
  RelatedPageCard,
} from "https://scrapbox.io/api/code/programming-notes/card-bubble-component@0.1.0/script.js";
import { Fragment, h, render, useCallback, useState } from "./deps/preact.ts";
import { useCards } from "./hooks/useCards.ts";
import { useEventListener } from "./hooks/useEventListener.ts";
import { useProjectTheme } from "./hooks/useProjectTheme.ts";
import { toLc } from "./utils.ts";
import { scrapbox } from "./deps/scrapbox.ts";
import { getEditor } from "./dom.ts";

const userscriptName = "scrap-bubble";
const App = (
  { delay = 500, expired = 60, whiteList = [] as string[] } = {},
) => {
  const { cards, cache, show, hide } = useCards({ expired, whiteList });
  const [, setTimer] = useState<number | undefined>(undefined);
  const { getTheme, loadTheme } = useProjectTheme();

  const showCard = useCallback(
    (depth: number, link: HTMLDivElement | HTMLAnchorElement) => {
      if (!link.matches("a.page-link, .line-title .text")) return;

      const [_, project, encodedTitleLc] = link.classList.contains("page-link")
        ? (link as HTMLAnchorElement).href.match(/\/([\w\-]+)\/([^#]*)/) ??
          ["", "", ""]
        : ["", scrapbox.Project.name, scrapbox.Page.title];
      if (project === "") return;
      const titleLc = toLc(decodeURIComponent(encodedTitleLc ?? ""));
      loadTheme(project);
      cache(project, titleLc);

      setTimer((before) => {
        clearTimeout(before);
        return setTimeout(() => {
          const { top, right, left, bottom } = link.getBoundingClientRect();
          const root = getEditor().getBoundingClientRect();
          const adjustRight = (left - root.left) / root.width > 0.5; // 右寄せにするかどうか
          show(depth, project, titleLc, {
            top: Math.round(bottom - root.top),
            bottom: Math.round(root.bottom - top),
            ...(adjustRight
              ? { right: Math.round(root.right - right) }
              : { left: Math.round(left - root.left) }),
          });
        }, delay);
      });
    },
    [cache, show, loadTheme],
  );
  const cancel = useCallback((e: PointerEvent) => {
    const target = e.target as HTMLDivElement | null;
    if (!target?.matches?.("a.page-link, .line-title .text")) return;

    setTimer((before) => {
      clearTimeout(before);
      return undefined;
    });
  }, []);

  const editor = getEditor();
  useEventListener(
    editor,
    "pointerenter",
    (e) => showCard(0, e.target as HTMLDivElement),
    { capture: true },
  );
  useEventListener(editor, "pointerleave", cancel, { capture: true });
  useEventListener(document, "click", (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.userscriptName === userscriptName) return;
    hide(0);
  }, { capture: true });

  scrapbox.addListener("page:changed", () => hide(0));

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
        position: { top, left, right },
        linked,
        loading,
      }, index) => (
        <Fragment key={`/${project}/${titleLc}/`}>
          <TextBubble
            project={project}
            titleLc={titleLc}
            theme={getTheme(project)}
            style={{
              top: `${top}px`,
              ...(
                left ? ({ left: `${left}px` }) : ({ right: `${right}px` })
              ),
            }}
            lines={lines}
            loading={loading}
            onPointerEnterCapture={(e: { target: HTMLAnchorElement }) =>
              showCard(index + 1, e.target)}
            onPointerLeaveCapture="${cancel}"
            onClick="${() => hide(index + 1)}"
            hasChild="${cards.length > index + 1}"
          />
          <CardBubble
            loading={loading}
            style="bottom: ${bottom}px; ${
          left ? `left: ${left}` : `right: ${right}`
        }px;"
            onClickCapture={(e: { target: HTMLElement }) =>
              e.target.tagName !== "A" && hide(index + 1)}
            hasChild={cards.length > index + 1}
          >
            {linked.map((page) => (
              <RelatedPageCard
                key={`/${page.project}/${page.title}`}
                project="${page.project}"
                title="${page.title}"
                theme="${getTheme(page.project)}"
                descriptions="${page.descriptions}"
                thumbnail="${page.image}"
                onPointerEnterCapture={(
                  e: { target: HTMLDivElement | HTMLAnchorElement },
                ) => showCard(index + 1, e.target)}
                onPointerLeaveCapture="${cancel}"
              />
            ))}
          </CardBubble>
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
