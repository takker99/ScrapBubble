import { useCallback, useState } from "./deps/preact.tsx";
import type { LinkType, ScrollTo } from "./types.ts";

export interface BubbleSource {
  /** bubbleの表示位置 */
  position: Position;

  /** bubble元(リンクなど)のproject name */
  project: string;

  /** bubble元(リンクなど)のtilte */
  title: string;

  /** スクロール先
   *
   * リンク先へスクロールする機能を使う場合に設定する
   */
  scrollTo?: ScrollTo;

  /** 発生源の種類 */
  type: LinkType;
}

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
export interface ShowInit {
  position: Position;
  scrollTo?: ScrollTo;
  type: LinkType;
}
export interface UseBubbleResult {
  /** bubbleの発生源のリスト */
  bubbles: BubbleSource[];

  /** 指定した階層のbubble発生源を変更する
   *
   * @param depth 表示したい階層
   * @param [source] bubbleの発生源のデータ。空のときは同階層以降の発生源を消す
   */
  change: (depth: number, source?: BubbleSource) => void;
}
export const useBubbles = (): UseBubbleResult => {
  const [bubbles, setBubbles] = useState<BubbleSource[]>([]);

  const change = useCallback(
    (
      depth: number,
      source?: BubbleSource,
    ) =>
      setBubbles((old) =>
        source ? [...old.slice(0, depth), source] : [...old.slice(0, depth)]
      ),
    [],
  );

  return { bubbles, change };
};
