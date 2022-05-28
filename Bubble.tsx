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
import { useEmptyLinks } from "./useEmptyLinks.ts";
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
  projects: projects_,
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
  /** source.projectも含めたprojectのリスト */
  const projects = useMemo(
    () => [
      source.project,
      ...projects_.filter((project) => project !== source.project),
    ],
    [projects_, source.project],
  );
  /** bubble発生源が`projects_`にあるprojectでなければ`true` */
  const isUnlistedProject = useMemo(() => !projects_.includes(source.project), [
    projects_,
    source.project,
  ]);
  const theme = useTheme(source.project);
  const pages_ = usePages(
    source.title,
    isUnlistedProject ? [source.project] : projects,
  );
  const pagesWithoutExternal = useMemo(
    () =>
      isUnlistedProject
        // external linksだけ取得する
        ? pages_.map((page) => {
          page.persistent = false;
          page.relatedPages.links1hop = [];
          return page;
        })
        : pages_,
    [isUnlistedProject, pages_],
  );
  /** 表示するページ */
  const pages = useMemo(() => {
    const titleLc = toTitleLc(source.title);
    // 先に空ページとprojects_に無いページを除いておく
    const existPages = pagesWithoutExternal.filter((page) => page.persistent);

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
  }, [
    pagesWithoutExternal,
    scrapbox.Page.title,
    source.title,
  ]);
  const cards_ = useBackCards(source.title, pagesWithoutExternal);

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
  const emptyLinks = useEmptyLinks(pages, isUnlistedProject ? [] : projects);

  return (
    <>
      {pages.length > 0 && pages[0].lines.length > 0 && (
        <div
          className="text-bubble"
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
            emptyLinks={emptyLinks}
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
