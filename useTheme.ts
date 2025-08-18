import { useMemo } from "./deps/preact.tsx";
import { useProject } from "./useProject.ts";
import { isTheme, type Theme } from "./deps/scrapbox.ts";
import { isErr, unwrapOk } from "./deps/option-t.ts";

const defaultTheme = "default-light";

/** projectのthemeを取得するhook */
export const useTheme = (project: string): Theme => {
  const res = useProject(project);

  return useMemo(() => {
    if (!res || isErr(res)) return defaultTheme;
    const theme = unwrapOk(res).theme;
    return isTheme(theme) ? theme : defaultTheme;
  }, [res]);
};
