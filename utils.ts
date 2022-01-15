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

export function exposeState<T, E = unknown>(promise: Promise<T>) {
  let state: PromiseState<T, E> = { state: "pending", result: undefined };
  promise
    .then((result) => state = { state: "fulfilled", result })
    .catch((result) => state = { state: "rejected", result });
  return () => state;
}

export function isLiteralStrings<S extends readonly string[]>(
  value: string | undefined,
  ...literals: S
): value is S[number] {
  return value !== undefined && literals.includes(value);
}

/** 同一ページか判定するためのIDを作る */
export function toId(project: string, title: string) {
  return `/${project}/${toLc(title)}` as const;
}
