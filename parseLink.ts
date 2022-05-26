export type ScrapboxLink = {
  href: string;
  pathType: "root" | "relative";
};
export const parseLink = (
  link: ScrapboxLink,
) => {
  if (link.pathType === "root") {
    const [, project = "", title = ""] = link.href.match(
      /\/([\w\-]+)(?:\/?|\/(.*))$/,
    ) ?? ["", "", ""];
    if (project === "") {
      throw SyntaxError(`Failed to get a project name from "${link.href}"`);
    }
    const [, hash] = title?.match?.(/#([a-f\d]{24,32})$/) ?? ["", ""];
    return title === ""
      ? { project }
      : hash === ""
      ? { project, title }
      : { project, title: title.slice(0, -1 - hash.length), hash };
  } else {
    const [, hash] = link.href.match(/#([a-f\d]{24,32})$/) ?? ["", ""];
    return hash === ""
      ? { title: link.href }
      : { title: link.href.slice(0, -1 - hash.length), hash };
  }
};
