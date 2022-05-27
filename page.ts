import {
  encodeTitleURI,
  Result,
  tryToErrorLike,
  UnexpectedResponseError,
} from "./deps/scrapbox-std.ts";
import { findCache, isExpiredResponse, putCache } from "./cache.ts";
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
  /** cacheの有効期限 */
  expired?: number;
}

/** /api/projects/:projectの結果を取得する
 *
 * @param title 取得したいページのタイトル
 * @return pageの情報。未初期化もしくは読み込み中のときは`undefined`を返す
 */
export const getPage = (
  title: string,
  project: string,
  watchList: ProjectId[],
  options?: LoadPageOptions,
): PageResult | undefined => {
  const id = toId(project, title);
  const state = pageMap.get(id);
  loadPage(title, project, watchList, options);

  return state?.value;
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
  watchList: ProjectId[],
  options?: LoadPageOptions,
): Promise<void> => {
  const id = toId(project, title);
  const state = pageMap.get(id);
  if (state?.loading === true) return;
  let oldResult = state?.value;

  // 排他ロックをかける
  // これで同時に同じページの更新が走らないようにする
  pageMap.set(id, { loading: true, value: oldResult });

  try {
    const req = makeRequest(project, title, { followRename: true, watchList });

    // 1. cacheから取得する
    const cachedRes = await findCache(req);
    if (cachedRes) {
      const result = await formatResponse(req, cachedRes);

      // 更新があればeventを発行する
      if (
        result.ok && (!oldResult?.ok ||
          doesUpdate(oldResult.value, result.value))
      ) {
        pageMap.set(id, { loading: true, value: result });
        emitter.dispatch(id, result.value);
        oldResult = result;
      }
    }

    // 2. 有効期限が切れているなら、新しくデータをnetworkから取ってくる
    if (options?.ignoreFetch === true) return;
    if (
      cachedRes && !isExpiredResponse(cachedRes, options?.expired ?? 60)
    ) {
      return;
    }

    const res = await fetch(req);
    const result = await formatResponse(req, res.clone());
    // エラーか空ページなら、自前のcacheに保存しておく
    if (!result.ok || !result.value.persistent) {
      await putCache(req, res);
    }
    // ロック解除
    pageMap.set(id, { loading: false, value: result });

    // 更新があればeventを発行する
    if (
      result.ok && (!oldResult?.ok ||
        doesUpdate(oldResult.value, result.value))
    ) {
      emitter.dispatch(id, result.value);
    }
  } catch (e: unknown) {
    // 想定外のエラーはログに出す
    console.error(e);
  } finally {
    // ロック解除
    const result = pageMap.get(id);
    pageMap.set(id, { loading: false, value: result?.value });
  }
};

/** ページデータが更新されているか判定する
 *
 * 空ページの場合はlinkedを、中身のあるページはupdatedで判定する
 */
const doesUpdate = (oldPage: Page, newPage: Page) =>
  oldPage.persistent !== newPage.persistent ||
  (oldPage.persistent
    ? oldPage.updated !== newPage.updated
    : oldPage.linked !== newPage.linked);

interface PathOptions {
  followRename?: boolean;
  watchList?: ProjectId[];
}
/** api/pages/:project/:title の要求を組み立てる */
const makeRequest = (project: string, title: string, options?: PathOptions) => {
  const params = new URLSearchParams();
  if (options?.followRename) params.append("followRename", "true");
  options?.watchList?.forEach((id) => params.append("projects", id));

  const path = `https://${location.hostname}/api/pages/${project}/${
    encodeTitleURI(title)
  }?${params.toString()}`;
  return new Request(path);
};

/** api/pages/:project/:titleの結果を型付きJSONに変換する */
const formatResponse = async (
  req: Request,
  res: Response,
): Promise<PageResult> => {
  if (!res.ok) {
    const text = await res.text();
    const value = tryToErrorLike(text);
    if (!value) {
      throw new UnexpectedResponseError({
        path: new URL(req.url),
        ...res,
        body: text,
      });
    }
    return {
      ok: false,
      value: value as
        | NotFoundError
        | NotLoggedInError
        | NotMemberError,
    };
  }
  const value = (await res.json()) as Page;
  return { ok: true, value };
};
