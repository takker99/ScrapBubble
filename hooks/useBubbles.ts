import { useCallback, useMemo, useState } from "../deps/preact.tsx";
import { encodeTitle, toId, toLc } from "../utils.ts";
import type { LinkType, ScrollTo } from "../types.ts";
import { Page, Scrapbox } from "../deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export interface Cache {
  project: string;
  title: string;
  checked: number; // 最後にデータを取得したUNIX時刻
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

  /** 特定のprojectのpageの情報をcacheする */
  const _cache = useCallback(async (project: string, title: string) => {
    const id = toId(project, title);
    const now = new Date().getTime() / 1000; // cacheの検証開始時刻
    let _expired = true;
    setCaches((oldCaches) => {
      const { checked = 0, lines = [], linked = [] } = oldCaches.get(id) ?? {};
      _expired = checked + expired < now;
      oldCaches.set(id, {
        project,
        title,
        loading: _expired,
        lines,
        linked,
        checked: now,
      });
      return new Map(oldCaches);
    });
    if (!_expired) return;

    // cacheが寿命切れのときは再生成する
    let cache: Cache | undefined = undefined;
    try {
      cache = await fetchPage(project, title);
    } catch (e) {
      console.error(e);
    } finally {
      setCaches((oldCaches) => {
        const { lines = [], linked = [], checked = now } = oldCaches.get(id) ??
          {};
        oldCaches.set(id, {
          project,
          title,
          loading: false,
          // cacheの取得に失敗していたら更新しない
          lines: cache?.lines ?? lines,
          linked: cache?.linked ?? linked,
          checked,
        });
        return new Map(oldCaches);
      });
    }
  }, [expired]);

  // whiteList中のprojectに存在する同名のページを全てcacheする
  const cache = useCallback(async (project: string, title: string) => {
    // whiteListにないprojectの場合は何もしない
    if (!whiteList.includes(project)) return;
    // whiteListにあるprojectについてもcacheしておく
    for (const _project of whiteList) {
      await _cache(_project, title);
    }
  }, [_cache, whiteList]);
  // depth階層目にカードを表示する
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
        const ids = whiteList.map((_project) => toId(_project, title));
        return [...list.slice(0, depth), { ids, ...options }];
      });
    },
    [whiteList],
  );
  // depth階層以降のカードを消す
  const hide = useCallback(
    (depth: number) => setSelectedList((list) => [...list.slice(0, depth)]),
    [],
  );

  const cards = useMemo(
    () => {
      // 以前の階層のtext bubbleで使ったページはcard bubbleに使わない
      const showedPages = [{
        project: scrapbox.Project.name,
        titleLc: toLc(scrapbox.Page.title ?? ""),
      }];
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
          lines: toLc(title) === showedPages[0].titleLc ? [] : lines, // editorで開いているページは表示しない
          linked: linked.flatMap(({ project, title, ...page }) =>
            !showedPages.some((page) =>
                page.project === project && page.titleLc === toLc(title)
              )
              ? [{ project, title, ...page }]
              : []
          ),
          loading: cacheList.every(({ loading }) => loading),
          ...rest,
        };
        showedPages.push({ project, titleLc: toLc(title) });
        // linesもlinkedも空のときは消す
        return card.lines.length > 0 || card.linked.length > 0 ? [card] : [];
      });
    },
    [caches, selectedList],
  );

  return { cards, cache, show, hide };
}

async function fetchPage(
  project: string,
  title: string,
): Promise<Cache | undefined> {
  const res = await fetch(
    `/api/pages/${project}/${encodeTitle(title)}?followRename=true`,
  );
  const checked = new Date().getTime() / 1000;
  // 存在しないページの時
  if (!res.ok) return;
  const { lines, links, relatedPages: { links1hop } }: Page = await res.json();

  // 逆リンクを取得する
  const linksLc = links.map((link) => toLc(link));
  const pages = links1hop.flatMap(({
    title,
    descriptions,
    image,
  }) => !linksLc.includes(toLc(title)) ? [{ title, descriptions, image }] : []);
  return {
    project,
    title,
    checked,
    loading: false,
    lines: lines.slice(1), // titleを除く
    linked: pages,
  };
}
