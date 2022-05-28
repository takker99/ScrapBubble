/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

import type { ProjectId, UnixTime } from "./deps/scrapbox.ts";

export const getWatchList = (): ProjectId[] => {
  const value = localStorage.getItem("projectsLastAccessed");
  if (!value) return [];
  try {
    const list = JSON.parse(value) as Record<ProjectId, UnixTime>;
    return Object.entries(list).sort(([, a], [, b]) => b - a).map((
      [projectId],
    ) => projectId);
  } catch (e: unknown) {
    if (!(e instanceof SyntaxError)) throw e;
    return [];
  }
};
