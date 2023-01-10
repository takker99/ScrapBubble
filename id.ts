import { toTitleLc } from "./deps/scrapbox-std.ts";

export type ID = `/${string}/${string}`;
/** 同一ページか判定するためのIDを作る */
export const toId = (project: string, title: string): ID =>
  `/${project}/${toTitleLc(title)}`;

/** IDからリンク情報を復元する */
export const fromId = (id: ID): { project: string; titleLc: string } => {
  const matches = id.match(`/([^\/]+)/(.+)`);
  if (!matches) throw SyntaxError(`"${id}" cannnot match "/([^\/]+)/(.+)"`);
  return {
    project: matches[1],
    titleLc: matches[2],
  };
};
