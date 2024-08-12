import { fromId, toId } from "./id.ts";
import { assertEquals } from "./deps/testing.ts";

Deno.test("toId()", () => {
  assertEquals(toId("project", "Page A"), "/project/page_a");
  assertEquals(
    toId("Upper-Letter-Project", "Page A"),
    "/upper-letter-project/page_a",
  );
});
Deno.test("fromId()", () => {
  assertEquals(fromId("/project/page_a"), {
    project: "project",
    titleLc: "page_a",
  });
  assertEquals(fromId("/project-test/page_a"), {
    project: "project-test",
    titleLc: "page_a",
  });
  assertEquals(fromId("/project/prefix/page_a"), {
    project: "project",
    titleLc: "prefix/page_a",
  });
  assertEquals(fromId("/project/Page A"), {
    project: "project",
    titleLc: "Page A",
  });
  assertEquals(fromId("/upper-letter-project/Page A"), {
    project: "upper-letter-project",
    titleLc: "Page A",
  });
});
