import { useCallback, useMemo, useState } from "../deps/preact.tsx";
import { toLc } from "../utils.ts";
import { Page } from "../deps/scrapbox.ts";
import type { Scrapbox } from "https://pax.deno.dev/scrapbox-jp/types@0.0.5";
declare const scrapbox: Scrapbox;

export interface Cache {
  project: string;
  titleLc: string;
  checked: number; // 最後にデータを取得したUNIX時刻
  lines: { text: string; id: string }[];
  loading: boolean;
  linked: {
    title: string;
    descriptions: string[];
    image: string | null;
  }[];
}
export type Position = {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
};

export interface UseCardsInit {
  /** cacheの有効期限 (UNIX時刻) */ expired?: number;
  /** 透過的に扱いたいproject名のリスト */ whiteList?: string[];
}
export function useCards(
  { expired = 60, whiteList: _whiteList = [] }: UseCardsInit,
) {
  const [caches, setCaches] = useState(new Map<string, Cache>());
  // 表示するデータのcache idのリストと表示位置とのペアのリスト
  const [selectedList, setSelectedList] = useState<
    { ids: string[]; position: Position }[]
  >([]);

  // このリストにあるproject以外は表示しない
  const whiteList = useMemo(
    () => [...new Set([scrapbox.Project.name, ..._whiteList])],
    [_whiteList],
  );

  /** 特定のprojectのpageの情報をcacheする */
  const _cache = useCallback(async (project: string, titleLc: string) => {
    const id = toId(project, titleLc);
    const now = new Date().getTime() / 1000; // cacheの検証開始時刻
    let _expired = true;
    setCaches((oldCaches) => {
      const { checked = 0, lines = [], linked = [] } = oldCaches.get(id) ?? {};
      _expired = checked + expired < now;
      oldCaches.set(id, {
        project,
        titleLc,
        loading: _expired,
        lines,
        linked,
        checked: now,
      });
      return { ...oldCaches };
    });
    if (!_expired) return;

    // cacheが寿命切れのときは再生成する
    let cache: Cache | undefined = undefined;
    try {
      cache = await fetchPage(project, titleLc);
    } catch (e) {
      console.error(e);
    } finally {
      setCaches((oldCaches) => {
        const { lines = [], linked = [], checked = now } = oldCaches.get(id) ??
          {};
        oldCaches.set(id, {
          project,
          titleLc,
          loading: false,
          // cacheの取得に失敗していたら更新しない
          lines: cache?.lines ?? lines,
          linked: cache?.linked ?? linked,
          checked,
        });
        return oldCaches;
      });
    }
  }, [expired]);

  // whiteList中のprojectに存在する同名のページを全てcacheする
  const cache = useCallback(async (project: string, titleLc: string) => {
    // whiteListにないprojectの場合は何もしない
    if (!whiteList.includes(project)) return;
    // whiteListにあるprojectについてもcacheしておく
    for (const _project of whiteList) {
      await _cache(_project, titleLc);
    }
  }, [_cache, whiteList]);
  // depth階層目にカードを表示する
  const show = useCallback(
    (depth: number, project: string, titleLc: string, position: Position) => {
      // whiteListにないprojectの場合は何もしない
      if (!whiteList.includes(project)) return;

      setSelectedList((list) => {
        const ids = whiteList.map((_project) => toId(_project, titleLc));
        return [...list.slice(0, depth), { ids, position }];
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
      return selectedList.flatMap(({ ids, position }) => {
        const cacheList = ids.flatMap((id) =>
          caches.has(id) ? [caches.get(id)!] : []
        );
        // text bubbleで表示するページを決める
        const { project, titleLc, lines } = cacheList
          .find((cache) => cache.lines.length > 0) ?? cacheList[0];
        const linked = cacheList.flatMap(
          ({ project, linked }) => linked.map((page) => ({ ...page, project })),
        );
        const card = {
          project,
          titleLc,
          position,
          lines: titleLc === showedPages[0].titleLc ? [] : lines, // editorで開いているページは表示しない
          linked: linked.flatMap(({ project: _project, title, ...page }) =>
            !showedPages.some((page) =>
                page.project === _project && page.titleLc === toLc(title)
              )
              ? [{ project: _project, title, ...page }]
              : []
          ),
          loading: cacheList.every(({ loading }) => loading),
        };
        showedPages.push({ project, titleLc });
        // linesもlinkedも空のときは消す
        return card.lines.length > 0 || card.linked.length > 0 ? [card] : [];
      });
    },
    [caches, selectedList],
  );

  return { cards, cache, show, hide };
}

function toId(project: string, titleLc: string) {
  return `/${project}/${titleLc}`;
}
async function fetchPage(
  project: string,
  titleLc: string,
): Promise<Cache | undefined> {
  const res = await fetch(`/api/pages/${project}/${titleLc}`);
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
    titleLc,
    checked,
    loading: false,
    lines: lines.slice(1), // titleを除く
    linked: pages,
  };
}
