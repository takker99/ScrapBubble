/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Page } from "./Page.tsx";
import { Fragment, FunctionComponent, h, useMemo } from "./deps/preact.tsx";
import { encodeTitleURI } from "./deps/scrapbox-std.ts";
import { useTheme } from "./useTheme.ts";
import { usePages } from "./usePages.ts";
import { getPage } from "./page.ts";
import type { BubbleSource } from "./useBubbles.ts";
import type { ProjectId, Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export type TextBubbleProps = {
  projects: string[];
  watchList: ProjectId[];
  source: BubbleSource;
  hasChildCards: boolean;
  index: number;
  onPointerEnterCapture: h.JSX.PointerEventHandler<HTMLDivElement>;
  onClick: h.JSX.MouseEventHandler<HTMLDivElement>;
};
export const TextBubble = ({
  projects,
  watchList,
  source,
  hasChildCards,
  index,
  onPointerEnterCapture,
  onClick,
}: TextBubbleProps) => {
  const theme = useTheme(source.project);
  const pages = usePages(source.title, projects, watchList);
  const position = source.position;
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

            return !persistent && links1hop.length === 0 &&
              projectLinks1hop.length === 0;
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
          style={{
            top: `${position.top}px`,
            maxWidth: `${position.maxWidth}px`,
            ...("left" in position
              ? {
                left: `${position.left}px`,
              }
              : {
                right: `${position.right}px`,
              }),
          }}
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
