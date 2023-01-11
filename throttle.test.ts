import { makeThrottle } from "./throttle.ts";
import { assertEquals } from "./deps/testing.ts";

Deno.test("makeThrottle()", async (t) => {
  await t.step("順番に実行", async () => {
    const throttle = makeThrottle<void>(3);

    const queue: number[] = [];
    await Promise.all([...Array(10).keys()].map((_, i) =>
      throttle(() => {
        queue.push(i);
        return Promise.resolve();
      })
    ));

    assertEquals(queue, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  await t.step("一部を止める", async () => {
    const throttle = makeThrottle<void>(3);

    const queue: number[] = [];
    const promises: Promise<unknown>[] = [];
    const push = (i: number) => {
      promises.push(
        throttle(() => {
          queue.push(i);
          return Promise.resolve();
        }),
      );
    };

    let resolve: (() => void) | undefined;
    await Promise.all([
      push(0),
      push(1),
      throttle(() =>
        new Promise<void>((r) => resolve = r).then(() => {
          queue.push(2);
        })
      ),
      push(3),
      push(4),
      push(5),
      push(6),
      throttle(() => {
        resolve?.();
        queue.push(7);
        return Promise.resolve();
      }),
      push(8),
      push(9),
    ]);

    assertEquals(queue, [0, 1, 3, 4, 5, 6, 7, 8, 2, 9]);
  });
});
