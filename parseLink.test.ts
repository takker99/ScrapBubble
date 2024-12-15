import { parseLink } from "./parseLink.ts";
import { assertEquals } from "./deps/testing.ts";

Deno.test("external link", () => {
  assertEquals(
    parseLink({
      pathType: "root",
      href: "/project/title#61b5253a1280f00000003d6b5e",
    }),
    {
      project: "project",
      title: "title",
      hash: "61b5253a1280f00000003d6b5e",
    },
  );
  assertEquals(
    parseLink({ pathType: "root", href: "/project/title#invalidId" }),
    {
      project: "project",
      title: "title#invalidId",
    },
  );
  assertEquals(parseLink({ pathType: "root", href: "/project/title" }), {
    project: "project",
    title: "title",
  });
  assertEquals(parseLink({ pathType: "root", href: "/project/" }), {
    project: "project",
  });
  assertEquals(parseLink({ pathType: "root", href: "/project" }), {
    project: "project",
  });
  assertEquals(
    parseLink({ pathType: "root", href: "/project/#title-with-#" }),
    {
      project: "project",
      title: "#title-with-#",
    },
  );
});
Deno.test("internal link", () => {
  assertEquals(
    parseLink({
      pathType: "relative",
      href: "title#61b5253a1280f00000003d6b5e",
    }),
    {
      title: "title",
      hash: "61b5253a1280f00000003d6b5e",
    },
  );
  assertEquals(
    parseLink({ pathType: "relative", href: "title#invalidId" }),
    {
      title: "title#invalidId",
    },
  );
  assertEquals(parseLink({ pathType: "relative", href: "title" }), {
    title: "title",
  });
  assertEquals(parseLink({ pathType: "relative", href: "title/with#/" }), {
    title: "title/with#/",
  });
});

Deno.test("project-like title", () => {
  assertEquals(parseLink({ pathType: "root", href: "/*@__PURE__*/" }), {
    title: "/*@__PURE__*/",
  });
});
