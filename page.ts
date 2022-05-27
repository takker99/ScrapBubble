import { getPage as fetchPage, Result } from "./deps/scrapbox-std.ts";
import { fetch } from "./cache.ts";
import { ID, toId } from "./utils.ts";
import { Listener, makeEmitter } from "./eventEmitter.ts";
import {
  NotFoundError,
  NotLoggedInError,
  NotMemberError,
  Page,
  ProjectId,
} from "./deps/scrapbox.ts";

const emitter = makeEmitter<ID, Page>();

type PageResult = Result<
  Page,
  NotFoundError | NotLoggedInError | NotMemberError
>;
type State<T> = { loading: boolean; value?: T };
const pageMap = new Map<ID, State<PageResult>>();

export interface LoadPageOptions {
  /** networkからデータを取得しないときは`true`を渡す*/
  ignoreFetch?: boolean;
}

/** /api/projects/:projectの結果を取得する
 *
 * @param title 取得したいページのタイトル
 * @return projectの情報。未初期化もしくは読み込み中のときは`undefined`を返す
 */
export const getPage = (
  title: string,
  project: string,
  watchList: ProjectId[],
  options?: LoadPageOptions,
): Page | undefined => {
  const id = toId(project, title);
  const state = pageMap.get(id);
  const res = state?.value;
  loadPage(title, project, watchList, options);

  return res?.ok ? res.value : undefined;
};

/** 特定のページの更新を購読する */
export const subscribe = (
  title: string,
  project: string,
  listener: Listener<Page>,
) => emitter.on(toId(project, title), listener);

/** 特定のページの更新購読を解除する */
export const unsubscribe = (
  title: string,
  project: string,
  listener: Listener<Page>,
) => emitter.off(toId(project, title), listener);

/** ページデータを取得し、cacheに格納する */
export const loadPage = async (
  title: string,
  project: string,
  _watchList: ProjectId[],
  options?: LoadPageOptions,
): Promise<void> => {
  // TODO:あとで実装する
  if (options?.ignoreFetch === true) return;

  const id = toId(project, title);
  const state = pageMap.get(id);
  if (state?.loading === true) return;
  const oldRes = state?.value;

  // 排他ロックをかける
  // これで同時に同じページの更新が走らないようにする
  pageMap.set(id, { loading: true, value: oldRes });

  try {
    // TODO:データ取得処理はもう少し工夫する
    const res = await fetchPage(title, project, {
      fetch: (req) => fetch(req),
    });
    pageMap.set(id, { loading: false, value: res });
    if (!res.ok) return;

    // データが更新されているか調べる
    if (oldRes?.ok === true && !doesUpdate(oldRes.value, res.value)) return;

    emitter.dispatch(id, res.value);
  } catch (e: unknown) {
    // 想定外のエラーはログに出す
    console.error(e);
    // ロック解除
    pageMap.set(id, { loading: false, value: oldRes });
  }
};

/** ページデータが更新されているか判定する
 *
 * タイトル、ページID、更新日時が全て同じなら、更新されてないと判断する
 */
const doesUpdate = (oldPage: Page, newPage: Page) =>
  oldPage.id !== newPage.id || oldPage.title !== newPage.title ||
  oldPage.updated !== newPage.updated;
