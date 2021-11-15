import { useCallback, useState } from "../deps/preact.tsx";
import {
  isTheme,
  NotMemberProject,
  scrapbox,
  Theme,
} from "../deps/scrapbox.ts";

const defaultTheme = "default-light";
export function useProjectTheme() {
  const [map, setMap] = useState(new Map<string, Theme>());

  const getTheme = useCallback((project: string) => {
    if (project === scrapbox.Project.name) {
      const theme = document.documentElement.dataset.projectTheme ??
        defaultTheme;
      return isTheme(theme) ? theme : defaultTheme;
    }
    if (!map.has(project)) {
      // projectのtheme情報を取得する
      (async () => {
        try {
          const res = await fetch(
            `https://scrapbox.io/api/projects/${project}`,
          );
          const { theme }: NotMemberProject = await res.json();
          setMap((oldMap) => {
            oldMap.set(project, isTheme(theme) ? theme : defaultTheme);
            return oldMap;
          });
        } catch (_e) {
          // errorを握りつぶす。ちょっとまずいかも
        }
      })();
    }
    return map.get(project) ?? defaultTheme;
  }, [map]);

  return getTheme;
}
