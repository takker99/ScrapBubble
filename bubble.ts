import { findCache, isExpiredResponse, putCache } from "./cache.ts";
import { ID, toId } from "./id.ts";
import { Listener, makeEmitter } from "./eventEmitter.ts";
import { Bubble, BubbleStorage, update } from "./storage.ts";
import { convert } from "./convert.ts";
import { makeThrottle } from "./throttle.ts";
import { logger } from "./debug.ts";
import { getPage } from "./deps/scrapbox-std.ts";
import { ProjectId, UnixTime } from "./deps/scrapbox.ts";

const storage: BubbleStorage = new Map();
/** データを更新中のページのリスト */
const loadingIds = new Set<ID>();
const emitter = makeEmitter<ID, Bubble>();

/** bubble dataを読み込む
 *
 * データの更新は行わない
 *
 * @param pageIds 取得したいページのリスト
 * @return pageの情報。未初期化のときは`undefined`を返す
 */
export function* load(
  pageIds: Iterable<ID>,
): Generator<Bubble | undefined, void, unknown> {
  for (const pageId of pageIds) {
    yield storage.get(pageId);
  }
}

/** 特定のページの更新を購読する */
export const subscribe = (pageId: ID, listener: Listener<Bubble>): void =>
  emitter.on(pageId, listener);

/** 特定のページの更新購読を解除する */
export const unsubscribe = (pageId: ID, listener: Listener<Bubble>): void =>
  emitter.off(pageId, listener);

export interface PrefetchOptions {
  /** networkからデータを取得しないときは`true`を渡す*/
  ignoreFetch?: boolean;
  /** cacheの有効期限 (単位は秒) */
  maxAge?: UnixTime;
}

/** ページデータを取得し、cacheに格納する
 *
 * cacheは一定間隔ごとに更新される
 */
export const prefetch = (
  title: string,
  projects: string[],
  watchList: ProjectId[],
  options?: PrefetchOptions,
): void => {
  for (const project of projects) {
    const id = toId(project, title);
    if (loadingIds.has(id)) continue;
    updateApiCache(project, title, watchList, options);
  }
};

/** debug用カウンタ */
let counter = 0;

/** 同時に3つまでfetchできるようにする函数 */
const throttle = makeThrottle<Response>(3);

/** cacheおよびnetworkから新しいページデータを取得する
 *
 * もし更新があれば、更新通知も発行する
 */
const updateApiCache = async (
  project: string,
  title: string,
  watchList: ProjectId[],
  options?: PrefetchOptions,
): Promise<void> => {
  const id = toId(project, title);
  if (loadingIds.has(id)) return;

  // 排他ロックをかける
  // これで同時に同じページの更新が走らないようにする
  loadingIds.add(id);
  const i = counter++;

  logger.time(`[${i}] Check update ${id}`);
  try {
    const req = getPage.toRequest(project, title, {
      followRename: true,
      projects: watchList,
    });
    const url = new URL(req.url);
    const pureURL = `${url.origin}${url.pathname}`;

    // 1. cacheから取得する
    const cachedRes = await findCache(pureURL);
    if (cachedRes) {
      const result = await getPage.fromResponse(cachedRes);

      // 更新があればeventを発行する
      if (result.ok) {
        const converted = convert(project, result.value);
        for (const [bubbleId, bubble] of converted) {
          const prev = storage.get(bubbleId);
          const updatedBubble = update(prev, bubble);
          if (prev === updatedBubble) continue;
          storage.set(bubbleId, updatedBubble);
          emitter.dispatch(bubbleId, bubble);
        }
      }
    }

    // 2. 有効期限が切れているなら、新しくデータをnetworkから取ってくる
    if (options?.ignoreFetch === true) return;
    if (
      cachedRes && !isExpiredResponse(cachedRes, options?.maxAge ?? 60)
    ) {
      return;
    }

    const res = await throttle(() => fetch(req));
    logger.debug(`%c[${i}]Fetch`, "color: gray;", id);
    const result = await getPage.fromResponse(res.clone());
    await putCache(pureURL, res);

    // 更新があればeventを発行する
    if (result.ok) {
      const converted = convert(project, result.value);
      for (const [bubbleId, bubble] of converted) {
        const prev = storage.get(bubbleId);
        const updatedBubble = update(prev, bubble);
        if (prev === updatedBubble) continue;
        storage.set(bubbleId, updatedBubble);
        emitter.dispatch(bubbleId, bubble);
      }
    }
  } catch (e: unknown) {
    // 想定外のエラーはログに出す
    console.error(e);
  } finally {
    // ロック解除
    loadingIds.delete(id);
    logger.timeEnd(`[${i}] Check update ${id}`);
    counter--;
  }
};
