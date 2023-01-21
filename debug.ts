let debugMode: boolean | Set<string> = false;

/** cache周りのdebug出力の有効・無効の切り替えを行う
 *
 * @param mode `true`：全てのdebug出力を有効にする, `false`：全てのdebug出力を無効にする, それ以外：指定したファイル中のdebug出力のみ有効にする
 */
export const setDebugMode = (mode: boolean | Iterable<string>): void => {
  debugMode = typeof mode === "boolean" ? mode : new Set(mode);
};

/** debug modeのときだけ有効なconsoleをファイルごとに作る
 *
 * @param filename コンソール出力を呼び出したファイル名
 */
export const createDebug = (filename: string): Console =>
  Object.fromEntries([...Object.entries(console)].map(
    ([key, value]: [string, unknown]) => {
      if (typeof value !== "function") return [key, value];
      switch (key as keyof Console) {
        case "warn":
        case "error":
          return [
            key,
            (...args: unknown[]) =>
              value(`%c${filename}`, "color: gray", ...args),
          ];
        case "log":
        case "info":
        case "debug":
          return [key, (...args: unknown[]) => {
            if (
              debugMode !== true && (!debugMode || !debugMode.has(filename))
            ) {
              return;
            }
            value(`%c${filename}`, "color: gray", ...args);
          }];
        case "assert":
          return [key, (assertion: boolean, ...args: unknown[]) => {
            if (
              debugMode !== true && (!debugMode || !debugMode.has(filename))
            ) {
              return;
            }
            value(assertion, `%c${filename}`, "color: gray", ...args);
          }];
        case "time":
        case "timeEnd":
          return [key, (label: string) => {
            if (
              debugMode !== true && (!debugMode || !debugMode.has(filename))
            ) {
              return;
            }
            value(`${filename} ${label}`);
          }];
        default:
          return [key, (...args: unknown[]) => {
            if (
              debugMode !== true && (!debugMode || !debugMode.has(filename))
            ) {
              return;
            }
            return value(...args);
          }];
      }
    },
  )) as unknown as Console;
