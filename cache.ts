/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

let cache: Cache | undefined;
const cacheVersion = "0.2.1"; // release前に更新する
const cacheName = `ScrapBubble-${cacheVersion}`;

type FetchOption = {
  /** cacheの有効期限 */ expired?: number;
};
/** cache機能つきfetch */
export const fetch = async (
  path: string | Request,
  options?: FetchOption,
): Promise<Response> => {
  const { expired = 60 /* defaultは1分 */ } = options ?? {};

  const cachedRes = await globalThis.caches.match(path);
  const cached = new Date(cachedRes?.headers?.get?.("Date") ?? 0).getTime() /
    1000;
  if (!cachedRes || cached + expired < new Date().getTime() / 1000) {
    // 有効期限切れかcacheがなければ、fetchし直す
    const res = await globalThis.fetch(path);

    cache ??= await globalThis.caches.open(cacheName);
    // 有効でない応答もcacheする
    await cache.put(path, res.clone());
    return res;
  } else {
    // cacheを返す
    return cachedRes;
  }
};
