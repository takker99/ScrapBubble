import { useCallback, useEffect, useState } from "../deps/preact.tsx";
import { NotMemberProject, scrapbox } from "../deps/scrapbox.ts";

const defaultTheme = "default-light";
export function useProjectTheme() {
  const [map, setMap] = useState(new Map<string, string>());

  // projectのtheme情報を取得する
  const loadTheme = useCallback(async (project: string) => {
    if (map.has(project)) return; // cacheの取得は1回だけ
    if (project === scrapbox.Project.name) return;
    setMap((oldMap) => {
      oldMap.set(project, defaultTheme);
      return oldMap;
    });
    try {
      const res = await fetch(`https://scrapbox.io/api/projects/${project}`);
      const { theme }: NotMemberProject = await res.json();
      setMap((oldMap) => {
        oldMap.set(project, theme);
        return oldMap;
      });
    } catch (_e) {
      // errorを握りつぶす。ちょっとまずいかも
    }
  }, [map]);

  const getTheme = useCallback((project: string) => {
    if (project === scrapbox.Project.name) {
      return document.documentElement.dataset.projectTheme;
    }
    return map.get(project) ?? defaultTheme;
  }, [map]);

  return { getTheme, loadTheme };
}
