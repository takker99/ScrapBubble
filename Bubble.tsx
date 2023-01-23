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
  useLayoutEffect,
  useMemo,
  useState,
} from "./deps/preact.tsx";
import { encodeTitleURI, toTitleLc } from "./deps/scrapbox-std.ts";
import { useBubbleData } from "./useBubbleData.ts";
import { useTheme } from "./useTheme.ts";
import { LinkTo } from "./types.ts";
import { fromId, ID, toId } from "./id.ts";
import { Bubble as BubbleData } from "./storage.ts";
import { original, produce } from "./deps/immer.ts";
import type { BubbleSource } from "./useBubbles.ts";
import { createDebug } from "./debug.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const logger = createDebug("ScrapBubble:Bubble.tsx");

export interface BubbleProps extends BubbleSource {
  whiteList: Set<string>;
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
      whiteList.has(source.project)
        // source.projectを一番先頭にする
        ? new Set([source.project, ...whiteList])
        : new Set([source.project]),
    [whiteList, source.project],
  );

  const [linked, externalLinked, pages] = useBubbleFilter(
    source,
    projects,
    whiteList,
    parentTitles,
  );

  const handleClick = useCallback(() => props.hide(), [props.hide]);
  const theme = useTheme(pages[0]?.project ?? source.project);
  const pageStyle = useMemo(() => ({
    top: `${source.position.top}px`,
    maxWidth: `${source.position.maxWidth}px`,
    ...("left" in source.position
      ? {
        left: `${source.position.left}px`,
      }
      : {
        right: `${source.position.right}px`,
      }),
  }), [
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
            hash={source.hash}
            linkTo={source.linkTo}
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

/** 指定したsourceからbubblesするページ本文とページカードを、親bubblesやwhiteListを使って絞り込む
 *
 * <Bubble />でやっている処理の一部を切り出して見通しをよくしただけ
 */
const useBubbleFilter = (
  source: { project: string; title: string },
  projects: Set<string>,
  whiteList: Set<string>,
  parentTitles: string[],
) => {
  type LinkMap = Map<ID, LinkTo>;

  const [[linked, externalLinked, pages], setBubbleData] = useState<
    [LinkMap, LinkMap, BubbleData[]]
  >([new Map(), new Map(), []]);

  const pageIds = useMemo(
    () => {
      const pageIds = [...projects].map((project) =>
        toId(project, source.title)
      );

      logger.debug("projects", pageIds);
      return pageIds;
    },
    [projects, source.title],
  );

  const bubbles = useBubbleData(pageIds);
  const parentsLc = useMemo(
    () => parentTitles.map((title) => toTitleLc(title)),
    [parentTitles],
  );

  useLayoutEffect(
    () => {
      /** `source.title`を内部リンク記法で参照しているリンクのリスト */
      const linked = new Map<ID, LinkTo>();
      /** `source.title`を外部リンク記法で参照しているリンクのリスト */
      const externalLinked = new Map<ID, LinkTo>();
      /** ページ本文
       *
       * bubbleをそのまま保つことで、参照の違いのみで更新の有無を判断できる
       */
      const pages: BubbleData[] = [];

      // 逆リンクおよびpagesから, parentsとwhitelistにないものを除いておく
      for (const bubble of bubbles) {
        const eLinkTo = { project: bubble.project, titleLc: bubble.titleLc };
        for (const id of bubble.projectLinked ?? []) {
          const { project, titleLc } = fromId(id);
          // External Linksの内、projectがwhiteListに属するlinksも重複除去処理を施す
          if (parentsLc.includes(titleLc) && whiteList.has(project)) {
            continue;
          }
          if (externalLinked.has(id)) continue;
          externalLinked.set(id, eLinkTo);
        }
        // whiteLitにないprojectのページは、External Links以外表示しない
        if (!whiteList.has(bubble.project)) continue;
        const linkTo = { titleLc: bubble.titleLc };
        // 親と重複しない逆リンクのみ格納する
        for (const linkLc of bubble.linked ?? []) {
          if (parentsLc.includes(linkLc)) continue;
          const id = toId(bubble.project, linkLc);
          if (linked.has(id)) continue;
          linked.set(id, linkTo);
        }
        // 親と重複しないページ本文のみ格納する
        if (parentsLc.includes(bubble.titleLc)) continue;
        if (!bubble.exists) continue;
        pages.push(bubble);
      }

      // 再レンダリングを抑制するために、必要なものだけ更新する
      setBubbleData(produce((draft) => {
        logger.debug(
          `depth: ${parentsLc.length}, bubbled from ${
            toId(source.project, source.title)
          }, bubbles,`,
          bubbles,
          "before",
          draft[0],
          `internal cards,`,
          linked,
          "external cards",
          externalLinked,
        );
        for (const key of draft[0].keys()) {
          if (!linked.has(key)) draft[0].delete(key);
        }
        for (const [key, value] of linked) {
          draft[0].set(key, value);
        }

        for (const key of draft[1].keys()) {
          if (!externalLinked.has(key)) draft[1].delete(key);
        }
        for (const [key, value] of externalLinked) {
          draft[1].set(key, value);
        }
        draft[2] = pages;
      }));
    },
    [bubbles, whiteList, parentsLc],
  );

  return [linked, externalLinked, pages] as const;
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
