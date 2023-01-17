/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Bubble } from "./Bubble.tsx";
import { UserCSS } from "./UserCSS.tsx";
import { CSS } from "./app.min.css.ts";
import { Fragment, h, useCallback, useEffect } from "./deps/preact.tsx";
import { useBubbles } from "./useBubbles.ts";
import { stayHovering } from "./stayHovering.ts";
import { useEventListener } from "./useEventListener.ts";
import { isLiteralStrings, isPageLink, isTitle } from "./is.ts";
import { ensureHTMLDivElement } from "./ensure.ts";
import { parseLink } from "./parseLink.ts";
import { calcBubblePosition } from "./position.ts";
import { prefetch as prefetch_ } from "./bubble.ts";
import { editor } from "./deps/scrapbox-std.ts";
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
  watchList: ProjectId[];

  /** カスタムCSS
   *
   * URL or URL文字列の場合は、CSSファイルへのURLだとみなして<link />で読み込む
   * それ以外の場合は、インラインCSSとして<style />で読み込む
   */
  style: URL | string;

  /** リンク先へスクロールする機能を有効にする対象
   *
   * `link`: []で囲まれたリンク
   * `hashtag`: ハッシュタグ
   * `lineId`: 行リンク
   */
  scrollTargets: ("title" | "link" | "hashtag" | "lineId")[];
}

const editorDiv = editor();
ensureHTMLDivElement(editorDiv, "#editor");

export const App = (
  { delay, whiteList, scrollTargets, watchList, style }: AppProps,
) => {
  const [{ bubble, hide }, ...bubbles] = useBubbles();

  /** ページデータを先読みする
   *
   * white listにない外部プロジェクトリンクは、そのページだけを読み込む
   */
  const prefetch = useCallback((project: string, title: string) => {
    const projects = new Set([scrapbox.Project.name, ...whiteList]);
    prefetch_(
      title,
      projects.has(project) ? projects : new Set([project]),
      watchList,
    );
  }, [whiteList, watchList]);

  // hover処理
  useEventListener(
    editorDiv,
    "pointerenter",
    async (event: PointerEvent) => {
      ensureHTMLDivElement(event.currentTarget, "event.currentTarget");
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

      // スクロール先を設定する
      const scrollTo = hash !== "" && scrollTargets.includes("lineId")
        ? { type: "id", value: hash } as const
        : link.dataset.linkedTo &&
            isLiteralStrings(
              link.dataset.linkedType,
              "link",
              "hashtag",
              "title",
            ) && scrollTargets.includes(link.dataset.linkedType)
        ? { type: "link", value: link.dataset.linkedTo } as const
        : undefined;

      bubble({
        project,
        title,
        scrollTo,
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
