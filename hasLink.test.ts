import { parse } from "./deps/scrapbox-parser.ts";
import { hasLink } from "./hasLink.ts";
import { LinkTo } from "./types.ts";
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
    [{ titleLc: "こっち" }, true],
    [{ titleLc: "Scrapbox" }, false],
    [{ titleLc: "scrapbox" }, true],
    [
      { titleLc: "これはリンクではない" },
      false,
    ],
    [{ titleLc: "HashTag" }, false],
    [{ titleLc: "hashtag" }, true],
    [{ titleLc: "大文字aと小文字a" }, true],
    [{ titleLc: "link_in_table" }, true],
    [{ titleLc: "/project/external link" }, false],
    [{ project: "project", titleLc: "external link" }, false],
    [{ project: "project", titleLc: "external_link" }, true],
  ] as [LinkTo, boolean][];
  for (const [link, result] of links) {
    await t.step(
      `the text ${result ? "has" : "doesn't have"} ${
        !("project" in link) ? link.titleLc : `/${link.project}/${link.titleLc}`
      }`,
      () => {
        assertEquals(hasLink(link, nodes), result);
      },
    );
  }
});
