import { useEffect, useState } from "./deps/preact.tsx";
import { getProject, Result } from "./deps/scrapbox-std.ts";
import { fetch } from "./cache.ts";
import { makeEmitter } from "./eventEmitter.ts";
import {
  MemberProject,
  NotFoundError,
  NotLoggedInError,
  NotMemberError,
  NotMemberProject,
} from "./deps/scrapbox.ts";

type ProjectResult = Result<
  | NotMemberProject
  | MemberProject,
  | NotFoundError
  | NotLoggedInError
  | NotMemberError
>;
type State<T> = { loading: true } | { loading: false; value: T };
const emitter = makeEmitter<string, ProjectResult>();

const projectMap = new Map<string, State<ProjectResult>>();

/** /api/projects/:projectの結果を返すhook
 *
 * @param project 情報を取得したいprojectの名前
 * @return projectの情報。未初期化もしくは読み込み中のときは`undefined`を返す
 */
export const useProject = (project: string): ProjectResult | undefined => {
  const [projectResult, setProjectResult] = useState<ProjectResult>();

  useEffect(() => {
    const state = projectMap.get(project);

    if (state) {
      setProjectResult(state.loading ? undefined : state.value);
      emitter.on(project, setProjectResult);
    } else {
      projectMap.set(project, { loading: true });
      emitter.on(project, setProjectResult);
      setProjectResult(undefined);

      // projectの情報を取得する
      (async () => {
        try {
          const res = await getProject(project, { fetch: (req) => fetch(req) });
          projectMap.set(project, { loading: false, value: res });
          emitter.dispatch(project, res);
        } catch (e: unknown) {
          // 想定外のエラーはログに出す
          console.error(e);
        }
      })();
    }

    return () => emitter.off(project, setProjectResult);
  }, [project]);

  return projectResult;
};
