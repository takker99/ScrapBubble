import { useCallback, useState } from "./deps/preact.tsx";
import { getProject } from "./fetch.ts";
import { isTheme } from "./deps/scrapbox.ts";
import type { Scrapbox, Theme } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const defaultTheme = "default-light";
export const useProjectTheme = () => {
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
          const res = await getProject(project);
          // project情報を取得できなかったときはdefaultのままにする
          if (!("theme" in res)) return;

          setMap((oldMap) => {
            oldMap.set(project, isTheme(res.theme) ? res.theme : defaultTheme);
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
