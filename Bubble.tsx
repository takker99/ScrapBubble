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
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
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
  const parentsLc = useMemo(
    () => parentTitles.map((title) => toTitleLc(title)),
    [parentTitles],
  );

  const [[linked, externalLinked, pages], setBubbleData] = useState<
    [ID[], ID[], BubbleData[]]
  >([[], [], []]);

  useLayoutEffect(
    () => {
      /** `source.title`を内部リンク記法で参照しているリンクのリスト */
      const linked = new Set<ID>();
      /** `source.title`を外部リンク記法で参照しているリンクのリスト */
      const externalLinked = new Set<ID>();
      /** ページ本文
       *
       * bubbleをそのまま保つことで、参照の違いのみで更新の有無を判断できる
       */
      const pages: BubbleData[] = [];

      // 逆リンクおよびpagesから, parentsとwhitelistにないものを除いておく
      for (const bubble of bubbles) {
        for (const id of bubble.projectLinked ?? []) {
          const { project, titleLc } = fromId(id);
          // External Linksの内、projectがwhiteListに属するlinksも重複除去処理を施す
          if (parentsLc.includes(titleLc) && whiteList.includes(project)) {
            continue;
          }
          externalLinked.add(id);
        }
        // whiteLitにないprojectのページは、External Links以外表示しない
        if (!whiteList.includes(bubble.project)) continue;
        // 親と重複しない逆リンクのみ格納する
        for (const linkLc of bubble.linked ?? []) {
          if (parentsLc.includes(linkLc)) continue;
          linked.add(toId(bubble.project, linkLc));
        }
        // 親と重複しないページ本文のみ格納する
        if (parentsLc.includes(bubble.titleLc)) continue;
        if (!bubble.exists) continue;
        pages.push(bubble);
      }

      // 再レンダリングを抑制するために、必要なものだけ更新する
      setBubbleData((prev) => {
        let [prevLinked, prevExternalLinked, prevPages] = prev;
        let hasChange = false;
        if (
          prevLinked.length !== linked.size ||
          prevLinked.some((id) => !linked.has(id))
        ) {
          prevLinked = [...linked];
          hasChange = true;
        }
        if (
          prevExternalLinked.length !== externalLinked.size ||
          prevExternalLinked.some((id) => !externalLinked.has(id))
        ) {
          prevExternalLinked = [...externalLinked];
          hasChange = true;
        }
        if (
          prevPages.length !== pages.length ||
          prevPages.some((bubble, i) => pages[i] !== bubble)
        ) {
          prevPages = pages;
          hasChange = true;
        }
        return hasChange ? [prevLinked, prevExternalLinked, prevPages] : prev;
      });
    },
    [bubbles, whiteList, parentsLc],
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
