// https://techracho.bpsinc.jp/yoshi/2020_09_04/97108
type Digits = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Tail<T extends string> = T extends `${Digits}${infer U}` ? U : never;
type First<T extends string> = T extends `${infer U}${Tail<T>}` ? U : never;
type DigitsStr = `${Digits}`;
type Tile<T extends unknown[], N extends Digits | DigitsStr | 10 | "10"> = [
  [],
  [...T],
  [...T, ...T],
  [...T, ...T, ...T],
  [...T, ...T, ...T, ...T],
  [...T, ...T, ...T, ...T, ...T],
  [...T, ...T, ...T, ...T, ...T, ...T],
  [...T, ...T, ...T, ...T, ...T, ...T, ...T],
  [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T],
  [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T],
  [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T],
][N];
type MakeTupleImpl<T, N extends string, X extends unknown[] = []> =
  string extends N ? never
    : // 文字列リテラルじゃなくて string 型が渡ってきた場合は変換できない
    N extends "" ? X
    : // if (src == '') { return x; }
    First<N> extends infer U ? U extends DigitsStr ? // const ch = src[0]
    MakeTupleImpl<
      T,
      Tail<N>, // src.slice(1)
      [...Tile<[T], U>, ...Tile<X, 10> /* x * 10 */]
    >
    : never
    : never;
export type MakeTuple<T, N extends number> = MakeTupleImpl<T, `${N}`>;
