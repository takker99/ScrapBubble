export type {
  MemberProject,
  NotFoundError,
  NotLoggedInError,
  NotMemberError,
  NotMemberProject,
  Page,
  RelatedPage,
} from "https://raw.githubusercontent.com/scrapbox-jp/types/0.3.4/rest.ts";
export type { Scrapbox } from "https://raw.githubusercontent.com/scrapbox-jp/types/0.3.4/userscript.ts";
import type {
  ErrorLike,
  Page,
} from "https://raw.githubusercontent.com/scrapbox-jp/types/0.3.4/rest.ts";
export type Line = Page["lines"][0];

// cf. https://blog.uhy.ooo/entry/2021-04-09/typescript-is-any-as/#%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E5%AE%9A%E7%BE%A9%E5%9E%8B%E3%82%AC%E3%83%BC%E3%83%89%E3%81%AE%E5%BC%95%E6%95%B0%E3%81%AE%E5%9E%8B%E3%82%92%E3%81%A9%E3%81%86%E3%81%99%E3%82%8B%E3%81%8B
function isNotNullish(data: unknown): data is Record<string, unknown> {
  return data != null;
}
export function isScrapboxError(e: unknown): e is ErrorLike {
  try {
    const json = typeof e === "string" ? JSON.parse(e) : e;
    if (!isNotNullish(json)) return false;
    return typeof json.name === "string" && typeof json.message === "string";
  } catch (e2: unknown) {
    if (e2 instanceof SyntaxError) return false;
    throw e2;
  }
}

import { MakeTuple } from "../type-traits.ts";
const defaults = [
  "default-light",
  "default-dark",
  "default-minimal",
] as const;
const papers = [
  "paper-light",
  "paper-dark-dark",
  "paper-dark",
] as const;
const stationaries = [
  "blue",
  "purple",
  "green",
  "orange",
  "red",
] as const;
const hackers = [
  "hacker1",
  "hacker2",
] as const;
const seasons = [
  "winter",
  "spring",
  "summer",
  "automn",
] as const;
const tropicals = [
  "tropical",
] as const;
const cities = [
  "kyoto",
  "newyork",
  "paris",
] as const;
const games = [
  "mred",
  "lgreen",
] as const;
const lightThemes = [
  "default-light",
  "default-minimal",
  "paper-light",
  ...stationaries,
  ...seasons,
  ...tropicals,
  ...cities,
  ...games,
] as const;
export type LightTheme = typeof lightThemes[number];
export function isLightTheme(theme: string): theme is LightTheme {
  return (lightThemes as MakeTuple<string, 18>).includes(theme);
}
const darkThemes = [
  "default-dark",
  "paper-dark-dark",
] as const;
export type DarkTheme = typeof darkThemes[number];
export function isDarkTheme(theme: string): theme is DarkTheme {
  return (darkThemes as MakeTuple<string, 2>).includes(theme);
}
const themes = [
  ...defaults,
  ...papers,
  ...stationaries,
  ...hackers,
  ...seasons,
  ...tropicals,
  ...cities,
  ...games,
] as const;
export type Theme = typeof themes[number];
export function isTheme(theme: string): theme is Theme {
  return (themes as MakeTuple<string, 23>).includes(theme);
}
