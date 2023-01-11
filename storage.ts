import { Line, StringLc } from "./deps/scrapbox.ts";
import { ID } from "./id.ts";

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

  /** ページの更新状況を最後に確認した日時 */
  checked: number;

  /** 内部リンク記法による逆リンクのリスト
   *
   * 未計算のときは`undefined`になる
   */
  linked?: StringLc[];

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
    if (linked > 1) return true;
  }
  return linked > 1;
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
): Bubble => {
  if (!prev) return current;
  if (prev.updated < current.updated) {
    // 更新日時が新しければ、そちらを採用する
    // linked, projectLinked, linesのみ別途判定する
    const { lines, ...rest } = current;
    const bubble: Bubble = {
      ...rest,
      lines: isDummy(current) ? prev.lines : lines,
    };
    if (prev.linked) bubble.linked ??= prev.linked;
    if (prev.projectLinked) bubble.projectLinked ??= prev.projectLinked;

    return bubble;
  }

  // `updated`が変化していない場合、変更されている可能性のあるpropertiesは
  // - `lines`
  // - `linked`
  // - `projectLinked`
  // - `checked`
  // に限られる
  let hasChange = false;
  const bubble = { ...prev };

  // 本物の本文がやってきたら、そちらを採用する
  if (isDummy(bubble) && !isDummy(current)) {
    bubble.lines = current.lines;
    hasChange = true;
  }
  if (
    current.linked &&
    // まずリンク数で大雑把に比較し、長さが変わらなければ一つづつ比較して更新の有無を調べる
    (bubble.linked?.length !== current.linked?.length ||
      bubble.linked?.some?.((linkLc, i) => linkLc !== current.linked?.[i]))
  ) {
    bubble.linked = current.linked;
    hasChange = true;
  }
  if (
    current.projectLinked &&
    // まずリンク数で大雑把に比較し、長さが変わらなければ一つづつ比較して更新の有無を調べる
    (bubble.projectLinked?.length !== current.projectLinked?.length ||
      bubble.projectLinked?.some?.((linkLc, i) =>
        linkLc !== current.projectLinked?.[i]
      ))
  ) {
    bubble.projectLinked = current.projectLinked;
    hasChange = true;
  }

  // データ確認日時のみの変更は、object参照を維持する
  if (bubble.checked !== current.checked) {
    const checked = Math.max(bubble.checked, current.checked);
    if (!hasChange) {
      prev.checked = checked;
      return prev;
    }
    bubble.checked = checked;
    hasChange = true;
  }

  return hasChange ? bubble : prev;
};

/** linesがdescriptionからでっち上げられたデータかどうか判定する */
const isDummy = (bubble: Bubble): boolean => bubble.lines[0].id === "dummy";
