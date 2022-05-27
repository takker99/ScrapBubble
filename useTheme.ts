import { useEffect, useState } from "./deps/preact.tsx";
import { useProject } from "./useProject.ts";
import { isTheme, Theme } from "./deps/scrapbox.ts";

const defaultTheme = "default-light";

/** projectのthemeを取得するhook */
export const useTheme = (project: string): Theme => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const res = useProject(project);

  useEffect(() => {
    if (!res || !res.ok) {
      setTheme(defaultTheme);
      return;
    }
    const theme = res.value.theme;
    setTheme(isTheme(theme) ? theme : defaultTheme);
  }, [res]);

  return theme;
};
