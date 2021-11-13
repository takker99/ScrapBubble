/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
export function getEditor() {
  const editor = document.getElementById("editor");
  if (!editor) throw Error("#editor is not found");
  return editor as HTMLDivElement;
}
