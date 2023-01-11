import { Bubble, update } from "./storage.ts";
import {
  assertEquals,
  assertNotEquals,
  assertNotStrictEquals,
  assertStrictEquals,
} from "./deps/testing.ts";

Deno.test("update()", async (t) => {
  await t.step("更新日時が違う場合", async (t) => {
    const next: Bubble = {
      checked: 1672173549,
      descriptions: [
        "[A1],[A2],[A3]",
        "https://scrapbox.io/api/pages/takker-dist/A",
      ],
      exists: true,
      image: null,
      lines: [
        {
          created: 1672173548,
          id: "dummy",
          text: "A",
          updated: 1672173548,
          userId: "dummy",
        },
        {
          created: 1672173548,
          id: "dummy",
          text: "[A1],[A2],[A3]",
          updated: 1672173548,
          userId: "dummy",
        },
        {
          created: 1672173548,
          id: "dummy",
          text: "https://scrapbox.io/api/pages/takker-dist/A",
          updated: 1672173548,
          userId: "dummy",
        },
      ],
      project: "takker-dist",
      titleLc: "a",
      updated: 1672173550,
    };

    await t.step("双方ともlinkedなし", () => {
      const prev: Bubble = {
        checked: 1672173549,
        descriptions: [
          "[A1],[A2],[A3]",
          "https://scrapbox.io/api/pages/takker-dist/A",
        ],
        exists: true,
        image: null,
        lines: [
          {
            created: 1672173548,
            id: "dummy",
            text: "A",
            updated: 1672173548,
            userId: "dummy",
          },
          {
            created: 1672173548,
            id: "dummy",
            text: "[A1],[A2],[A3]",
            updated: 1672173548,
            userId: "dummy",
          },
          {
            created: 1672173548,
            id: "dummy",
            text: "https://scrapbox.io/api/pages/takker-dist/A",
            updated: 1672173548,
            userId: "dummy",
          },
        ],
        project: "takker-dist",
        titleLc: "a",
        updated: 1672173548,
      };
      const updated = update(prev, next);
      assertNotStrictEquals(updated, prev);
      assertNotStrictEquals(updated, next);
      assertNotEquals(updated, prev);
      assertEquals(updated, next);

      assertStrictEquals(updated.lines, prev.lines);
      assertStrictEquals(updated.descriptions, next.descriptions);
    });

    await t.step("古い方にlinkedあり", () => {
      const prev: Bubble = {
        checked: 1672173549,
        descriptions: [
          "[A1],[A2],[A3]",
          "https://scrapbox.io/api/pages/takker-dist/A",
        ],
        exists: true,
        image: null,
        lines: [
          {
            created: 1672173548,
            id: "dummy",
            text: "A",
            updated: 1672173548,
            userId: "dummy",
          },
          {
            created: 1672173548,
            id: "dummy",
            text: "[A1],[A2],[A3]",
            updated: 1672173548,
            userId: "dummy",
          },
          {
            created: 1672173548,
            id: "dummy",
            text: "https://scrapbox.io/api/pages/takker-dist/A",
            updated: 1672173548,
            userId: "dummy",
          },
        ],
        linked: ["c4", "c3"],
        project: "takker-dist",
        titleLc: "a",
        updated: 1672173548,
      };
      const updated = update(prev, next);
      assertNotStrictEquals(updated, prev);
      assertNotStrictEquals(updated, next);
      assertNotEquals(updated, prev);
      assertNotEquals(updated, next);
      assertEquals(updated, { ...next, linked: prev.linked });

      assertStrictEquals(updated.lines, prev.lines);
      assertStrictEquals(updated.descriptions, next.descriptions);
    });
  });

  await t.step("更新日時が同じ場合", async (t) => {
    const next: Bubble = {
      checked: 1672173549,
      descriptions: [
        "[A1],[A2],[A3]",
        "https://scrapbox.io/api/pages/takker-dist/A",
      ],
      exists: true,
      image: null,
      lines: [
        {
          created: 1672173548,
          id: "dummy",
          text: "A",
          updated: 1672173548,
          userId: "dummy",
        },
        {
          created: 1672173548,
          id: "dummy",
          text: "[A1],[A2],[A3]",
          updated: 1672173548,
          userId: "dummy",
        },
        {
          created: 1672173548,
          id: "dummy",
          text: "https://scrapbox.io/api/pages/takker-dist/A",
          updated: 1672173548,
          userId: "dummy",
        },
      ],
      linked: ["e2", "e3"],
      project: "takker-dist",
      titleLc: "a",
      updated: 1672173548,
    };

    await t.step("checkedのみ違う", () => {
      const prev: Bubble = {
        checked: 1672173547,
        descriptions: [
          "[A1],[A2],[A3]",
          "https://scrapbox.io/api/pages/takker-dist/A",
        ],
        exists: true,
        image: null,
        lines: [
          {
            created: 1672173548,
            id: "dummy",
            text: "A",
            updated: 1672173548,
            userId: "dummy",
          },
          {
            created: 1672173548,
            id: "dummy",
            text: "[A1],[A2],[A3]",
            updated: 1672173548,
            userId: "dummy",
          },
          {
            created: 1672173548,
            id: "dummy",
            text: "https://scrapbox.io/api/pages/takker-dist/A",
            updated: 1672173548,
            userId: "dummy",
          },
        ],
        linked: ["e2", "e3"],
        project: "takker-dist",
        titleLc: "a",
        updated: 1672173548,
      };
      const updated = update(prev, next);
      assertStrictEquals(updated, prev);
      assertNotStrictEquals(updated, next);

      assertStrictEquals(updated.checked, next.checked);
      assertStrictEquals(updated.lines, prev.lines);
      assertStrictEquals(updated.descriptions, prev.descriptions);
    });

    await t.step("linkedのみ違う", () => {
      const prev: Bubble = {
        checked: 1672173549,
        descriptions: [
          "[A1],[A2],[A3]",
          "https://scrapbox.io/api/pages/takker-dist/A",
        ],
        exists: true,
        image: null,
        lines: [
          {
            created: 1672173548,
            id: "dummy",
            text: "A",
            updated: 1672173548,
            userId: "dummy",
          },
          {
            created: 1672173548,
            id: "dummy",
            text: "[A1],[A2],[A3]",
            updated: 1672173548,
            userId: "dummy",
          },
          {
            created: 1672173548,
            id: "dummy",
            text: "https://scrapbox.io/api/pages/takker-dist/A",
            updated: 1672173548,
            userId: "dummy",
          },
        ],
        linked: ["e2", "e4"],
        project: "takker-dist",
        titleLc: "a",
        updated: 1672173548,
      };
      const updated = update(prev, next);
      assertNotStrictEquals(updated, prev);
      assertNotStrictEquals(updated, next);
      assertEquals(updated, next);

      assertStrictEquals(updated.lines, prev.lines);
      assertStrictEquals(updated.descriptions, prev.descriptions);
      assertStrictEquals(updated.linked, next.linked);
    });
  });
});
