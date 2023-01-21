/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

import type { UnixTime } from "./deps/scrapbox.ts";
import { findLatestCache, sleep } from "./deps/scrapbox-std.ts";
import { makeThrottle } from "./throttle.ts";

const cacheVersion = "0.6.5"; // release前に更新する
const cacheName = `ScrapBubble-${cacheVersion}`;
const cache = await globalThis.caches.open(cacheName);

// 古いcacheがあったら削除しておく
// 他の操作をブロックする必要はない
(async () => {
  for (const name of await globalThis.caches.keys()) {
    if (name.startsWith("ScrapBubble-") && name !== cacheName) {
      await globalThis.caches.delete(name);
      console.log(`[ScrapBubble] deleted old cache :"${name}"`);
    }
  }
})();

/** 同時に3つまでfetchできるようにする函数 */
const throttle = makeThrottle<Response>(3);

export interface CacheFirstFetchOptions extends CacheQueryOptions {
  /** 失敗したresponseをcacheに保存するかどうか
   *
   * @default `false` (保存しない)
   */
  saveFailedResponse?: boolean;
}

/** cacheとnetworkから順番にresponseをとってくる
 *
 * networkからとってこなくていいときは、途中でiteratorをbreakすればfetchしない
 *
 * fetchは同時に5回までしかできないよう制限する
 *
 * @param req 要求
 * @param options cacheを探すときの設定
 */
export async function* cacheFirstFetch(
  req: Request,
  options?: CacheFirstFetchOptions,
): AsyncGenerator<readonly ["cache" | "network", Response], void, unknown> {
  // cacheから返す
  // まず自前のcache storageから失敗したresponseを取得し、なければscrapbox.ioのcacheから正常なresponseを探す
  const cachePromise =
    ((options?.saveFailedResponse ? cache.match(req) : undefined) ??
      findLatestCache(req, options)).then((res) => ["cache", res] as const);
  {
    const timer = sleep(1000).then(() => "timeout" as const);
    const first = await Promise.race([cachePromise, timer]);
    if (first !== "timeout") {
      // 1秒以内にcacheを読み込めたら、cache→networkの順に返す
      if (first[1]) {
        yield ["cache", first[1]];
      }
      // networkから返す
      const res = await throttle(() => fetch(req));
      if (!res.ok && options?.saveFailedResponse) {
        // scrapbox.ioは失敗したresponseをcacheしないので、自前のcacheに格納しておく
        await cache.put(req, res.clone());
      }
      yield ["network", res];
    }
  }

  // 1秒経ってもcacheの読み込みが終わらないときは、fetchを走らせ始める
  const networkPromise = throttle(() => fetch(req))
    .then((res) => ["network", res] as const);
  const [type, res] = await Promise.race([cachePromise, networkPromise]);

  if (type === "network") {
    yield [type, res];
    // networkPromiseが先にresolveしたら、cachePromiseはyieldせずに捨てる
    return;
  }
  if (res) yield [type, res];
  yield await networkPromise;
}

/** 有効期限切れのresponseかどうか調べる
 *
 * @param response 調べるresponse
 * @param maxAge 寿命(単位はs)
 */
export const isExpired = (
  response: Response,
  maxAge: UnixTime,
): boolean => {
  const updated = new Date(response.headers.get("Date") ?? 0).getTime() /
    1000;
  return updated + maxAge < new Date().getTime() / 1000;
};
