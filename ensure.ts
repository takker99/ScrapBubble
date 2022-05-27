/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

export const ensureHTMLDivElement: (
  value: unknown,
  name?: string,
) => asserts value is HTMLDivElement = (
  value,
  name?,
) => {
  if (value instanceof HTMLDivElement) return;
  throw Error(`${name ?? "value"} must be HTMLDivElement`);
};
