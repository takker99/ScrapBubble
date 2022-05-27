import { useEffect, useState } from "./deps/preact.tsx";
import { getProject } from "./deps/scrapbox-std.ts";
import { fetch } from "./cache.ts";
import { makeEmitter } from "./eventEmitter.ts";
import { isTheme, Theme } from "./deps/scrapbox.ts";

const defaultTheme = "default-light";
const emitter = makeEmitter<string, Theme>();

const themeMap = new Map<string, Theme>();

export const useTheme = (project: string): Theme => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const theme = themeMap.get(project);

    // 対応するthemeが登録されていないときを未初期化状態とみなす
    if (theme) {
      setTheme(theme);
      emitter.on(project, setTheme);
    } else {
      // 一旦default themeにしてから、projectのtheme情報を取得する
      // 何かしらのthemeを設定しておくことで、fetchが実行されていることを示す
      themeMap.set(project, defaultTheme);
      emitter.on(project, setTheme);
      emitter.dispatch(project, defaultTheme);

      // projectのtheme情報を取得する
      (async () => {
        try {
          const res = await getProject(project, { fetch: (req) => fetch(req) });
          // project情報を取得できなかったときはdefaultのままにする
          if (!res.ok) return;

          const theme = isTheme(res.value.theme)
            ? res.value.theme
            : defaultTheme;
          emitter.dispatch(project, theme);
        } catch (e: unknown) {
          // 想定外のエラーはログに出す
          console.error(e);
        }
      })();
    }
    return () => emitter.off(project, setTheme);
  }, [project]);

  return theme;
};
