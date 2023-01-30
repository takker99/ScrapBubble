import { detectURL } from "./detectURL.ts";
import { assert, assertEquals } from "./deps/testing.ts";

Deno.test("Absolute Path", async (t) => {
  {
    const text = "https://example.com/test.css";
    await t.step(text, () => {
      const url = detectURL(text);
      assert(url instanceof URL);
      if (url instanceof URL) assertEquals(url.href, text);
    });
  }
  {
    const text = ".div { display: block; }";
    await t.step(text, () => {
      const url = detectURL(text);
      assert(!(url instanceof URL));
      assertEquals(url, text);
    });
  }
  {
    const text = "./test.css";
    await t.step(text, () => {
      const url = detectURL(text);
      assert(!(url instanceof URL));
      assertEquals(url, text);
    });
  }
});
Deno.test("Relative Path", async (t) => {
  const base = "https://example.com/foo/bar/baz";
  {
    const text = "https://example.com/test.css";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(url instanceof URL);
      if (url instanceof URL) assertEquals(url.href, text);
    });
  }
  {
    const text = ".div { display: block; }";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(!(url instanceof URL));
      assertEquals(url, text);
    });
  }
  {
    const text = "#editor { display: block; }";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(!(url instanceof URL));
      assertEquals(url, text);
    });
  }
  {
    const text = "#editor { background: url('../../image.png'); }";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(!(url instanceof URL));
      assertEquals(url, text);
    });
  }
  {
    const text = "#editor { background: url('./image.png'); }";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(!(url instanceof URL));
      assertEquals(url, text);
    });
  }
  {
    const text = "#editor { background: url('/image.png'); }";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(!(url instanceof URL));
      assertEquals(url, text);
    });
  }
  {
    const text = "./test.css";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(url instanceof URL);
      assertEquals(url.href, "https://example.com/foo/bar/test.css");
    });
  }
  {
    const text = "../test.css";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(url instanceof URL);
      assertEquals(url.href, "https://example.com/foo/test.css");
    });
  }
  {
    const text = "../../hoge/test.css";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(url instanceof URL);
      assertEquals(url.href, "https://example.com/hoge/test.css");
    });
  }
  {
    const text = "/test.css";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(url instanceof URL);
      assertEquals(url.href, "https://example.com/test.css");
    });
  }
  {
    const text = "//test.com/test.css";
    await t.step(text, () => {
      const url = detectURL(text, base);
      assert(url instanceof URL);
      assertEquals(url.href, "https://test.com/test.css");
    });
  }
});
