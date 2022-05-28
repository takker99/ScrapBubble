/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Page } from "./Page.tsx";
import { Card } from "./Card.tsx";
import { Fragment, FunctionComponent, h, useMemo } from "./deps/preact.tsx";
import { encodeTitleURI, toTitleLc } from "./deps/scrapbox-std.ts";
import { useTheme } from "./useTheme.ts";
import { usePages } from "./usePages.ts";
import { useBackCards } from "./useBackCards.ts";
import { getPage } from "./page.ts";
import { toId } from "./utils.ts";
import type { BubbleSource, Position } from "./useBubbles.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const makeStyle = (position: Position, type: "page" | "card") => ({
  ...(type === "page"
    ? { top: `${position.top}px` }
    : { bottom: `${position.bottom}px` }),
  maxWidth: `${position.maxWidth}px`,
  ...("left" in position
    ? {
      left: `${position.left}px`,
    }
    : {
      right: `${position.right}px`,
    }),
});

export type BubbleProps = {
  projects: string[];
  sources: BubbleSource[];
  index: number;
  onPointerEnterCapture: h.JSX.PointerEventHandler<HTMLDivElement>;
  onClick: h.JSX.MouseEventHandler<HTMLDivElement>;
};
export const Bubble = ({
  projects,
  sources,
  index,
  onPointerEnterCapture,
  onClick,
}: BubbleProps) => {
  const source = useMemo(() => sources[index - 1], [sources, index]);

  /** 親階層で表示しているページ
   *
   * これらは子階層で表示しないようにする
   */
  const parentSources = useMemo(
    () =>
      sources.slice(0, index - 1).map((source) => ({
        titleLc: toTitleLc(source.title),
        ...source,
      })),
    [
      sources,
      index,
    ],
  );
  const hasChildCards = useMemo(() => sources.length > index, [sources, index]);
  const theme = useTheme(source.project);
  const pages_ = usePages(source.title, projects);
  /** 表示するページ */
  const pages = useMemo(() => {
    const titleLc = toTitleLc(source.title);
    // 先に空ページを除いておく
    const existPages = pages_.filter((page) => page.persistent);

    if (scrapbox.Page.title) {
      // 現在閲覧しているページと同じページしかないときは何も表示しない
      if (
        titleLc === toTitleLc(scrapbox.Page.title) &&
        existPages.length === 1 &&
        existPages[0].project === scrapbox.Project.name
      ) {
        return [];
      }
    }
    // すでに表示しているページか空リンクの場合は表示しない
    return parentSources.some((source) => source.titleLc === titleLc)
      ? []
      : existPages;
  }, [pages_, scrapbox.Page.title, source.title]);
  const cards_ = useBackCards(source.title, pages_);
  /** 表示するカード */
  const cards = useMemo(
    () =>
      cards_.filter((card) =>
        !parentSources.some((source) =>
          card.titleLc === source.titleLc &&
          card.projectName === source.project
        )
      ),
    [cards_],
  );
  const position = source.position;
  /** 空リンクのリスト */
  const emptyLinksList = useMemo(
    () =>
      pages.map((page) =>
        page.links.filter((link) => {
          const pages = projects.map((project) => getPage(link, project));
          return pages.every((page) => {
            // 全てのページを取得し終わるまで、空リンク判定を保留する
            if (!page) return false;
            if (!page.ok) return true;

            const {
              persistent,
              relatedPages: { links1hop, projectLinks1hop },
            } = page.value;

            return !persistent &&
              links1hop.length + projectLinks1hop.length < 2;
          });
        })
      ),
    [pages, projects],
  );

  return (
    <>
      {pages.length > 0 && pages[0].lines.length > 0 && (
        <div
          className={`text-bubble${hasChildCards ? " no-scroll" : ""}`}
          data-index={index}
          data-theme={theme}
          onPointerEnterCapture={onPointerEnterCapture}
          onClick={onClick}
          style={makeStyle(position, "page")}
        >
          <StatusBar>
            {pages[0].project !== scrapbox.Project.name && (
              <ProjectBadge project={pages[0].project} title={pages[0].title} />
            )}
          </StatusBar>
          <Page
            lines={pages[0].lines}
            project={pages[0].project}
            title={pages[0].title}
            emptyLinks={emptyLinksList[0]}
            scrollTo={source.scrollTo}
          />
        </div>
      )}
      <div
        className="card-bubble"
        data-index={index}
        data-theme={theme}
        onPointerEnterCapture={onPointerEnterCapture}
        onClick={onClick}
        style={makeStyle(position, "card")}
      >
        <ul>
          {cards.map((
            { projectName, title, descriptions, image },
          ) => (
            <li>
              <Card
                key={toId(projectName, title)}
                project={projectName}
                title={title}
                linkedTo={source.title}
                linkedType={source.type}
                descriptions={descriptions}
                thumbnail={image ?? ""}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

const StatusBar: FunctionComponent = ({ children }) => (
  <div className="status-bar top-right">{children}</div>
);

type ProjectBadgeProps = {
  project: string;
  title: string;
};
const ProjectBadge = ({ project, title }: ProjectBadgeProps): h.JSX.Element => (
  <a
    href={`/${project}/${encodeTitleURI(title)}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    {project}
  </a>
);
