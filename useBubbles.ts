import { useCallback, useEffect, useState } from "./deps/preact.tsx";
import { Position } from "./position.ts";
import { LinkType } from "./types.ts";
import { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

/** bubble data */
export interface Source {
  /** bubble元(リンクなど)のproject name */
  project: string;

  /** bubble元(リンクなど)のtilte */
  title: string;

  /** bubble元(リンクなど)のline ID */
  hash?: string;

  /** スクロール先リンク
   *
   * 内部リンク記法へスクロールするときは、`project`を削る
   */
  linkTo?: {
    project?: string;
    titleLc: string;
  };

  /** 発生源の種類 */
  type: LinkType;

  /** bubbleの表示位置 */
  position: Position;
}

export interface BubbleOperators {
  /** 現在の階層の下に新しいbubbleを出す
   *
   * すでにbubbleされていた場合、それ以降のbubbleを含めて消してから新しいのを出す
   */
  bubble: (source: Source) => void;

  /** 現在の階層より下のbubblesをすべて消す */
  hide: () => void;
}

export interface BubbleSource extends BubbleOperators {
  /** bubble data */
  source: Source;

  /** 親階層のbubblesのページタイトル */
  parentTitles: string[];
}

export const useBubbles = (): [
  BubbleOperators,
  ...BubbleSource[],
] => {
  const [sources, setSources] = useState<Source[]>([]);

  const change = useCallback(
    (
      depth: number,
      source?: Source,
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
    bubble: (source: Source) => change(0, source),
    hide: () => change(0),
  }]);

  // 操作函数や他のbubbleデータから計算される値を追加する
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
          bubble: (source: Source) => change(i + 1, source),
          hide: () => change(i + 1),
        })
      ),
    ]);
  }, [sources]);

  return bubbles;
};
