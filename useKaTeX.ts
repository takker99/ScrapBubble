import { type RefCallback, useCallback, useState } from "./deps/preact.tsx";
import { defaultVersion, importKaTeX, KatexOptions } from "./katex.ts";

export interface ParseError {
  name: string;
  message: string;
  position: number;
}

export interface UseKaTeXResult<T extends HTMLElement> {
  ref: RefCallback<T>;
  error: string;
}

export const useKaTeX = <T extends HTMLElement>(
  formula: string,
  options?: KatexOptions,
): UseKaTeXResult<T> => {
  const [error, setError] = useState<string>("");

  const ref: RefCallback<T> = useCallback(
    (element) => {
      if (!element) return;

      importKaTeX(defaultVersion).then((katex) => {
        try {
          katex.render(formula, element, options);
          setError("");
        } catch (e) {
          if (e instanceof Error && e.name === "ParseError") {
            // remove an unnecessary token
            setError(e.message.slice("KaTeX parse error: ".length));
          } else {
            throw e;
          }
        }
      });
    },
    [formula, ...Object.values(options ?? {})],
  );
  return { ref, error };
};
