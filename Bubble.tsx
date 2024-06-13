/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { CardList } from "./CardList.tsx";
import {
  Fragment,
  h,
  useLayoutEffect,
  useMemo,
  useState,
} from "./deps/preact.tsx";
import { toTitleLc } from "./deps/scrapbox-std.ts";
import { useBubbleData } from "./useBubbleData.ts";
import { LinkTo } from "./types.ts";
import { fromId, ID, toId } from "./id.ts";
import { Bubble as BubbleData } from "./storage.ts";
import { produce } from "./deps/immer.ts";
import type { BubbleSource } from "./useBubbles.ts";
import { createDebug } from "./debug.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
import { TextBubble } from "./TextBubble.tsx";
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

  return (
    <>
      {hasOneBubble(pages) && (
        <TextBubble
          pages={pages}
          source={source}
          whiteList={whiteList}
          onClick={props.hide}
          {...props}
        />
      )}
      <CardList
        linked={linked}
        externalLinked={externalLinked}
        onClick={props.hide}
        source={source}
        projectsForSort={projects}
        {...props}
      />
    </>
  );
};

const hasOneBubble = (
  pages: BubbleData[],
): pages is [BubbleData, ...BubbleData[]] => pages.length > 0;

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
