/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

import { editor } from "./deps/scrapbox-std-browser.ts";
import { ensureHTMLDivElement } from "./ensure.ts";

export type Position =
  & {
    top: number;
    bottom: number;
    maxWidth: number;
  }
  & ({
    left: number;
  } | {
    right: number;
  });

/** Bubbleの表示位置を計算する
 *
 * @param target このNodeに対してbubbleを表示する
 * @return 表示位置
 */
export const calcBubblePosition = (target: Element): Position => {
  const editorDiv = editor();
  ensureHTMLDivElement(editorDiv, "#editor");

  // 表示位置を計算する
  const { top, right, left, bottom } = target.getBoundingClientRect();
  const root = editorDiv.getBoundingClientRect();
  // linkが画面の右寄りにあったら、bubbleを左側に出す
  const adjustRight = (left - root.left) / root.width > 0.5;

  return {
    top: Math.round(bottom - root.top),
    bottom: Math.round(root.bottom - top),
    ...(adjustRight
      ? { right: Math.round(root.right - right) }
      : { left: Math.round(left - root.left) }),
    maxWidth: adjustRight
      ? right - 10
      : document.documentElement.clientWidth - left - 10,
  };
};
