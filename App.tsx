/** @jsxRuntime automatic */
/** @jsxImportSource npm:preact@10 */
import { Bubble } from "./Bubble.tsx";
import { UserCSS } from "./UserCSS.tsx";
import { CSS } from "./app.min.css.ts";
import { useCallback, useEffect } from "./deps/preact.tsx";
import { useBubbles } from "./useBubbles.ts";
import { stayHovering } from "./stayHovering.ts";
import { useEventListener } from "./useEventListener.ts";
import { isPageLink, isTitle } from "./is.ts";
import { parseLink } from "./parseLink.ts";
import { toId } from "./id.ts";
import { calcBubblePosition } from "./position.ts";
import { prefetch as prefetch_ } from "./bubble.ts";
import type { LinkType } from "./types.ts";
import type { ProjectId, Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export const userscriptName = "scrap-bubble";

export interface AppProps {
  /** hoverしてからbubbleを表示するまでのタイムラグ */
  delay: number;

  /** 透過的に扱うprojectのリスト */
  whiteList: Set<string>;

  /** watch list */
  watchList: Set<ProjectId>;

  /** カスタムCSS
   *
   * URL or URL文字列の場合は、CSSファイルへのURLだとみなして<link />で読み込む
   * それ以外の場合は、インラインCSSとして<style />で読み込む
   */
  style: URL | string;
}

export const App = (
  { delay, whiteList, watchList, style }: AppProps,
) => {
  const [{ bubble, hide }, ...bubbles] = useBubbles();

  /** ページデータを先読みする
   *
   * white listにない外部プロジェクトリンクは、そのページだけを読み込む
   */
  const prefetch = useCallback((project: string, title: string) =>
    prefetch_(
      title,
      whiteList.has(project) ? whiteList : new Set([project]),
      watchList,
    ), [whiteList, watchList]);

  // hover処理
  useEventListener(
    document,
    "pointerenter",
    async (event: PointerEvent) => {
      const link = event.target as HTMLElement;

      // 処理を<a>か.line-titleのときに限定する
      if (!isPageLink(link) && !isTitle(link)) return;

      const {
        project = scrapbox.Project.name,
        title: encodedTitle,
        hash = "",
      } = isPageLink(link)
        ? parseLink({
          pathType: "root",
          href: `${new URL(link.href).pathname}${new URL(link.href).hash}`,
        })
        : { project: scrapbox.Project.name, title: scrapbox.Page.title };
      // [/project]の形のリンクは何もしない
      if (project === "") return;
      const title = decodeURIComponent(encodedTitle ?? "");

      prefetch(project, title);

      // delay以内にカーソルが離れるかクリックしたら何もしない
      if (!await stayHovering(link, delay)) return;

      bubble({
        project,
        title,
        hash,
        position: calcBubblePosition(link),
        type: getLinkType(link),
      });
    },
    { capture: true },
    [
      delay,
      whiteList,
      watchList,
    ],
  );

  // カード外クリックで全てのbubbleを隠す
  useEventListener(
    document,
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.userscriptName === userscriptName) return;
      hide();
    },
    { capture: true },
    [hide],
  );

  // ページ遷移でカードを消す
  useEffect(() => {
    scrapbox.addListener("page:changed", hide);
    return () => scrapbox.removeListener("page:changed", hide);
  }, [hide]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.12.0/katex.min.css"
      />
      <style>{CSS}</style>
      <UserCSS style={style} />
      {bubbles.map((bubble) => (
        <Bubble
          key={toId(bubble.source.project, bubble.source.title)}
          {...bubble}
          whiteList={whiteList}
          delay={delay}
          prefetch={prefetch}
        />
      ))}
    </>
  );
};

const getLinkType = (element: HTMLSpanElement | HTMLAnchorElement): LinkType =>
  isPageLink(element)
    ? (element.type === "link" ? "link" : "hashtag")
    : "title";
