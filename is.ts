/** 編集画面のタイトル行のDOMかどうか判定する */
export const isTitle = (
  element: HTMLElement,
): element is HTMLSpanElement =>
  element instanceof HTMLSpanElement &&
  element.matches(".line-title .text");

/** scrapbox内のリンクかどうか判定する */
export const isPageLink = (
  element: HTMLElement,
): element is HTMLAnchorElement =>
  element instanceof HTMLAnchorElement &&
  element.classList.contains("page-link");

/** 指定したtemplate literal stringかどうか判定する */
export const isLiteralStrings = <S extends readonly string[]>(
  value: string | undefined,
  ...literals: S
): value is S[number] => value !== undefined && literals.includes(value);
