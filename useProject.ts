import { useEffect, useState } from "./deps/preact.tsx";
import {
  type FetchError,
  getProject,
  type ProjectError,
} from "./deps/scrapbox-std.ts";
import { cacheFirstFetch } from "./cache.ts";
import { makeEmitter } from "./eventEmitter.ts";
import type { MemberProject, NotMemberProject } from "./deps/scrapbox.ts";
import { createDebug } from "./debug.ts";
import type { Result } from "./deps/option-t.ts";

export type ProjectResult = Result<
  NotMemberProject | MemberProject,
  ProjectError | FetchError
>;
type State<T> = { loading: true } | { loading: false; value: T };
const emitter = makeEmitter<string, ProjectResult>();

const projectMap = new Map<string, State<ProjectResult>>();

const logger = createDebug("ScrapBubble:useProject.ts");

/** /api/projects/:projectの結果を返すhook
 *
 * @param project 情報を取得したいprojectの名前
 * @return projectの情報。未初期化もしくは読み込み中のときは`undefined`を返す
 */
export const useProject = (project: string): ProjectResult | undefined => {
  const [projectResult, setProjectResult] = useState<ProjectResult>();

  useEffect(() => {
    emitter.on(project, setProjectResult);

    const state = projectMap.get(project);
    if (state) {
      setProjectResult(state.loading ? undefined : state.value);
    } else {
      projectMap.set(project, { loading: true });
      setProjectResult(undefined);

      // projectの情報を取得する
      (async () => {
        try {
          const req = getProject.toRequest(project);
          for await (const [, res] of cacheFirstFetch(req)) {
            const result = await getProject.fromResponse(res);
            projectMap.set(project, { loading: false, value: result });
            emitter.dispatch(project, result);
            // networkからcacheを更新する必要はないので、1 loopで処理を終える
            break;
          }
        } catch (e: unknown) {
          // 想定外のエラーはログに出す
          logger.error(e);
          // 未初期化状態に戻す
          projectMap.delete(project);
        }
      })();
    }

    return () => emitter.off(project, setProjectResult);
  }, [project]);

  return projectResult;
};
