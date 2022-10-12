import { useMemo } from "./deps/preact.tsx";
import { useProject } from "./useProject.ts";
import { isTheme, Theme } from "./deps/scrapbox.ts";

const defaultTheme = "default-light";

/** projectのthemeを取得するhook */
export const useTheme = (project: string): Theme => {
  const res = useProject(project);

  return useMemo(() => {
    if (!res || !res.ok) return defaultTheme;
    const theme = res.value.theme;
    return isTheme(theme) ? theme : defaultTheme;
  }, [res]);
};
