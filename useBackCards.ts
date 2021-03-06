import { useMemo } from "./deps/preact.tsx";
import { toTitleLc } from "./deps/scrapbox-std.ts";
import type { PageWithProject } from "./usePages.ts";
import type { ProjectRelatedPage } from "./deps/scrapbox.ts";

/** 指定したリンクの逆リンクを取得するhooks
 *
 * @param title リンクの名前
 * @param pages ページデータ
 * @return 逆リンクのリスト
 */
export const useBackCards = (
  title: string,
  pages: PageWithProject[],
): ProjectRelatedPage[] => {
  const backCards = useMemo(() =>
    pages.flatMap((page) => {
      const cards = [] as ProjectRelatedPage[];
      const { projectLinks, relatedPages: { links1hop, projectLinks1hop } } =
        page;
      const projectLinksLc = projectLinks.map((link) => toTitleLc(link));

      // 1 hop linksのうち、titleにリンクしているページのみ抽出する
      cards.push(
        ...links1hop.flatMap((card) =>
          card.linksLc.includes(toTitleLc(title))
            ? [{ projectName: page.project, ...card }]
            : []
        ),
      );

      // external linksのうち、順リンクがないもののみ抽出する
      // 逆リンクがあるものも除かれてしまうが、判定方法がないので断念する
      cards.push(
        ...projectLinks1hop.filter((card) =>
          !projectLinksLc.includes(
            toTitleLc(`/${card.projectName}/${card.title}`),
          )
        ),
      );

      return cards;
    }), [pages, title]);

  return backCards;
};
