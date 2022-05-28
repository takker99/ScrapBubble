import { useEffect, useMemo, useState } from "./deps/preact.tsx";
import { toTitleLc } from "./deps/scrapbox-std.ts";
import { getPage, PageResult, subscribe, unsubscribe } from "./page.ts";
import type { Page } from "./deps/scrapbox.ts";

/** 指定したページに含まれる空リンクを返すhooks
 *
 * @param pages 調べるページのリスト
 * @return 空リンクのリスト
 */
export const useEmptyLinks = (
  pages: Page[],
  projects: string[],
): string[] => {
  /** ページ中の全てのリンク */
  const linksLc = useMemo(
    () =>
      new Set(
        pages.flatMap((page) => page.links.map((link) => toTitleLc(link))),
      ),
    [pages],
  );

  /** 各リンクが各projectで空リンクかどうかを格納するmap
   *
   * 配列の順番は`projects`と対応している
   */
  const [linkedPoints, setLinkedPoints] = useState(
    new Map<string, number[]>(),
  );

  // 空リンク判定とデータ更新用listenerの登録
  useEffect(() => {
    // リンクの情報を一括して取得する
    setLinkedPoints(
      new Map(
        [...linksLc].map((link) => [
          link,
          projects.map((project) => {
            const page = getPage(link, project);
            if (!page) return 2;
            return getLinkedPoint(page);
          }),
        ]),
      ),
    );

    /** ページデータを更新するcallback */
    const updateData = (linkLc: string, project: string, page: PageResult) =>
      setLinkedPoints((map) => {
        const points = map.get(linkLc);
        const point = getLinkedPoint(page);
        map.set(
          linkLc,
          projects.map((project_, i) =>
            project_ === project ? point : points?.at?.(i) ?? 2
          ),
        );
        return new Map(map);
      });

    // 更新を購読する
    const callbacks = [] as Parameters<typeof subscribe>[];
    for (const linkLc of linksLc) {
      for (const project of projects) {
        const callback = (page: PageResult) =>
          updateData(linkLc, project, page);
        subscribe(linkLc, project, callback);
        callbacks.push([linkLc, project, callback]);
      }
    }

    return () => callbacks.forEach((args) => unsubscribe(...args));
  }, [linksLc, projects]);

  // 空リンクを検索して返す
  return useMemo(
    () =>
      [...linkedPoints.entries()].flatMap(([linkLc, points]) =>
        points.reduce((acc, cur) => acc + cur) < 2 ? [linkLc] : []
      ),
    [linkedPoints],
  );
};

/** 与えられたリンクの逆リンク指数を計算する
 *
 * 全てのprojectからの指数の合計が1以下なら空リンクと判定する
 * ページエラーは空リンクとみなす
 *
 * @param page リンクのページデータ
 * @return 逆リンク指数
 */
const getLinkedPoint = (page: PageResult): number => {
  if (!page.ok) return 0;

  const {
    persistent,
    relatedPages: { links1hop, projectLinks1hop },
  } = page.value;

  return persistent ? 2 : links1hop.length + projectLinks1hop.length;
};
