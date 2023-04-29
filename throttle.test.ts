import { makeThrottle } from "./throttle.ts";
import { assertEquals } from "./deps/testing.ts";

Deno.test("makeThrottle()", async (t) => {
  await t.step("順番に実行", async () => {
    const throttle = makeThrottle<number>(10);

    const queue: number[] = [];
    const resolved = await Promise.all(
      [...Array(10).keys()].map((_, i) =>
        throttle(() => {
          queue.push(i);
          return Promise.resolve(i);
        })
      ),
    );

    assertEquals(queue, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assertEquals(resolved, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  await t.step(
    "thresholdより多いjobsは、最後に追加されたものから実行される",
    async () => {
      for (let i = 1; i < 10; i++) {
        const throttle = makeThrottle<number>(10 - i);

        const queue: number[] = [];
        const resolved = await Promise.all(
          [...Array(10).keys()].map((_, i) =>
            throttle(() => {
              queue.push(i);
              return Promise.resolve(i);
            })
          ),
        );
        const result = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const splitted = result.splice(10 - i, i).reverse();
        // e.g. max jobsが5(=10 - i)のときは、result = [0,1,2,3,4,9,8,7,6,5]となる
        result.push(...splitted);

        assertEquals(queue, result);
        assertEquals(resolved, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      }
    },
  );

  await t.step("一部を止める", async () => {
    const throttle = makeThrottle<number>(3);

    const queue: number[] = [];
    const push = (i: number) =>
      throttle(() => {
        queue.push(i);
        return Promise.resolve(i);
      });

    let resolve: (() => void) | undefined;
    const resolved = await Promise.all([
      push(0),
      push(1),
      throttle(() =>
        new Promise<void>((r) => resolve = r).then(() => {
          queue.push(2);
          return 2;
        })
      ),
      push(3),
      push(4),
      push(5),
      push(6),
      throttle(() => {
        resolve?.();
        queue.push(7);
        return Promise.resolve(7);
      }),
      push(8),
      push(9),
    ]);

    assertEquals(queue, [0, 1, 9, 8, 7, 6, 2, 5, 4, 3]);
    assertEquals(resolved, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
