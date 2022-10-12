import { toTitleLc } from "./deps/scrapbox-std.ts";

export type ID = `/${string}/${string}`;
/** 同一ページか判定するためのIDを作る */
export const toId = (project: string, title: string): ID =>
  `/${project}/${toTitleLc(title)}`;
