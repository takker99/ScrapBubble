let debugMode = false;
/** cache周りのdebug出力の有効・無効の切り替えを行う
 *
 * defaultで`false`
 */
export const setDebugMode = (enable: boolean): void => {
  debugMode = enable;
};

const tag = "[ScrapBubble]";
/** debug modeのときだけ有効なconsole */
export const logger = Object.fromEntries([...Object.entries(console)].map(
  ([key, value]: [string, unknown]) => {
    if (typeof value !== "function") return [key, value];
    return [key, (arg1: unknown, ...args: unknown[]) => {
      if (!debugMode) return;
      value(typeof arg1 === "string" ? `${tag} ${arg1}` : arg1, ...args);
    }];
  },
)) as unknown as Console;
