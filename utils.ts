export const toLc = (title: string) => title.toLowerCase().replaceAll(" ", "_");
export const encodeTitle = (title: string) =>
  title.replaceAll(" ", "_").replace(
    /[/?#\{}^|<>]/g,
    (char) => encodeURIComponent(char),
  );

export type PromiseState<T, E> = {
  state: "pending";
  result: undefined;
} | {
  state: "fulfilled";
  result: T;
} | {
  state: "rejected";
  result: E;
};

// deno-lint-ignore no-explicit-any
export function exposeState<T, E = any>(promise: Promise<T>) {
  let state: PromiseState<T, E> = { state: "pending", result: undefined };
  promise
    .then((result) => state = { state: "fulfilled", result })
    .catch((result) => state = { state: "rejected", result });
  return () => state;
}
