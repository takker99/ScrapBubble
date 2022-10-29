/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

/** ホバー操作を待機する
 * @return ホバーがキャンセルされたら`false`
 */
export const stayHovering = <E extends Element = HTMLElement>(
  element: E,
  interval: number,
): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    let canceled = false;
    const handleCancel = () => {
      canceled = true;
      resolve(false);
    };
    element.addEventListener("click", handleCancel);
    element.addEventListener("pointerleave", handleCancel);
    setTimeout(() => {
      if (!canceled) resolve(true);
      element.removeEventListener("click", handleCancel);
      element.removeEventListener("pointerleave", handleCancel);
      resolve(false);
    }, interval);
  });
