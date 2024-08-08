import { useMemo } from "./deps/preact.tsx";
import { detectURL } from "./detectURL.ts";

export interface UserCSSProps {
  /** CSSもしくはCSSへのURL */
  style: string | URL;
}

/** UserCSSを挿入する */
export const UserCSS = (props: UserCSSProps) => {
  const url = useMemo(() => detectURL(props.style, import.meta.url), [
    props.style,
  ]);

  return (
    <>
      {url !== "" && (url instanceof URL
        ? <link rel="stylesheet" href={url.href} />
        : <style>{url}</style>)}
    </>
  );
};
