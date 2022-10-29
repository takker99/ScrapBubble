import {
  encodeTitleURI,
  Result,
  tryToErrorLike,
  UnexpectedResponseError,
} from "./deps/scrapbox-std.ts";
import {
  NotFoundError,
  NotLoggedInError,
  NotMemberError,
  Page,
  ProjectId,
} from "./deps/scrapbox.ts";

export interface PathOptions {
  followRename?: boolean;
  watchList?: ProjectId[];
}
export type PageResult = Result<
  Page,
  NotFoundError | NotLoggedInError | NotMemberError
>;

/** api/pages/:project/:title の要求を組み立てる */
export const toRequest = (
  project: string,
  title: string,
  options?: PathOptions,
) => {
  const params = new URLSearchParams();
  if (options?.followRename) params.append("followRename", "true");
  options?.watchList?.forEach((id) => params.append("projects", id));

  const path = `https://${location.hostname}/api/pages/${project}/${
    encodeTitleURI(title)
  }?${params.toString()}`;
  return new Request(path);
};

/** api/pages/:project/:titleの結果を型付きJSONに変換する */
export const fromResponse = async (
  res: Response,
): Promise<PageResult> => {
  if (!res.ok) {
    const text = await res.text();
    const value = tryToErrorLike(text);
    if (!value) {
      throw new UnexpectedResponseError({
        path: new URL(res.url),
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
