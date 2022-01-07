/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { encodeTitle, toLc } from "./utils.ts";
import { isScrapboxError } from "./deps/scrapbox.ts";
import type {
  MemberProject,
  NotFoundError,
  NotLoggedInError,
  NotMemberError,
  NotMemberProject,
  Page,
} from "./deps/scrapbox.ts";

let cache: Cache | undefined;
const cacheName = "ScrapBubble-0.1.0";

/** Options for `getPage()` */
export interface GetPageOption {
  /** cacheの有効期限 */ expired?: number;
  /** use `followRename` */ followRename?: boolean;
}
/** get /api/pages/:projectname/:pagetitle
 *
 * @param project 取得したいページのproject名
 * @param title 取得したいページのtitle 大文字小文字は問わない
 * @param options オプション
 */
export async function getPage(
  project: string,
  title: string,
  options?: GetPageOption,
) {
  const path = `https://scrapbox.io/api/pages/${project}/${
    encodeTitle(toLc(title))
  }?followRename=${options?.followRename ?? true}`;

  const res = await fetch(path, options ?? {});
  if (!res.ok) {
    const error = await res.text();
    if (!isScrapboxError(error)) {
      const unexpected = new Error();
      unexpected.name = "UnexpectedError";
      unexpected.message =
        `Unexpected error has occuerd when fetching "${path}"`;
    }
    return JSON.parse(
      error,
    ) as (NotFoundError | NotLoggedInError | NotMemberError);
  }
  return (await res.json()) as Page;
}

/** get /api/projects/:projectname
 *
 * @param project 取得したいprojectの名前
 * @param options オプション
 */
export async function getProject(
  project: string,
  options?: Omit<GetPageOption, "followRename">,
) {
  const path = `https://scrapbox.io/api/project/${project}`;

  const res = await fetch(path, options ?? {});
  if (!res.ok) {
    const error = await res.text();
    if (!isScrapboxError(error)) {
      const unexpected = new Error();
      unexpected.name = "UnexpectedError";
      unexpected.message =
        `Unexpected error has occuerd when fetching "${path}"`;
    }
    return JSON.parse(
      error,
    ) as (NotFoundError | NotLoggedInError | NotMemberError);
  }
  return (await res.json()) as (NotMemberProject | MemberProject);
}

type FetchOption = {
  /** cacheの有効期限 */ expired?: number;
};
/** cache機能つきfetch */
export async function fetch(path: string, options: FetchOption) {
  const { expired = 60 /* defaultは1分 */ } = options;

  const cachedRes = await globalThis.caches.match(path);
  const cached = new Date(cachedRes?.headers?.get?.("Date") ?? 0).getTime() /
    1000;
  if (!cachedRes || cached + expired < new Date().getTime() / 1000) {
    // 有効期限切れかcacheがなければ、fetchし直す
    const res = await globalThis.fetch(path);
    if (!res.ok) {
      throw {
        status: res.status,
        statusText: res.statusText,
        body: await res.json(),
      };
    }

    cache ??= await globalThis.caches.open(cacheName);
    await cache.put(path, res);
    return res;
  } else {
    // cacheを返す
    return cachedRes;
  }
}
