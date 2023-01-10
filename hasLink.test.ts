import { parse } from "./deps/scrapbox-parser.ts";
import { hasLink } from "./hasLink.ts";
import { assertEquals } from "./deps/testing.ts";

Deno.test("hasLink()", async (t) => {
  const text = `
  サンプルテキスト
  \`[これはリンクではない]\`けど、[こっち]はリンク
  [scrapbox]
  code:js
   これも[リンク]にはならない
  #hashtag も検知できるはず
  [大文字Aと小文字a]が入り混じっていてもいい
  table:teset
    [link in table]
  [/project/external link]
  `;
  const nodes = parse(text).flatMap((block) => {
    switch (block.type) {
      case "codeBlock":
      case "title":
        return [];
      case "table":
        return block.cells.flat().flat();
      case "line":
        return block.nodes;
    }
  });

  const links = [
    ["こっち", true],
    ["Scrapbox", true],
    [
      "これはリンクではない",
      false,
    ],
    ["HashTag", true],
    ["大文字aと小文字A", true],
    ["LINK in_table", true],
    ["/project/external link", false],
    [{ project: "project", title: "external link" }, true],
  ] as [string | { project: string; title: string }, boolean][];
  for (const [link, result] of links) {
    await t.step(
      `the text ${result ? "has" : "doesn't have"} ${
        typeof link === "string" ? link : `/${link.project}/${link.title}`
      }`,
      () => {
        assertEquals(hasLink(link, nodes), result);
      },
    );
  }
});
