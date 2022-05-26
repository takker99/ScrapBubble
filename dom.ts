/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
export const getEditor = (): HTMLDivElement => {
  const editor = document.getElementById("editor");
  if (!editor) throw Error("#editor is not found");
  return editor as HTMLDivElement;
};
