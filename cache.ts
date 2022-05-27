/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

import { findLatestCache } from "./deps/scrapbox-std.ts";

const cacheVersion = "0.2.1"; // release前に更新する
const cacheName = `ScrapBubble-${cacheVersion}`;
const cache = await globalThis.caches.open(cacheName);

// 古いcacheがあったら削除しておく
for (const name of await globalThis.caches.keys()) {
  if (name.startsWith("ScrapBubble-") && name !== cacheName) {
    await globalThis.caches.delete(name);
    console.log(`[ScrapBubble] deleted old cache :"${name}"`);
  }
}

type FetchOption = {
  /** cacheの有効期限 */
  expired?: number;
};
/** cache機能つきfetch */
export const fetch = async (
  path: string | Request,
  options?: FetchOption,
): Promise<Response> => {
  const { expired = 60 /* defaultは1分 */ } = options ?? {};

  const cachedRes =
    await findLatestCache(new Request(path), { ignoreSearch: true }) ??
      await cache.match(path, { ignoreSearch: true });
  const cached = new Date(cachedRes?.headers?.get?.("Date") ?? 0).getTime() /
    1000;
  if (!cachedRes || cached + expired < new Date().getTime() / 1000) {
    // 有効期限切れかcacheがなければ、fetchし直す
    const res = await globalThis.fetch(path);

    // 有効でない応答のみ自前のcacheに格納する
    if (!res.ok) {
      await cache.put(path, res.clone());
    }

    return res;
  } else {
    // cacheを返す
    return cachedRes;
  }
};
