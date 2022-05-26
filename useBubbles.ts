import { useCallback, useMemo, useState } from "./deps/preact.tsx";
import { toId, toLc } from "./utils.ts";
import type { LinkType, ScrollTo } from "./types.ts";
import { Scrapbox } from "./deps/scrapbox.ts";
import { getPage } from "./fetch.ts";
declare const scrapbox: Scrapbox;

export interface Cache {
  project: string;
  title: string;
  lines: { text: string; id: string }[];
  linksLc: string[];
  loading: boolean;
  linked: {
    title: string;
    descriptions: string[];
    image: string | null;
  }[];
}
export interface Bubble {
  position: Position;
  project: string;
  title: string;
  lines: { text: string; id: string }[];
  emptyLinks: string[];
  loading: boolean;
  type: LinkType;
  scrollTo?: ScrollTo;
  linked: {
    project: string;
    title: string;
    descriptions: string[];
    image: string | null;
  }[];
}
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

export interface UseBubblesInit {
  /** cacheの有効期限 (UNIX時刻) */ expired?: number;
  /** 透過的に扱いたいproject名のリスト */ whiteList?: string[];
}
export interface ShowInit {
  position: Position;
  scrollTo?: ScrollTo;
  type: LinkType;
}
export interface UseBubbleResult {
  /** 表示するbubblesのデータ */
  bubbles: Bubble[];

  /** 指定したページのデータをcacheする
   *
   * @param project cacheしたいページのproject
   * @param title cahceしたいページのtitle
   */
  cache: (project: string, title: string) => Promise<void>;

  /** 指定した階層にbubbleを表示する
   *
   * @param depth 表示したい階層
   * @param project bubbleの発生源のproject
   * @param title bubbleの発生源のtitle
   * @param init bubbleの表示位置などのデータ
   */
  show: (depth: number, project: string, title: string, init: ShowInit) => void;

