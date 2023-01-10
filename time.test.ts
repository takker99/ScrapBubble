import { getUnixTime } from "./time.ts";
import { assertEquals } from "./deps/testing.ts";

Deno.test("getUnixTime", () => {
  assertEquals(getUnixTime(new Date(1671721200000)), 1671721200);
});
