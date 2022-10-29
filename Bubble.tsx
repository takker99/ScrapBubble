/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Page } from "./Page.tsx";
import { Card } from "./Card.tsx";
import {
  Fragment,
  FunctionComponent,
  h,
  useCallback,
  useMemo,
} from "./deps/preact.tsx";
import { encodeTitleURI } from "./deps/scrapbox-std.ts";
import { useTheme } from "./useTheme.ts";
import { useBubbleData } from "./useBubbleData.ts";
import { toId } from "./id.ts";
import type { BubbleSource } from "./useBubbles.ts";
import type { Position } from "./position.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export interface BubbleProps extends BubbleSource {
  whiteList: string[];
  delay: number;
  prefetch: (project: string, title: string) => void;
}

export const Bubble = ({
  source,
  parentTitles,
  whiteList,
  ...props
}: BubbleProps) => {
  /** 検索対象のproject list */
  const projects = useMemo(
    () =>
      whiteList.includes(source.project)
        ? [
          source.project,
          ...whiteList.filter((project) => project !== source.project),
        ]
        // whitelist にないprojectの場合
        : [source.project],
    [whiteList, source.project],
  );

  const theme = useTheme(source.project);
  const { pages: _pages, cards: _cards } = useBubbleData(
    source.title,
    projects,
  );

  // cardsからparentsを除いておく
  // ついでに並び替える
  const cards = useMemo(
    () =>
      _cards.filter((card) => !parentTitles.includes(card.title))
        .sort((a, b) => {
          // 1. projectの順
          const ia = projects.indexOf(a.project);
          const ib = projects.indexOf(b.project);
          if (ia === ib) {
            // 2. last updated
            return b.updated - a.updated;
          }
          if (ia < 0) return 1;
          return ia - ib;
        }),
    [_cards, parentTitles, projects],
  );
  // pagesからparentsとwhitelistにないページを除いておく
  const pages = useMemo(
    () =>
      _pages.filter((page) =>
        !parentTitles.includes(page.title) && whiteList.includes(page.project)
      ),
    [_cards, parentTitles, whiteList],
  );

  const handleClick = useCallback(() => props.hide(), [props.hide]);

  const pageStyle = useMemo(() => makeStyle(source.position, "page"), [
    source.position,
  ]);
  const cardStyle = useMemo(() => makeStyle(source.position, "card"), [
    source.position,
  ]);

  return (
    <>
      {pages.length > 0 && pages[0].lines.length > 0 && (
        <div
          className="text-bubble"
          data-theme={theme}
          style={pageStyle}
          onClick={handleClick}
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
            scrollTo={source.scrollTo}
            whiteList={whiteList}
            {...props}
          />
        </div>
      )}
      <div
        className="card-bubble"
        data-theme={theme}
        style={cardStyle}
        onClick={handleClick}
      >
        <ul>
          {cards.map((
            { project, title, descriptions, image },
          ) => (
            <li>
              <Card
                key={toId(project, title)}
                project={project}
                title={title}
                linkedTo={source.title}
                linkedType={source.type}
                descriptions={descriptions}
                thumbnail={image ?? ""}
                {...props}
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
