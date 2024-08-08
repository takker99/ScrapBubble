import type { ProjectId, UnixTime } from "./deps/scrapbox.ts";
import { listProjects } from "./deps/scrapbox-std.ts";
import { isErr, unwrapOk } from "./deps/option-t.ts";

export const getWatchList = async (): Promise<ProjectId[]> => {
  const value = localStorage.getItem("projectsLastAccessed");
  if (!value) return [];

  try {
    const list = JSON.parse(value) as Record<ProjectId, UnixTime>;
    const ids = Object.entries(list).sort(([, a], [, b]) => b - a).map((
      [projectId],
    ) => projectId);
    const result = await listProjects([]);
    if (isErr(result)) return ids;
    const joinedIds = unwrapOk(result).projects.map((project) => project.id);
    return ids.filter((id) => !joinedIds.includes(id));
  } catch (e: unknown) {
    if (!(e instanceof SyntaxError)) throw e;
    return [];
  }
};
