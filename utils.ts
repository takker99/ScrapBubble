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

export const exposeState = <T, E = unknown>(promise: Promise<T>) => {
  let state: PromiseState<T, E> = { state: "pending", result: undefined };
  promise
    .then((result) => state = { state: "fulfilled", result })
    .catch((result) => state = { state: "rejected", result });
  return () => state;
};

export const isLiteralStrings = <S extends readonly string[]>(
  value: string | undefined,
  ...literals: S
): value is S[number] => value !== undefined && literals.includes(value);

/** 同一ページか判定するためのIDを作る */
export const toId = (project: string, title: string): `/${string}/${string}` =>
  `/${project}/${toLc(title)}`;
