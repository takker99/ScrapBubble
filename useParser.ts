/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

import { useMemo } from "./deps/preact.tsx";
import { parse, ParserOption } from "./deps/scrapbox-parser.ts";

export type Line = { text: string; id: string };
export function useParser(
  lines: Line[] | string[],
  options?: ParserOption,
  deps?: unknown[],
) {
  return useMemo(() => {
    const text = lines.map((line) =>
      typeof line === "string" ? line : line.text
    ).join("\n");
    return parse(text, options);
  }, [lines, options, ...deps ?? []]);
}
