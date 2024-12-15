export interface ScrapboxLink {
  href: string;
  pathType: "root" | "relative";
}

/** Scrapbox記法のリンクから、project, title, hashを取り出す
 *
 * @param link 構文解析したScrapbox記法のリンク
 * @return 抽出したproject, title, hash
 */
export const parseLink = (
  link: ScrapboxLink,
): { project: string; title?: string; hash?: string } | {
  project?: string;
  title: string;
  hash?: string;
} => {
  root: if (link.pathType === "root") {
    const [, project = "", title = ""] = link.href.match(
      /\/([\w\-]+)(?:\/?|\/(.*))$/,
    ) ?? ["", "", ""];
    if (project === "") break root;
    const [, hash] = title?.match?.(/#([a-f\d]{24,32})$/) ?? ["", ""];
    return title === ""
      ? { project }
      : hash === ""
      ? { project, title }
      : { project, title: title.slice(0, -1 - hash.length), hash };
  }
  const [, hash] = link.href.match(/#([a-f\d]{24,32})$/) ?? ["", ""];
  return hash === ""
    ? { title: link.href }
    : { title: link.href.slice(0, -1 - hash.length), hash };
};
