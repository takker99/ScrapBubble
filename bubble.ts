import { fromResponse, toRequest } from "./page-api.ts";
import { findCache, isExpiredResponse, putCache } from "./cache.ts";
import { ID, toId } from "./id.ts";
import { Listener, makeEmitter } from "./eventEmitter.ts";
import { logger } from "./debug.ts";
import { toTitleLc } from "./deps/scrapbox-std.ts";
import { Line, Page as RawPage, ProjectId, StringLc } from "./deps/scrapbox.ts";

export interface Page {
  title: string;
  updated: number;
  exists: boolean;
  lines: Line[];
}
export type Card = InternalCard | ExternalCard;

export interface InternalCard extends BaseCard {
  /** project内リンクを表す */
  type: "internal";
}
export interface ExternalCard extends BaseCard {
  /** external linksを表す */
  type: "external";
  projectName: string;
}
export interface BaseCard {
  title: string;
  image: string | null;
  descriptions: string[];
  // 並び替えに使う情報
  updated: number;
  linked: number;
}

export interface Bubble {
  cards: (Omit<Card, "projectName"> & { project: string })[];
  pages: (Page & { project: string })[];
}

type State<T> = { loading: boolean; value?: T };
interface BubbleSchema {
  cards: Card[];
  page: Page;
  updated: number;
}

/** projectとtitleLcのペアをキーに、特定のページごとにデータを持つ */
const bubbleMap = new Map<ID, State<BubbleSchema>>();
const emitter = makeEmitter<ID, BubbleSchema>();

/** 特定のタイトルのbubble dataを読み込む
 *
 * データの更新は行わない
 *
 * @param title 取得したいページのタイトル
 * @return pageの情報。未初期化のときは`undefined`を返す
 */
export const load = (
  title: string,
  projects: string[],
): Bubble | undefined => {
  const bubbles = projects.flatMap((project) => {
    const bubble = bubbleMap.get(toId(project, title));
    return bubble?.value ? [[project, bubble.value]] as const : [];
  });
  // どのデータの未初期化のときのみ、未初期化と判定する
  if (bubbles.length === 0) return;

  return {
    pages: bubbles.flatMap(([project, bubble]) =>
      bubble.page.exists ? [{ project, ...bubble.page }] : []
    ),
    cards: bubbles.flatMap((
      [project, bubble],
    ) =>
      bubble.cards.map((card) =>
        card.type === "internal"
          ? { project, ...card }
          : { project: card.projectName, ...card }
      )
    ),
  };
};

/** 特定のページの更新を購読する */
export const subscribe = (
  title: string,
  project: string,
  listener: Listener<BubbleSchema>,
) => emitter.on(toId(title, project), listener);

/** 特定のページの更新購読を解除する */
export const unsubscribe = (
  title: string,
  project: string,
  listener: Listener<BubbleSchema>,
) => emitter.off(toId(title, project), listener);

export interface PrefetchOptions {
  /** networkからデータを取得しないときは`true`を渡す*/
  ignoreFetch?: boolean;
  /** cacheの有効期限 */
  expired?: number;
}

/** ページデータを取得し、cacheに格納する
 *
 * cacheは一定間隔ごとに更新される
 */
export const prefetch = (
  title: string,
  projects: string[],
  watchList: ProjectId[],
  options?: PrefetchOptions,
) => {
  for (const project of projects) {
    const id = toId(project, title);
    const state = bubbleMap.get(id);
    if (state?.loading === true) continue;
    addTask(project, title, watchList, options);
  }
};

type TaskArg = [string, ProjectId[], PrefetchOptions | undefined];
const tasks = new Map<string, TaskArg[]>();
let timer: number | undefined;
const interval = 250;

/** ページデータ更新タスクを追加する
 *
 * 追加されたタスクは、同名projectのページから最後に追加された順に`interval`msごとに実行される
 */
const addTask = (project: string, ...args: TaskArg) => {
  // タスクの追加
  tasks.set(project, [...tasks.get(project) ?? [], args]);

  // task runner
  // `interval`msごとに1つずつデータを更新する
  timer ??= setInterval(() => {
    const task = [...tasks.entries()].find(([, argList]) => argList.length > 0);
    if (!task) {
      clearInterval(timer);
      timer = undefined;
      return;
    }
    updateApiCache(task[0], ...task[1].pop()!);
  }, interval);
};

/** debug用カウンタ */
let counter = 0;
/** cacheおよびnetworkから新しいページデータを取得する
 *
 * もし更新があれば、更新通知も発行する
 */
