import { useCallback, useEffect, useState } from "./deps/preact.tsx";
import { Position } from "./position.ts";
import type { LinkType, ScrollTo } from "./types.ts";
import { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

/** bubble data */
export interface BubbleData {
  /** bubble元(リンクなど)のproject name */
  project: string;

  /** bubble元(リンクなど)のtilte */
  title: string;

  /** 発生源の種類 */
  type: LinkType;

  /** スクロール先
   *
   * リンク先へスクロールする機能を使う場合に設定する
   */
  scrollTo?: ScrollTo;

  /** bubbleの表示位置 */
  position: Position;
}

export interface BubbleOperators {
  /** 現在の階層の下に新しいbubbleを出す
   *
   * すでにbubbleされていた場合、それ以降のbubbleを含めて消してから新しいのを出す
   */
  bubble: (source: BubbleData) => void;

  /** 現在の階層より下のbubblesをすべて消す */
  hide: () => void;
}

export interface BubbleSource extends BubbleOperators {
  /** bubble data */
  source: BubbleData;

  /** 親階層のbubblesのページタイトル */
  parentTitles: string[];
}

export const useBubbles = (): [
  BubbleOperators,
  ...BubbleSource[],
] => {
  const [sources, setSources] = useState<BubbleData[]>([]);

  const change = useCallback(
    (
      depth: number,
      source?: BubbleData,
    ) =>
      setSources((old) =>
        source ? [...old.slice(0, depth), source] : [...old.slice(0, depth)]
      ),
    [],
  );

  const [bubbles, setBubbles] = useState<[
    BubbleOperators,
    ...BubbleSource[],
  ]>([{
    bubble: (source: BubbleData) => change(0, source),
    hide: () => change(0),
  }]);

  useEffect(() => {
    // 更新されたbubble以外は、objectの参照を壊さずにそのまま返す
    setBubbles((
      [first, ...prev],
    ) => [
      first,
      ...sources.map((source, i) =>
        source === prev.at(i)?.source ? prev.at(i)! : ({
          source,
          parentTitles: [
            scrapbox.Page.title ?? "",
            ...sources.slice(0, i).map((source) => source.title),
          ],
          bubble: (source: BubbleData) => change(i + 1, source),
          hide: () => change(i + 1),
        })
      ),
    ]);
  }, [sources]);

  return bubbles;
};