  /** 指定した階層以降のbubblesを消す
   *
   * @param depth ここで指定した階層以降のbubblesを消す
   */
  hide: (depth: number) => void;
}
export const useBubbles = (
  { expired = 60, whiteList: _whiteList = [] }: UseBubblesInit,
): UseBubbleResult => {
  const [caches, setCaches] = useState(new Map<string, Cache>());
  // 表示するデータのcache idのリストと表示位置とのペアのリスト
  const [selectedList, setSelectedList] = useState<
    { ids: string[]; position: Position; scrollTo?: ScrollTo; type: LinkType }[]
  >([]);
  const [emptyLinks, setEmptyLinks] = useState(new Set<string>());

  // このリストにあるproject以外は表示しない
  const whiteList = useMemo(
    () => [...new Set([scrapbox.Project.name, ..._whiteList])],
    [_whiteList],
  );

  /** whiteList中のprojectに存在する同名のページを全てcacheする */
  const cache = useCallback(async (project: string, title: string) => {
    // whiteListにないprojectの場合は何もしない
    if (!whiteList.includes(project)) return;

    // whiteListにあるprojectを全てcacheする

    // このリストにあるIDのリソースは更新しない
    // 別のPromiseで更新している最中
    const loadingIds = new Set<ReturnType<typeof toId>>();

    // まず読込中フラグを同期処理で立てておく
    setCaches((oldCaches) => {
      for (const project of whiteList) {
        const id = toId(project, title);
        const { lines = [], linked = [], linksLc = [], loading = false } =
          oldCaches.get(id) ??
            {};
        // 別のPromiseで更しているページのID記憶しておく
        if (loading) loadingIds.add(id);
        oldCaches.set(id, {
          project,
          title,
          loading: true,
          lines,
          linksLc,
          linked,
        });
      }
      return new Map(oldCaches);
    });

    // 各ページを非同期に読み込む
    const promises = [] as Promise<readonly [boolean, number]>[];
    for (const project of whiteList) {
      const promise = (async () => {
        const id = toId(project, title);
        // 別のPromiseで読込中のページは飛ばす
        if (loadingIds.has(id)) return [true, 0] as const;
        const data = await getPage(project, title, { expired });

        // ページを取得できなかったら更新しない
        if ("name" in data) return [true, 0] as const;
        const { lines, persistent, links, relatedPages: { links1hop } } = data;

        // 逆リンクを取得する
        const linksLc = links.map((link) => toLc(link));
        const linked = links1hop.flatMap(({
          title,
          descriptions,
          image,
        }) =>
          !linksLc.includes(toLc(title)) ? [{ title, descriptions, image }] : []
        );

        // データを更新する
        setCaches((oldCaches) => {
          oldCaches.set(id, {
            project,
            title,
            loading: false,
            lines: lines.slice(1), // タイトルを除く
            linked,
            linksLc,
          });
          return new Map(oldCaches);
        });

        // 空リンクかどうかを返す
        return [!persistent, linked.length] as const;
      })();

      promises.push(promise);
    }

    // 空リンクかどうかを登録する
    const data = await Promise.all(promises);
    setEmptyLinks((list) => {
      if (data.some(([flag]) => !flag)) {
        // 一つでも中身のあるページが有るなら空リンクでない
        list.delete(toLc(title));
      } else if (data.reduce((sum, [, links]) => sum + links, 0) > 1) {
        // 逆リンクが2つ以上あるなら空リンクでない
        // ここではprojectを横断して計算している
        list.delete(toLc(title));
      } else {
        list.add(toLc(title));
      }
      return new Set(list);
    });
  }, [whiteList, expired]);

  /** depth階層目にカードを表示する */
  const show = useCallback(
    (
      depth: number,
      project: string,
      title: string,
      options: {
        position: Position;
        scrollTo?: ScrollTo;
        type: "hashtag" | "link" | "title";
      },
    ) => {
      // whiteListにないprojectの場合は何もしない
      if (!whiteList.includes(project)) return;
      // 空リンクの場合も何もしない
      if (emptyLinks.has(toLc(title))) return;

      setSelectedList((list) => {
        // 指定されたprojectのtext bubbleが最優先で表示されるようにする
        const ids = [
          toId(project, title),
          ...whiteList.flatMap((_project) =>
            _project === project ? [] : [toId(_project, title)]
          ),
        ];
        return [...list.slice(0, depth), { ids, ...options }];
      });
    },
    [whiteList, emptyLinks],
  );

  /** depth階層以降のカードを消す */
  const hide = useCallback(
    (depth: number) => setSelectedList((list) => [...list.slice(0, depth)]),
    [],
  );

  const bubbles = useMemo(
    () => {
      // 以前の階層のtext bubbleで使ったページはcard bubbleに使わない
      const showedPageIds = [
        toId(scrapbox.Project.name, scrapbox.Page.title ?? ""),
      ];

      return selectedList.flatMap(({ ids, ...rest }) => {
        const cacheList = ids.flatMap((id) =>
          caches.has(id) ? [caches.get(id)!] : []
        );

        // text bubbleで表示するページを決める
        const { project, title, lines, linksLc } = cacheList
          .find((cache) => cache.lines.length > 0) ?? cacheList[0];
        const linked = cacheList.flatMap(
          ({ project, linked }) => linked.map((page) => ({ ...page, project })),
        );

        const card = {
          project,
          title,
          // editorで開いているページは表示しない
          lines: toId(project, title) === showedPageIds[0] ? [] : lines,
          // 既に開いているページは関連ページリストに出さない
          linked: linked.flatMap(({ project, title, ...page }) =>
            !showedPageIds.includes(toId(project, title))
              ? [{ project, title, ...page }]
              : []
          ),
          emptyLinks: linksLc.filter((link) => emptyLinks.has(toLc(link))),
          loading: cacheList.every(({ loading }) => loading),
          ...rest,
        };
        showedPageIds.push(toId(project, title));
        // linesもlinkedも空のときは消す
        return card.lines.length > 0 || card.linked.length > 0 ? [card] : [];
      });
    },
    [caches, selectedList, emptyLinks],
  );

  return { bubbles, cache, show, hide };
};
