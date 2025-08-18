import type { Line, StringLc } from "./deps/scrapbox.ts";
import type { ID } from "./id.ts";
import { produce } from "./deps/immer.ts";

export interface Bubble {
  /** project name */
  project: string;

  /** page titleLc */
  titleLc: StringLc;

  /** サムネイル */
  image: string | null;

  /** サムネイル本文 */
  descriptions: string[];

  /** ページ本文
   *
   * 1行目にタイトルを入れる
   */
  lines: Line[];

  /** ページが存在すれば`true`*/
  exists: boolean;

  /** ページの更新日時 */
  updated: number;

  /** 内部リンク記法による逆リンクのリスト
   *
   * 未計算のときは`undefined`になる
   */
  linked?: StringLc[];

  /** `linked`が不正確な可能性がある場合は`true` */
  isLinkedCorrect: boolean;

  /** 外部リンク記法による逆リンクのリスト
   *
   * 未計算のときは`undefined`になる
   */
  projectLinked?: ID[];
}

export type BubbleStorage = Map<ID, Bubble>;

/** 指定したリンクが空リンクかどうか判定する */
export const isEmptyLink = (
  bubbles: Iterable<Bubble | undefined>,
): boolean => {
  let linked = 0;
  for (const bubble of bubbles) {
    if (!bubble) continue;

    // 中身があるなら空リンクでない
    if (bubble.exists) return false;

    linked += (bubble.linked?.length ?? 0) +
      (bubble.projectLinked?.length ?? 0);
    // 2つ以上のページから参照されているなら空リンクでない
    if (linked > 1) return false;
  }
  return linked < 2;
};

/** bubbleを更新する
 *
 * update rule
 *
 * - 基本的に、updatedが大きい方を採用する
 * - linesは、更新日時にかかわらずdummyでないほうを採用する
 * - linkedとprojectLinkedは、undefinedでないほうを採用する
 *
 * 更新がなければ以前のobjectをそのまま返し、更新があれば新しいobjectで返す
 */
export const update = (
  prev: Bubble | undefined,
  current: Readonly<Bubble>,
): Bubble | undefined =>
  produce<Bubble | undefined>(prev, (draft) => {
    if (!draft) return current;

    if (draft.updated < current.updated) {
      // 更新日時が新しければ、そちらを採用する
      // linked, projectLinked, linesのみ別途判定する
      const { lines, linked, projectLinked, ...rest } = current;

      Object.assign(draft, rest);
      if (!isDummy(current)) draft.lines = lines;
      if (linked) draft.linked ??= linked;
      if (projectLinked) draft.projectLinked ??= projectLinked;

      return;
    }

    // `updated`が変化していない場合、変更されている可能性のあるpropertiesは
    // - `lines`
    // - `linked`
    // - `projectLinked`
    // に限られる

    // 本物の本文がやってきたら、そちらを採用する
    if (isDummy(draft) && !isDummy(current)) {
      draft.lines = current.lines;
    }
    // linkedは正確に取得したデータを優先する
    if (current.linked) {
      if (current.isLinkedCorrect) {
        draft.linked = current.linked;
      } else if (
        !draft.isLinkedCorrect &&
        (draft.linked?.length ?? 0) <= current.linked.length
      ) {
        draft.linked = current.linked;
      }
    }
    if (current.projectLinked) draft.projectLinked = current.projectLinked;
  });

/** linesがdescriptionからでっち上げられたデータかどうか判定する */
const isDummy = (bubble: Bubble): boolean => bubble.lines[0].id === "dummy";
