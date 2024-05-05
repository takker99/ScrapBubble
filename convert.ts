import { toTitleLc } from "./deps/scrapbox-std.ts";
import { Bubble, BubbleStorage } from "./storage.ts";
import { fromId, ID, toId } from "./id.ts";
import { Page, RelatedPage } from "./deps/scrapbox.ts";

/** APIから取得したページデータを、Bubble用に変換する
 *
 * @param titleLc ページのタイトル タイトル変更があると、page.titleから復元できないため、別途指定している
 * @param project ページのproject
 * @param page 変換したいページデータ
 * @return 変換したデータ
 */
export const convert = (
  project: string,
  page: Page,
): BubbleStorage => {
  const storage: BubbleStorage = new Map();

  // pageが参照しているリンクの逆リンクにpageを入れる
  // これにより、2 hop linksのハブとなるcardは、全ての逆リンクが格納されていると保証され、linkedとprojectLinkedはundefinedでなくなる
  const titleLc = toTitleLc(page.title);
  for (const link of page.links) {
    const bubble: Bubble = makeDummy(project, link);
    bubble.linked = [titleLc];
    storage.set(toId(project, link), bubble);
  }
  const pageId = toId(project, titleLc);
  const projectLinksLc = page.projectLinks.map((id) => {
    const link = fromId(id as ID);
    return toId(link.project, link.titleLc);
  });
  // projectLinksおよびprojectLinks1hopにあるページカードの外部リンク記法経由の逆リンクは正確に取得できないので無視する
  // 外部リンク記法経由の逆リンクはpage.titleのみ考慮する

  // ページ本文を入れる
  const pageBubble: Required<Bubble> = {
    ...toBubble(project, page),
    linked: [],
    projectLinked: [],
  };
  storage.set(pageId, pageBubble);

  // 1 hop linksからカードを取り出す
  // 同時に`emptyPageIds`を作る
  const linksLc = page.links.map((link) => toTitleLc(link));
  for (const card of page.relatedPages.links1hop) {
    if (card.linksLc.includes(titleLc)) {
      // 双方向リンク or 逆リンク

      // 逆リンクを作る
      // 重複はありえないので配列でいい
      pageBubble.linked.push(card.titleLc);
    }
    // `page`→`card`→`linkLc`←`page`というリンク関係にあるときは、`card`を`linkLc`の逆リンクとして登録する
    for (
      const linkLc of card.linksLc.filter((linkLc) => linksLc.includes(linkLc))
    ) {
      const cardId = toId(project, linkLc);
      const bubble = storage.get(cardId);
      if (!bubble) throw Error(`storage already must have "${cardId}"`);
      if (!bubble.linked) {
        bubble.linked = [card.titleLc];
        continue;
      }
      bubble.linked.push(card.titleLc);
    }
    // cardを入れる
    const cardId = toId(project, card.titleLc);
    const bubble = toBubble(project, card);
    // external linksでなければ`projectLinked`は存在しない
    const linked = storage.get(cardId)?.linked;
    if (linked) bubble.linked = linked;
    storage.set(cardId, bubble);
  }

  // external linksからカードを取り出す
  for (
    const card of page.relatedPages.projectLinks1hop
  ) {
    const cardId = toId(card.projectName, card.titleLc);
    if (!projectLinksLc.includes(cardId)) {
      // 逆リンク
      // 双方向リンクは順リンクと判別がつかないのでやめる

      // 逆リンクを作る
      pageBubble.projectLinked.push(cardId);
    }
    // cardを入れる
    const bubble = toBubble(card.projectName, card);
    const projectLinked = storage.get(cardId)?.projectLinked;
    if (projectLinked) bubble.projectLinked = projectLinked;
    storage.set(cardId, bubble);
  }
  pageBubble.isLinkedCorrect = true;

  // 2 hop linksからカードを取り出す
  for (const card of page.relatedPages.links2hop) {
    for (const linkLc of card.linksLc) {
      // 逆リンクを作る
      // 重複はありえないので配列でいい
      const cardId = toId(project, linkLc);
      const bubble = storage.get(cardId);
      if (!bubble) throw Error(`storage already must have "${cardId}"`);
      if (!bubble.linked) {
        bubble.linked = [card.titleLc];
        continue;
      }
      bubble.linked.push(card.titleLc);
    }
    // cardを入れる
    const cardId = toId(project, card.titleLc);
    const bubble = toBubble(project, card);
    // external linksでなければ`projectLinked`は存在しない
    const linked = storage.get(cardId)?.linked;
    if (linked) bubble.linked = linked;
    storage.set(cardId, bubble);
  }

  return storage;
};

/** 関連ページやページ本文の情報をBubbleに変換する
 *
 * @param project 与えたデータのproject name
 * @param page bubbleに変換したいデータ
 * @param checked データを確認した日時
 * @return 変換後のデータ
 */
const toBubble = (
  project: string,
  page:
    | Page
    | Omit<
      RelatedPage,
      | "linksLc"
      | "pageRank"
      | "created"
      | "infoboxResult"
      | "infoboxDisableLinks"
    >,
): Bubble => ({
  project,
  titleLc: "titleLc" in page ? page.titleLc : toTitleLc(page.title),
  // 関連ページの場合は、関連ページが存在する時点で中身があるので、常に`true`とする
  exists: "persistent" in page ? page.persistent : true,
  descriptions: page.descriptions,
  image: page.image,
  lines: "lines" in page
    ? page.lines
    // descriptionsからでっち上げる
    : [page.title, ...page.descriptions].map((text) => ({
      text,
      id: "dummy",
      userId: "dummy",
      updated: page.updated,
      created: page.updated,
    })),
  updated: page.updated,
  isLinkedCorrect: false,
});

/** ページタイトルだけからBubbleを作る
 *
 * @param project 与えたデータのproject name
 * @param title ページタイトル
 * @param checked データを確認した日時
 * @return 変換後のデータ
 */
const makeDummy = (
  project: string,
  title: string,
): Bubble => ({
  project,
  titleLc: toTitleLc(title),
  exists: false,
  descriptions: [],
  image: null,
  lines: [{
    text: title,
    id: "dummy",
    userId: "dummy",
    updated: 0,
    created: 0,
  }],
  updated: 0,
  isLinkedCorrect: false,
});
