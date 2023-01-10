import { useLayoutEffect, useState } from "./deps/preact.tsx";
import { load, subscribe, unsubscribe } from "./bubble.ts";
import { logger } from "./debug.ts";
import { ID } from "./id.ts";
import { Bubble } from "./storage.ts";

/** bubbleデータを取得するhooks
 *
 * @param title 取得したいbubbleのタイトル
 * @param projects 取得先projectのリスト
 * @return bubble
 */
export const useBubbleData = (
  pageIds: readonly ID[],
): readonly Bubble[] => {
  const [bubbles, setBubbles] = useState<readonly Bubble[]>([]);

  useLayoutEffect(() => {
    // データの初期化
    setBubbles([...load(pageIds)].flatMap((bubble) => bubble ? [bubble] : []));

    // データ更新用listenerの登録
    let timer: number | undefined;
    /** ページデータを更新する */
    const updateData = () => {
      // 少し待ってからまとめて更新する
      clearTimeout(timer);
      timer = setTimeout(() => {
        logger.debug(
          `%cUpdate ${pageIds.length} pages`,
          "color: gray;",
        );
        setBubbles(
          [...load(pageIds)].flatMap((bubble) => bubble ? [bubble] : []),
        );
      }, 10);
    };

    // 更新を購読する
    pageIds.forEach((id) => subscribe(id, updateData));
    return () => pageIds.forEach((id) => unsubscribe(id, updateData));
  }, pageIds);

  return bubbles;
};
