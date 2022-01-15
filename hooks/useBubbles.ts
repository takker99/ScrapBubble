import { useCallback, useMemo, useState } from "../deps/preact.tsx";
import { toId, toLc } from "../utils.ts";
import type { LinkType, ScrollTo } from "../types.ts";
import { Scrapbox } from "../deps/scrapbox.ts";
import { getPage } from "../fetch.ts";
declare const scrapbox: Scrapbox;

export interface Cache {
  project: string;
  title: string;
  lines: { text: string; id: string }[];
  loading: boolean;
  linked: {
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
export function useBubbles(
  { expired = 60, whiteList: _whiteList = [] }: UseBubblesInit,
) {
  const [caches, setCaches] = useState(new Map<string, Cache>());
  // 表示するデータのcache idのリストと表示位置とのペアのリスト
  const [selectedList, setSelectedList] = useState<
    { ids: string[]; position: Position; scrollTo?: ScrollTo; type: LinkType }[]
  >([]);

  // このリストにあるproject以外は表示しない
  const whiteList = useMemo(
    () => [...new Set([scrapbox.Project.name, ..._whiteList])],
    [_whiteList],
  );

  /** whiteList中のprojectに存在する同名のページを全てcacheする */
  const cache = useCallback((project: string, title: string) => {
    // whiteListにないprojectの場合は何もしない
    if (!whiteList.includes(project)) return;

    // whiteListにあるprojectを全てcacheする

    // このリストにあるIDのリソースは更新しない
    // 別のPromiseで更新している最中
    const loadingIds = [] as ReturnType<typeof toId>[];

    // まず読込中フラグを同期処理で立てておく
    setCaches((oldCaches) => {
      for (const project of whiteList) {
        const id = toId(project, title);
        const { lines = [], linked = [], loading = false } =
          oldCaches.get(id) ??
            {};
        // 別のPromiseで更新中のリソースのID記憶しておく
        if (loading) loadingIds.push(id);
        oldCaches.set(id, {
          project,
          title,
          loading: true,
          lines,
          linked,
        });
      }
      return new Map(oldCaches);
    });

    // 各ページを非同期に読み込む
    const promises = [] as Promise<void>[];
    for (const project of whiteList) {
      const promise = (async () => {
        const data = await getPage(project, title, { expired });
        const id = toId(project, title);

        // ページを取得できなかったら更新しない
        if ("name" in data) return;
        const { lines, links, relatedPages: { links1hop } } = data;

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
          });
          return new Map(oldCaches);
        });
      })();
      promises.push(promise);
    }

    return Promise.all(promises);
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
    [whiteList],
  );

  /** depth階層以降のカードを消す */
  const hide = useCallback(
    (depth: number) => setSelectedList((list) => [...list.slice(0, depth)]),
    [],
  );

  const cards = useMemo(
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
        const { project, title, lines } = cacheList
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
          loading: cacheList.every(({ loading }) => loading),
          ...rest,
        };
        showedPageIds.push(toId(project, title));
        // linesもlinkedも空のときは消す
        return card.lines.length > 0 || card.linked.length > 0 ? [card] : [];
      });
    },
    [caches, selectedList],
  );

  return { cards, cache, show, hide };
}
