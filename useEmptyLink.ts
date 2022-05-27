import { useMemo } from "./deps/preact.tsx";
import { usePages } from "./usePages.ts";
import { ProjectId } from "./deps/scrapbox.ts";

/** 指定したリンクが空リンクかどうか判定するhooks
 *
 * @param title リンクの名前
 * @param projects 透過的に扱うprojectのリスト
 * @param watchList external Links用のwatch list
 * @return 空リンクなら`true`
 */
export const useEmptyLink = (
  title: string,
  projects: string[],
  watchList: ProjectId[],
): boolean => {
  const pages = usePages(title, projects, watchList, { ignoreFetch: true });
  const isEmptyLink = useMemo(() =>
    pages.some((page) => {
      const { persistent, relatedPages: { links1hop, projectLinks1hop } } =
        page;

      return !persistent && links1hop.length === 0 &&
        projectLinks1hop.length === 0;
    }), [pages]);

  return isEmptyLink;
};
