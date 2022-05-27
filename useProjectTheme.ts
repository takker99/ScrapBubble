import { useCallback, useState } from "./deps/preact.tsx";
import { getProject } from "./deps/scrapbox-std.ts";
import { fetch } from "./cache.ts";
import { isTheme } from "./deps/scrapbox.ts";
import type { Scrapbox, Theme } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const defaultTheme = "default-light";
export const useProjectTheme = (): (project: string) => Theme => {
  const [map, setMap] = useState(new Map<string, Theme>());

  const getTheme = useCallback((project: string) => {
    // 自分のプロジェクトのテーマは、<html>の data-project-theme属性から取得する
    if (project === scrapbox.Project.name) {
      const theme = document.documentElement.dataset.projectTheme ??
        defaultTheme;
      return isTheme(theme) ? theme : defaultTheme;
    }

    // 未取得のprojectなら新規取得処理を行う
    if (!map.has(project)) {
      // 先にdefault themeを設定し、projectの情報を取得でき次第変更する
      setMap((oldMap) => {
        oldMap.set(project, defaultTheme);
        return oldMap;
      });

      // projectのtheme情報を取得する
      (async () => {
        try {
          const res = await getProject(project, { fetch: (req) => fetch(req) });
          // project情報を取得できなかったときはdefaultのままにする
          if (!res.ok) return;

          setMap((oldMap) => {
            oldMap.set(
              project,
              isTheme(res.value.theme) ? res.value.theme : defaultTheme,
            );
            return oldMap;
          });
        } catch (e: unknown) {
          // 想定外のエラーはログに出す
          console.error(e);
        }
      })();
    }
    return map.get(project) ?? defaultTheme;
  }, [map]);

  return getTheme;
};
