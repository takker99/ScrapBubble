import { useEffect, useState } from "./deps/preact.tsx";
import { Page } from "./deps/scrapbox.ts";
import { getPage, LoadPageOptions, subscribe, unsubscribe } from "./page.ts";

export interface PageWithProject extends Page {
  project: string;
}
export type UsePageOptions = LoadPageOptions;

/** 同名タイトルのページを複数のprojectから一括して取得するhook
 *
 * @param title 取得したいページのタイトル
 * @param projects 取得先projectのリスト
 * @return 取得したページのリスト。順番は`projects`と同じ
 */
export const usePages = (
  title: string,
  projects: string[],
): PageWithProject[] => {
  const [pages, setPages] = useState<PageWithProject[]>([]);

  // データの初期化
  useEffect(() => {
    setPages(projects.flatMap((project) => {
      const res = getPage(title, project);
      return res?.ok === true ? [{ project, ...res.value }] : [];
    }));
  }, [title, projects]);

  // データ更新用listenerの登録
  useEffect(() => {
    /** ページデータを更新する */
    const updateData = (project: string, page: Page) =>
      setPages((pages) =>
        projects.flatMap((project_) => {
          if (project_ === project) return { project, ...page };
          const page_ = pages.find((page) => page.project === project_);
          return page_ ? [page_] : [];
        })
      );

    // 更新を購読する
    const callbacks = [] as Parameters<typeof subscribe>[];
    for (const project of projects) {
      const callback = (page: Page) => updateData(project, page);
      subscribe(title, project, callback);
      callbacks.push([title, project, callback]);
    }
    return () => callbacks.forEach((args) => unsubscribe(...args));
  }, [title, projects]);

  return pages;
};
