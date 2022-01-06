/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { useCallback, useEffect, useMemo, useState } from "../deps/preact.tsx";
import { exposeState, toLc } from "../utils.ts";
import { getPage } from "../fetch.ts";
import type { LinkType, ScrollTo } from "../types.ts";
import type { Line, Page, RelatedPage, Scrapbox } from "../deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export interface Bubble {
  position: Position;
  scrollTo?: ScrollTo;
  type: LinkType;
  pages: {
    project: string;
    title: string;
    lines: Line[];
  }[];
  cards: (RelatedPage & { project: string })[];
}

/** bubbleの表示位置 */
export type Position =
  & {
    top: number;
    bottom: number;
    maxWidth: number;
  }
  & ({
    left: number;
  } | {
    right: number;
  });
/** bubbleの表示制御設定 */
export interface BubbleOptions {
  /** bubbleの表示位置 */ position: Position;
  /** text bubbleのスクロール先 */ scrollTo?: ScrollTo;
  /** bubbleの発生源の種類 */ type: LinkType;
}

export interface UseBubblesInit {
  /** cacheの有効期限 (UNIX時刻) */ expired?: number;
  /** 透過的に扱いたいproject名のリスト */ whiteList?: string[];
}
export interface UseBubbleResult {
  /** depth階層目にbubbleを表示する
   *
   * @param depth 表示する階層
   * @param project 表示したいbubbleのprimary project name
   * @param title 表示したいbubbleのtitle
   * @param options bubbleの表示制御設定
   */
  show(
    depth: number,
    project: string,
    title: string,
    options: BubbleOptions,
  ): void;

  /** depth階層以降のbubblesを消す
   *
   * @param depth この階層以降のbubblesをすべて消す
   */
  hide(depth: number): void;

  /** 表示するbubblesの情報を取得する函数
   *
   * 取得中の場合は`loading`が`true`になる
   */
  getBubbles(): ({ loading: true } | { loading: false } & Bubble)[];
}
export function useBubbles(
  { expired = 60, whiteList: _whiteList = [] }: UseBubblesInit,
): UseBubbleResult {
  const [
    /** 表示するデータのcache id のリストと表示位置とのペアのリスト */ selectedList,
    setSelectedList,
  ] = useState<
    {
      projects: string[];
      title: string;
      options: {
        position: Position;
        scrollTo?: ScrollTo;
        type: LinkType;
      };
    }[]
  >([]);
  // 取得したbubbles data
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  // このリストにあるproject以外は表示しない
  const whiteList = useMemo(
    () => [...new Set([scrapbox.Project.name, ..._whiteList])],
    [_whiteList],
  );

  const show = useCallback(
    (depth: number, project: string, title: string, options: {
      position: Position;
      scrollTo?: ScrollTo;
      type: LinkType;
    }) => {
      // whiteListにないprojectの場合は何もしない
      if (!whiteList.includes(project)) return;

      setSelectedList((
        list,
      ) => [...list.slice(0, depth), {
        // 指定されたprojectを最優先する
        projects: [project, ...whiteList.filter((proj) => proj !== project)],
        title,
        options,
      }]);
    },
    [whiteList],
  );

  /** depth階層以降のカードを消す */
  const hide = useCallback(
    (depth: number) => setSelectedList((list) => list.slice(0, depth)),
    [],
  );

  // bubblesを作る
  useEffect(() => {
    // 以前の階層のtext bubbleで使ったページはcard bubbleに使わない
    // 現在表示しているページも同様
    const showedPages = [toLc(scrapbox.Page.title ?? "")];
    type T = {
      page?: { project: string; title: string; lines: Line[] };
      cards: (RelatedPage & { project: string })[];
      options: BubbleOptions;
    };

    for (const { projects, title, options } of selectedList) {
      const titleLc = toLc(title);
      for (const project of projects) {
        const task = exposeState<T>((async () => {
          const page = await getPage(project, title, { expired });

          // エラーが出たら無視
          if ("message" in page) {
            return {
              cards: [],
              options,
            } as T;
          }

          return {
            page: page.persistent && !showedPages.includes(toLc(page.title))
              ? {
                project,
                titile: page.title,
                lines: page.lines,
              }
              : undefined,
            cards: getBackLinks(page).flatMap(({ title, ...rest }) =>
              showedPages.includes(toLc(title)) ? [] : [{
                title,
                project,
                ...rest,
              }]
            ),
            options,
          } as T;
        })());
      }
      showedPages.push(titleLc);
    }
  }, [selectedList, expired]);

  /** 表示するbubblesの情報を取得する函数
   *
   * 取得中の場合は`loading`が`true`になる
   */
  const getBubbles = useMemo(
    () => {
      // 以前の階層のtext bubbleで使ったページはcard bubbleに使わない
      // 現在表示しているページも同様
      const showedPages = [toLc(scrapbox.Page.title ?? "")];

      // ページデータを取得してbubblesを作る
      const tasks = selectedList.map(({ projects, title, options }) =>
        exposeState((async () => {
          const pages = await Promise.all(projects.map((
            project,
          ) => getPage(project, title, { expired })));

          // text bubbleで表示するページを決める
          const titleLc = toLc(title);
          const previewdPages = showedPages.includes(titleLc)
            ? []
            : pages.flatMap(({ persistent, title, lines }, i) =>
              persistent
                ? [{
                  project: projects[i],
                  title,
                  lines,
                }]
                : []
            );
          showedPages.push(titleLc);

          return {
            pages: previewdPages,
            cards: pages.flatMap((page, i) =>
              getBackLinks(page).flatMap(({ title, ...rest }) =>
                showedPages.includes(toLc(title)) ? [] : [{
                  title,
                  project: projects[i],
                  ...rest,
                }]
              )
            ),
            ...options,
          };
        })())
      );

      return () =>
        tasks.map((task) => {
          const promiseState = task();
          switch (promiseState.state) {
            case "pending":
              return { loading: true } as const;
            case "fulfilled":
              return { loading: false, ...promiseState.result } as const;
            case "rejected":
              throw promiseState.result;
          }
        });
    },
    [selectedList, expired],
  );

  return { getBubbles, show, hide };
}

/** 逆リンクを取得する */
function getBackLinks({ links, relatedPages: { links1hop } }: Page) {
  const linksLc = links.map((link) => toLc(link));
  return links1hop.flatMap((card) =>
    linksLc.includes(toLc(card.title)) ? [] : [card]
  );
}
