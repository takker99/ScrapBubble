import { useCallback, useRef } from "./deps/preact.tsx";

const useRefFn = <T extends unknown[], U>() => {
  type Fn = (...args: T) => U;
  const ref = useRef<Fn>();
  const fn = useCallback((...args: T) => {
    ref.current?.(...args);
  }, []);
  const setFn = useCallback((fn: Fn) => ref.current = fn, []);
  return [fn, setFn] as const;
};

export const usePromiseSettledAnytimes = <T, E = unknown>(): readonly [
  () => Promise<T>,
  (args: T) => void,
  (error: E) => void,
] => {
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
};
