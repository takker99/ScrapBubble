let debugMode = false;
/** cache周りのdebug出力の有効・無効の切り替えを行う
 *
 * defaultで`false`
 */
export const setDebugMode = (enable: boolean): void => {
  debugMode = enable;
};

/** debug modeのときだけ有効なconsole */
export const logger = Object.fromEntries([...Object.entries(console)].map(
  ([key, value]: [string, unknown]) => {
    if (typeof value !== "function") return [key, value];
    // deno-lint-ignore no-explicit-any
    return [key, (...args: any) => {
      if (!debugMode) return;
      value(...args);
    }];
  },
)) as unknown as Console;
