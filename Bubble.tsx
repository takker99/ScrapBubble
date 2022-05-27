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
import { PageWithProject, usePages } from "./usePages.ts";
import { getPage } from "./page.ts";
import { toId } from "./utils.ts";
import type { BubbleSource, Position } from "./useBubbles.ts";
import type {
  ProjectId,
  ProjectRelatedPage,
  Scrapbox,
} from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const makeStyle = (position: Position) => ({
  top: `${position.top}px`,
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
  watchList: ProjectId[];
  sources: BubbleSource[];
  index: number;
  onPointerEnterCapture: h.JSX.PointerEventHandler<HTMLDivElement>;
  onClick: h.JSX.MouseEventHandler<HTMLDivElement>;
};
export const Bubble = ({
  projects,
  watchList,
  sources,
  index,
  onPointerEnterCapture,
  onClick,
}: BubbleProps) => {
  const source = useMemo(() => sources[index - 1], [sources, index]);
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
  const pages_ = usePages(source.title, projects, watchList);
  /** 表示するページ */
  const pages = useMemo(() => {
    const titleLc = toTitleLc(source.title);
    if (scrapbox.Page.title) {
      // 現在閲覧しているページと同じページしかないときは何も表示しない
      if (
        titleLc === toTitleLc(scrapbox.Page.title) &&
        pages_.length === 0 && pages_[0].project === scrapbox.Project.name
      ) {
        return [];
      }
    }
    // すでに表示しているページか空リンクの場合は表示しない
    return parentSources.some((source) => source.titleLc === titleLc)
      ? []
      : pages_.filter((page) => page.persistent);
  }, [pages_, scrapbox.Page.title, source.title]);
  const cards_ = useBackCards(source.title, pages);
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
          const pages = projects.map((project) =>
            getPage(link, project, watchList, { ignoreFetch: true })
          );
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
    [pages, projects, watchList],
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
          style={makeStyle(position)}
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
        style={makeStyle(position)}
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

/** 指定したリンクの逆リンクを取得するhooks
 *
 * @param title リンクの名前
 * @param pages ページデータ
 * @return 逆リンクのリスト
 */
const useBackCards = (
  title: string,
  pages: PageWithProject[],
): ProjectRelatedPage[] => {
  const backCards = useMemo(() =>
    pages.flatMap((page) => {
      const cards = [] as ProjectRelatedPage[];
      const { projectLinks, relatedPages: { links1hop, projectLinks1hop } } =
        page;
      const projectLinksLc = projectLinks.map((link) => toTitleLc(link));

      // 1 hop linksのうち、titleにリンクしているページのみ抽出する
      cards.push(
        ...links1hop.flatMap((card) =>
          card.linksLc.includes(toTitleLc(title))
            ? [{ projectName: page.project, ...card }]
            : []
        ),
      );

      // external linksのうち、順リンクがないもののみ抽出する
      // 逆リンクがあるものも除かれてしまうが、判定方法がないので断念する
      cards.push(
        ...projectLinks1hop.filter((card) =>
          !projectLinksLc.includes(
            toTitleLc(`/${card.projectName}/${card.title}`),
          )
        ),
      );

      return cards;
    }), [pages, title]);

  return backCards;
};
