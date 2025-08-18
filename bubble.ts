import { cacheFirstFetch, isExpired } from "./cache.ts";
import { type ID, toId } from "./id.ts";
import { type Listener, makeEmitter } from "./eventEmitter.ts";
import { type Bubble, type BubbleStorage, update } from "./storage.ts";
import { convert } from "./convert.ts";
import { createDebug } from "./debug.ts";
import { getPage } from "./deps/scrapbox-std.ts";
import type { ProjectId, UnixTime } from "./deps/scrapbox.ts";
import { isOk, unwrapOk } from "./deps/option-t.ts";

const logger = createDebug("ScrapBubble:bubble.ts");

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
export const prefetch = async (
  title: string,
  projects: Iterable<string>,
  watchList: Set<ProjectId>,
  options?: PrefetchOptions,
): Promise<void> => {
  const promises: Promise<void>[] = [];
  // 最後に登録したものからfetchされるので、反転させておく
  // makeThrottleの仕様を参照
  for (const project of [...projects].reverse()) {
    const id = toId(project, title);
    if (loadingIds.has(id)) continue;
    promises.push(
      updateApiCache(project, title, watchList, options),
    );
  }

  await Promise.all(promises);
};

/** debug用カウンタ */
let counter = 0;

/** cacheおよびnetworkから新しいページデータを取得する
 *
 * もし更新があれば、更新通知も発行する
 */
const updateApiCache = async (
  project: string,
  title: string,
  watchList: Set<ProjectId>,
  options?: PrefetchOptions,
): Promise<void> => {
  const id = toId(project, title);
  if (loadingIds.has(id)) return;

  // 排他ロックをかける
  // これで同時に同じページの更新が走らないようにする
  loadingIds.add(id);
  const i = counter++;

  const timeTag = `[${i}] Check update ${id}`;
  logger.time(timeTag);
  try {
    const req = getPage.toRequest(project, title, {
      followRename: true,
      projects: [...watchList],
    });

    for await (
      const [type, res] of cacheFirstFetch(req, {
        ignoreSearch: true,
        saveFailedResponse: true,
      })
    ) {
      logger.debug(`[${i}]${type} ${id}`);
      const result = await getPage.fromResponse(res);
      // 更新があればeventを発行する
      if (isOk(result)) {
        const converted = convert(project, unwrapOk(result));
        for (const [bubbleId, bubble] of converted) {
          const prev = storage.get(bubbleId);
          const updatedBubble = update(prev, bubble);
          if (!updatedBubble) continue;
          if (prev === updatedBubble) continue;
          storage.set(bubbleId, updatedBubble);
          emitter.dispatch(bubbleId, bubble);
        }
      }

      if (options?.ignoreFetch === true) break;
      // 有効期限が切れているなら、新しくデータをnetworkから取ってくる
      if (type === "cache" && !isExpired(res, options?.maxAge ?? 60)) {
        break;
      }
    }
  } catch (e: unknown) {
    // 想定外のエラーはログに出す
    logger.error(e);
  } finally {
    // ロック解除
    loadingIds.delete(id);
    logger.timeEnd(timeTag);
    counter--;
  }
};
