import { useLayoutEffect, useState } from "./deps/preact.tsx";
import { Bubble, load, subscribe, unsubscribe } from "./bubble.ts";

/** bubbleデータを取得するhooks
 *
 * @param title 取得したいbubbleのタイトル
 * @param projects 取得先projectのリスト
 * @return bubble
 */
export const useBubbleData = (
  title: string,
  projects: string[],
): Bubble => {
  const [bubble, setBubble] = useState<Bubble>({ pages: [], cards: [] });

  useLayoutEffect(() => {
    // データの初期化
    setBubble(load(title, projects) ?? { pages: [], cards: [] });

    // データ更新用listenerの登録
    let timer: number | undefined;
    /** ページデータを更新する */
    const updateData = () => {
      // 少し待ってからまとめて更新する
      clearTimeout(timer);
      timer = setTimeout(() => {
        setBubble(load(title, projects) ?? { pages: [], cards: [] });
      }, 10);
    };

    // 更新を購読する
    projects.forEach((project) => subscribe(title, project, updateData));
    return () =>
      projects.forEach((project) => unsubscribe(title, project, updateData));
  }, [title, projects]);

  return bubble;
};
