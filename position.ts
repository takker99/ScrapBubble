/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

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
  // 表示位置を計算する
  const { top, right, left, bottom } = target.getBoundingClientRect();
  const root = document.body.getBoundingClientRect();
  // linkが画面の右寄りにあったら、bubbleを左側に出す
  const adjustRight = (left - root.left) / root.width > 0.5;

  return {
    top: Math.round(bottom - root.top),
    bottom: Math.round(globalThis.innerHeight - globalThis.scrollY - top),
    ...(adjustRight
      ? { right: Math.round(root.right - right) }
      : { left: Math.round(left - root.left) }),
    maxWidth: adjustRight
      ? right - 10
      : document.documentElement.clientWidth - left - 10,
  };
};
