/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { CSS as textCSS, TextBubble } from "./TextBubble.tsx";
import { CardBubble, CSS as listCSS } from "./CardBubble.tsx";
import { CSS as cardCSS, RelatedPageCard } from "./RelatedPageCard.tsx";
import {
  Fragment,
  h,
  render,
  useCallback,
  useEffect,
  useState,
} from "./deps/preact.tsx";
import { useCards } from "./hooks/useCards.ts";
import { useEventListener } from "./hooks/useEventListener.ts";
import { toLc } from "./utils.ts";
import { useProjectTheme } from "./hooks/useProjectTheme.ts";
import { getEditor } from "./dom.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const userscriptName = "scrap-bubble";
const App = (
  { delay = 500, expired = 60, whiteList = [] as string[] } = {},
) => {
  const { cards, cache, show, hide } = useCards({ expired, whiteList });
  const [, setTimer] = useState<number | undefined>(undefined);
  const getTheme = useProjectTheme();

  const showCard = useCallback(
    (depth: number, link: HTMLDivElement | HTMLAnchorElement) => {
      if (!link.matches("a.page-link, .line-title .text")) return;

      const [_, project, encodedTitleLc] = link.classList.contains("page-link")
        ? (link as HTMLAnchorElement).href.match(/\/([\w\-]+)\/([^#]*)/) ??
          ["", "", ""]
        : ["", scrapbox.Project.name, scrapbox.Page.title];
      if (project === "") return;
      const titleLc = toLc(decodeURIComponent(encodedTitleLc ?? ""));
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
    [cache, show],
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
        position: { top, bottom, left, right },
        linked,
        loading,
      }, index) => (
        <Fragment key={`/${project}/${titleLc}/`}>
          <TextBubble
            project={project}
            titleLc={titleLc}
            theme={getTheme(project) ?? "default"}
            style={{
              top: `${top}px`,
              ...(
                left ? ({ left: `${left}px` }) : ({ right: `${right}px` })
              ),
            }}
            lines={lines}
            loading={loading}
            onPointerEnterCapture={(e) => showCard(index + 1, e.currentTarget)}
            onPointerLeaveCapture={cancel}
            onClick={() => hide(index + 1)}
            hasChildCards={cards.length > index + 1}
          />
          <CardBubble
            loading={loading}
            style={{
              bottom: `${bottom}px`,
              ...(
                left ? ({ left: `${left}px` }) : ({ right: `${right}px` })
              ),
            }}
            onClickCapture={(e) =>
              (e.target as Element).tagName !== "A" && hide(index + 1)}
            hasChildCards={cards.length > index + 1}
          >
            {linked.map((page) => (
              <RelatedPageCard
                key={`/${page.project}/${page.title}`}
                project={page.project}
                title={page.title}
                theme={getTheme(page.project) ?? "default"}
                descriptions={page.descriptions}
                thumbnail={page.image ?? ""}
                onPointerEnterCapture={(e) =>
                  showCard(index + 1, e.currentTarget)}
                onPointerLeaveCapture={cancel}
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
