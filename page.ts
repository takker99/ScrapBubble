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
import { logger } from "./debug.ts";

const emitter = makeEmitter<ID, PageResult>();

export type PageResult = Result<
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
 * @param title 取得したいページのproject name
 * @return pageの情報。未初期化もしくは読み込み中のときは`undefined`を返す
 */
export const getPage = (
  title: string,
  project: string,
): PageResult | undefined => {
  const id = toId(project, title);
  return pageMap.get(id)?.value;
};

/** 特定のページの更新を購読する */
export const subscribe = (
  title: string,
  project: string,
  listener: Listener<PageResult>,
) => emitter.on(toId(project, title), listener);

/** 特定のページの更新購読を解除する */
export const unsubscribe = (
  title: string,
  project: string,
  listener: Listener<PageResult>,
) => emitter.off(toId(project, title), listener);

type TaskArg = [string, ProjectId[], LoadPageOptions | undefined];
const tasks = [] as { project: string; argList: TaskArg[] }[];
let timer: number | undefined;
const interval = 250;

/** ページデータ更新タスクを追加する
 *
 * 追加されたタスクは、同名projectのページから最後に追加された順に`interval`msごとに実行される
 */
const addTask = (project: string, ...args: TaskArg) => {
  const task = tasks.find((task) => task.project === project);
  const argList = task?.argList ?? [];
  if (!task) tasks.push({ project, argList });

  argList.push(args);
  // task runner
  // `interval`msごとに1つずつデータを更新する
  timer ??= setInterval(() => {
    const task = tasks.find((task) => task.argList.length > 0);
    if (!task) {
      clearInterval(timer);
      timer = undefined;
      return;
    }
    updateApiCache(task.project, ...task.argList.pop()!);
  }, interval);
};

/** ページデータを取得し、cacheに格納する
 *
 * cacheは一定間隔ごとに、同じprojectのページから優先して行う
 */
export const loadPage = (
  title: string,
  project: string,
  watchList: ProjectId[],
  options?: LoadPageOptions,
) => {
  const id = toId(project, title);
  const state = pageMap.get(id);
  if (state?.loading === true) return;

  addTask(project, title, watchList, options);
};

let counter = 0;
const updateApiCache = async (
  project: string,
  title: string,
  watchList: ProjectId[],
  options?: LoadPageOptions,
) => {
  const id = toId(project, title);
  const state = pageMap.get(id);
  if (state?.loading === true) return;
  let oldResult = state?.value;

  // 排他ロックをかける
  // これで同時に同じページの更新が走らないようにする
  pageMap.set(id, { loading: true, value: oldResult });
  const i = counter++;

  logger.log(
    `%c[${i}][${oldResult ? "cache loaded" : "cache unloaded"}]Get lock`,
    "color: gray;",
    id,
  );

  try {
    const req = makeRequest(project, title, { followRename: true, watchList });
    const url = new URL(req.url);
    const pureURL = `${url.origin}${url.pathname}`;

    // 1. cacheから取得する
    logger.time(`[${i}]Get cache ${id}`);
    const cachedRes = await findCache(pureURL);
    logger.timeEnd(`[${i}]Get cache ${id}`);
    if (cachedRes) {
      const result = await formatResponse(req, cachedRes);

      // 更新があればeventを発行する
      if (
        !oldResult ||
        (result.ok && (!oldResult.ok ||
          doesUpdate(oldResult.value, result.value)))
      ) {
        pageMap.set(id, { loading: true, value: result });
        logger.time(`[${i}]Dispatch cache ${id}`);
        emitter.dispatch(id, result);
        logger.timeEnd(`[${i}]Dispatch cache ${id}`);
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
    logger.log(
      `%c[${i}]Fetch`,
      "color: gray;",
      id,
    );
    const result = await formatResponse(req, res.clone());
    await putCache(pureURL, res);

    // 更新があればeventを発行する
    if (
      !oldResult ||
      (result.ok && (!oldResult.ok ||
        doesUpdate(oldResult.value, result.value)))
    ) {
      pageMap.set(id, { loading: false, value: result });
      logger.time(`[${i}]Dispatch fetch ${id}`);
      emitter.dispatch(id, result);
      logger.timeEnd(`[${i}]Dispatch fetch ${id}`);
    }
  } catch (e: unknown) {
    // 想定外のエラーはログに出す
    console.error(e);
  } finally {
    // ロック解除
    const result = pageMap.get(id);
    pageMap.set(id, { loading: false, value: result?.value });
    logger.log(
      `%c[${i}]Unlock`,
      "color: gray;",
      id,
    );
    counter--;
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
