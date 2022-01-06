import { useCallback, useRef } from "../deps/preact.tsx";

function useRefFn<T extends unknown[], U>() {
  type Fn = (...args: T) => U;
  const ref = useRef<Fn>();
  const fn = useCallback((...args: T) => {
    ref.current?.(...args);
  }, []);
  const setFn = useCallback((fn: Fn) => ref.current = fn, []);
  return [fn, setFn] as const;
}

export function usePromiseSettledAnytimes<T, E = unknown>() {
  const [resolve, setResolve] = useRefFn<[T], void>();
  const [reject, setReject] = useRefFn<[E], void>();

  const waitForSettled = useCallback(() =>
    new Promise<T>(
      (res, rej) => {
        setResolve(res);
        setReject(rej);
      },
    ), []);

  return [waitForSettled, resolve, reject] as const;
}
