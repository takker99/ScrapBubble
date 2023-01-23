/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

import { Node } from "./deps/scrapbox-parser.ts";
import { parseLink } from "./parseLink.ts";
import { LinkTo } from "./types.ts";
import { toTitleLc } from "./deps/scrapbox-std.ts";

/** 指定したリンクがScrapboxのページ中に存在するか調べる
 *
 * @param link 調べたいリンクのタイトル
 * @param nodes ページの構文解析結果
 * @return 見つかったら`true`
 */
export const hasLink = (
  link: LinkTo,
  nodes: Node[],
): boolean =>
  nodes.some((node) => {
    const isRelative = !link.project;
    switch (node.type) {
      case "hashTag":
        return isRelative &&
          toTitleLc(node.href) === link.titleLc;
      case "link": {
        if (node.pathType == "absolute") return false;
        if ((node.pathType === "relative") !== isRelative) return false;

        const { project, title = "" } = parseLink({
          pathType: node.pathType,
          href: node.href,
        });
        return isRelative
          ? !project && toTitleLc(title) === link.titleLc
          : project === link.project &&
            toTitleLc(title) === link.titleLc;
      }
      case "quote":
      case "strong":
      case "decoration":
        return hasLink(link, node.nodes);
    }
  });
