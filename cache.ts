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

  const req = new Request(path);
  const cachedRes = await findCache(req);

  if (!cachedRes || isExpiredResponse(cachedRes, expired)) {
    // 有効期限切れかcacheがなければ、fetchし直す
    const res = await globalThis.fetch(path);

    // 有効でない応答のみ自前のcacheに格納する
    if (!res.ok) {
      await cache.put(req, res.clone());
    }

    return res;
  } else {
    // cacheを返す
    return cachedRes;
  }
};

/** cacheからデータを取得する */
export const findCache = async (
  req: Request,
): Promise<Response | undefined> => {
  const cachedRes = await findLatestCache(req, { ignoreSearch: true }) ??
    await cache.match(req, { ignoreSearch: true });
  return cachedRes;
};

/** cacheに格納する */
export const putCache = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await cache.put(req, res);
};

/** 有効期限切れのresponseかどうか調べる */
export const isExpiredResponse = (
  response: Response,
  expired: number,
): boolean => {
  const updated = new Date(response.headers.get("Date") ?? 0).getTime() /
    1000;
  return updated + expired < new Date().getTime() / 1000;
};
