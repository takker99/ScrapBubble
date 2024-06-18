import { useEffect, useState } from "./deps/preact.tsx";
import { load, subscribe, unsubscribe } from "./bubble.ts";
import { createDebug } from "./debug.ts";
import { ID } from "./id.ts";
import { Bubble } from "./storage.ts";

const logger = createDebug("ScrapBubble:useBubbleData.ts");

/** bubbleデータを取得するhooks
 *
 * @param pageIds 取得するページのID
 * @returns bubble data
 */
export const useBubbleData = (
  pageIds: readonly ID[],
): readonly Bubble[] => {
  const [bubbles, setBubbles] = useState<readonly Bubble[]>(
    makeBubbles(pageIds),
  );

  // データ更新用listenerの登録
  useEffect(() => {
    setBubbles(makeBubbles(pageIds));

    let timer: number | undefined;
    /** ページデータを更新する */
    const updateData = () => {
      // 少し待ってからまとめて更新する
      clearTimeout(timer);
      timer = setTimeout(() => {
        logger.debug(`Update ${pageIds.length} pages`);
        setBubbles(makeBubbles(pageIds));
      }, 10);
    };

    // 更新を購読する
    pageIds.forEach((id) => subscribe(id, updateData));
    return () => pageIds.forEach((id) => unsubscribe(id, updateData));
  }, pageIds);

  // debug用

  return bubbles;
};

const makeBubbles = (pageIds: readonly ID[]): readonly Bubble[] => {
  const bubbles = [...load(pageIds)].flatMap((bubble) =>
    bubble ? [bubble] : []
  );

  // debug用
  logger.debug(
    `Required: ${pageIds.length} pages, ${bubbles.length} found`,
    bubbles,
  );
  return bubbles;
};
