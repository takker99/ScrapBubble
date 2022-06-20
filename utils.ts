import { toTitleLc } from "./deps/scrapbox-std.ts";

export type PromiseState<T, E> = {
  state: "pending";
  result: undefined;
} | {
  state: "fulfilled";
  result: T;
} | {
  state: "rejected";
  result: E;
};

export const exposeState = <T, E = unknown>(promise: Promise<T>) => {
  let state: PromiseState<T, E> = { state: "pending", result: undefined };
  promise
    .then((result) => state = { state: "fulfilled", result })
    .catch((result) => state = { state: "rejected", result });
  return () => state;
};

export type ID = `/${string}/${string}`;
/** 同一ページか判定するためのIDを作る */
export const toId = (project: string, title: string): ID =>
  `/${project}/${toTitleLc(title)}`;

/** URL文字列をURLに変換する*/
export const detectURL = (text: URL | string): URL | string => {
  if (text instanceof URL) return text;
  try {
    const url = new URL(text);
    return url;
  } catch (e: unknown) {
    if (e instanceof TypeError) return text;
    throw e;
  }
};
