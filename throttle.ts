export type Fn<T> = () => Promise<T>;

/** 同時に一定数だけPromiseを走らせる函数
 *
 * 最後に追加したjobから実行する
 *
 * @param max 同時に動かすPromiseの最大数
 * @return jobを動かして結果を返す函数
 */
export const makeThrottle = <T>(max: number): (job: Fn<T>) => Promise<T> => {
  const queue: [
    Fn<T>,
    (value: T) => void,
    (error: unknown) => void,
  ][] = [];
  const pendings = new Set<Promise<unknown>>();

  const runNext = (prev: Promise<unknown>) => {
    pendings.delete(prev);
    const task = queue.pop();
    if (!task) return;
    const promise = task[0]()
      .then((result) => task[1](result))
      .catch((error) => task[2](error))
      .finally(() => runNext(promise));
    pendings.add(promise);
  };

  return (job) => {
    if (pendings.size < max) {
      const promise = job().finally(() => runNext(promise));
      pendings.add(promise);
      return promise;
    }
    return new Promise((resolve, reject) => {
      queue.push([job, resolve, reject]);
    });
  };
};