const updateApiCache = async (
  project: string,
  title: string,
  watchList: ProjectId[],
  options?: PrefetchOptions,
) => {
  const id = toId(project, title);
  const state = bubbleMap.get(id);
  if (state?.loading === true) return;
  let oldResult = state?.value;

  // 排他ロックをかける
  // これで同時に同じページの更新が走らないようにする
  bubbleMap.set(id, { loading: true, value: oldResult });
  const i = counter++;

  logger.time(`[${i}] Check update ${id}`);
  try {
    const req = toRequest(project, title, { followRename: true, watchList });
    const url = new URL(req.url);
    const pureURL = `${url.origin}${url.pathname}`;

    // 1. cacheから取得する
    const cachedRes = await findCache(pureURL);
    if (cachedRes) {
      const result = await fromResponse(cachedRes);

      // 更新があればeventを発行する
      if (
        result.ok && (!oldResult || doesUpdate(oldResult, result.value))
      ) {
        const [page, cards, cards2hop] = convert(
          toTitleLc(title),
          result.value,
        );
        const newBubble = { page, cards, updated: page.updated };
        bubbleMap.set(id, { loading: true, value: newBubble });
        apply2HopCards(project, cards2hop, page.updated);

        emitter.dispatch(id, newBubble);
        oldResult = newBubble;
      }
    }

    // 2. 有効期限が切れているなら、新しくデータをnetworkから取ってくる
    if (options?.ignoreFetch === true) return;
    if (
      cachedRes && !isExpiredResponse(cachedRes, options?.expired ?? 60)
    ) {
      return;
    }

    const res = await fetch(req);
    logger.debug(`%c[${i}]Fetch`, "color: gray;", id);
    const result = await fromResponse(res.clone());
    await putCache(pureURL, res);

    // 更新があればeventを発行する
    if (
      result.ok && (!oldResult || doesUpdate(oldResult, result.value))
    ) {
      const [page, cards, cards2hop] = convert(toTitleLc(title), result.value);
      const newBubble = { page, cards, updated: page.updated };
      bubbleMap.set(id, { loading: true, value: newBubble });
      apply2HopCards(project, cards2hop, page.updated);

      emitter.dispatch(id, newBubble);
    }
  } catch (e: unknown) {
    // 想定外のエラーはログに出す
    console.error(e);
  } finally {
    // ロック解除
    const result = bubbleMap.get(id);
    bubbleMap.set(id, { loading: false, value: result?.value });
    logger.timeEnd(`[${i}] Check update ${id}`);
    counter--;
  }
};

const apply2HopCards = (
  project: string,
  cards2hop: Map<StringLc, Card[]>,
  updated: number,
) => {
  // 2 hop linksから得られた情報を反映する
  // これは排他処理しなくてもいい
  for (const [linkLc, cards] of cards2hop.entries()) {
    const id = toId(project, linkLc);
    const {
      loading = false,
      value: bubble2 = {
        page: {
          title: linkLc,
          updated: 0,
          exists: false,
          lines: [],
        },
        cards,
        updated,
      },
    } = bubbleMap.get(id) ?? {};
    if (loading) continue;
    if (bubble2.updated > updated) continue;
    bubble2.cards = cards;
    bubble2.updated = updated;
    bubbleMap.set(id, { loading: false, value: bubble2 });
    emitter.dispatch(id, bubble2);
  }
};

/** ページデータが更新されているか判定する
 *
 * 空ページの場合は、逆リンクの個数で簡易的に判定する
 */
const doesUpdate = (schema: BubbleSchema, newPage: RawPage) =>
  schema.page.exists !== newPage.persistent ||
  (schema.page.exists
    ? schema.page.updated <= newPage.updated
    : schema.cards.length !== newPage.linked);

/** APIから取得したページデータを、Bubble用に変換する
 *
 * @param titleLc ページのタイトル タイトル変更があると、page.titleから復元できないため、別途指定している
 * @param page 変換したいページデータ
 * @return 変換したデータ (1列目：ページデータ、2列目：titleLcの1 hop links、3列目：他のページの1 hop links)
 */
const convert = (
  titleLc: string,
  page: RawPage,
): [Page, Card[], Map<StringLc, Card[]>] => {
  const projectLinksLc = page.projectLinks.map((link) => toTitleLc(link));

  const cards = [
    // 1 hop linksのうち、titleにリンクしているページのみ抽出する
    ...page.relatedPages.links1hop.flatMap((card) =>
      card.linksLc.includes(titleLc)
        ? [{ type: "internal", ...card } as Card]
        : []
    ),
    // external linksのうち、順リンクがないもののみ抽出する
    // 逆リンクがあるものも除かれてしまうが、判定方法がないので断念する
    ...page.relatedPages.projectLinks1hop.flatMap((card) =>
      projectLinksLc.includes(toTitleLc(`/${card.projectName}/${card.title}`))
        ? []
        : [{ type: "external", ...card } as Card]
    ),
  ];

  // 2 hop linksから他のページの1 hop linksを取り出す
  // project nameは`project`と同一
  const links2hopMap = new Map<StringLc, Card[]>();
  for (const card of page.relatedPages.links2hop) {
    for (const linkLc of card.linksLc) {
      links2hopMap.set(linkLc, [
        ...(links2hopMap.get(linkLc) ?? []),
        { type: "internal", ...card },
      ]);
    }
  }

  return [
    {
      title: page.title,
      lines: page.lines,
      exists: page.persistent,
      updated: page.updated,
    },
    cards,
    links2hopMap,
  ];
};
