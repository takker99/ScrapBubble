/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Page } from "./Page.tsx";
import { CardList } from "./CardList.tsx";
import {
  Fragment,
  FunctionComponent,
  h,
  useCallback,
  useMemo,
} from "./deps/preact.tsx";
import { encodeTitleURI, toTitleLc } from "./deps/scrapbox-std.ts";
import { useBubbleData } from "./useBubbleData.ts";
import { useTheme } from "./useTheme.ts";
import { fromId, ID, toId } from "./id.ts";
import { Bubble as BubbleData } from "./storage.ts";
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
  const pageIds = useMemo(
    () => projects.map((project) => toId(project, source.title)),
    [projects, source.title],
  );
  const bubbles = useBubbleData(pageIds);

  // 逆リンクおよびpagesから, parentsとwhitelistにないものを除いておく
  const [linked, externalLinked, pages] = useMemo(
    () => {
      const parentsLc = parentTitles.map((title) => toTitleLc(title));

      const linked = new Set<ID>();
      const externalLinked = new Set<ID>();
      const pages: Pick<BubbleData, "project" | "lines">[] = [];

      for (const bubble of bubbles) {
        for (const id of bubble.projectLinked ?? []) {
          const { project, titleLc } = fromId(id);
          if (parentsLc.includes(titleLc) && whiteList.includes(project)) {
            continue;
          }
          externalLinked.add(id);
        }
        if (!whiteList.includes(bubble.project)) continue;
        for (const linkLc of bubble.linked ?? []) {
          if (parentsLc.includes(linkLc)) continue;
          linked.add(toId(bubble.project, linkLc));
        }
        if (parentsLc.includes(bubble.titleLc)) continue;
        if (!bubble.exists) continue;
        pages.push({ project: bubble.project, lines: bubble.lines });
      }

      return [[...linked], [...externalLinked], pages] as const;
    },
    [...bubbles, ...parentTitles, whiteList],
  );

  const handleClick = useCallback(() => props.hide(), [props.hide]);

  const theme = useTheme(pages[0]?.project ?? source.project);
  const pageStyle = useMemo(() => makeStyle(source.position, "page"), [
    source.position,
  ]);

  return (
    <>
      {pages.length > 0 && (
        <div
          className="text-bubble"
          style={pageStyle}
          data-theme={theme}
          onClick={handleClick}
        >
          <StatusBar>
            {pages[0].project !== scrapbox.Project.name && (
              <ProjectBadge
                project={pages[0].project}
                title={pages[0].lines[0].text}
              />
            )}
          </StatusBar>
          <Page
            lines={pages[0].lines}
            project={pages[0].project}
            title={pages[0].lines[0].text}
            scrollTo={source.scrollTo}
            whiteList={whiteList}
            {...props}
          />
        </div>
      )}
      <CardList
        linked={linked}
        externalLinked={externalLinked}
        onClick={handleClick}
        source={source}
        projectsForSort={projects}
        {...props}
      />
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
