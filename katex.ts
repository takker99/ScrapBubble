// based on https://github.com/DefinitelyTyped/DefinitelyTyped/blob/27b08d3078064f2ca3b1e192ee231396107fafeb/types/katex/index.d.ts
// Modifications:
// - $deno fmt
// - macros?: any -> macros?: unknown
// - add deno-lint-ignore

export interface TrustContext {
  command: string;
  url: string;
  protocol: string;
}

/** Documentation: https://katex.org/docs/options.html */
export interface KatexOptions {
  /**
   * If `true`, math will be rendered in display mode
   * (math in display style and center math on page)
   *
   * If `false`, math will be rendered in inline mode
   * @default false
   */
  displayMode?: boolean | undefined;
  /**
   * Determines the markup language of the output. The valid choices are:
   * - `html`: Outputs KaTeX in HTML only.
   * - `mathml`: Outputs KaTeX in MathML only.
   * - `htmlAndMathml`: Outputs HTML for visual rendering
   *   and includes MathML for accessibility.
   *
   * @default 'htmlAndMathml'
   */
  output?: "html" | "mathml" | "htmlAndMathml" | undefined;
  /**
   * If `true`, display math has \tags rendered on the left
   * instead of the right, like \usepackage[leqno]{amsmath} in LaTeX.
   *
   * @default false
   */
  leqno?: boolean | undefined;
  /**
   * If `true`, display math renders flush left with a 2em left margin,
   * like \documentclass[fleqn] in LaTeX with the amsmath package.
   *
   * @default false
   */
  fleqn?: boolean | undefined;
  /**
   * If `true`, KaTeX will throw a `ParseError` when
   * it encounters an unsupported command or invalid LaTex
   *
   * If `false`, KaTeX will render unsupported commands as
   * text, and render invalid LaTeX as its source code with
   * hover text giving the error, in color given by errorColor
   * @default true
   */
  throwOnError?: boolean | undefined;
  /**
   * A Color string given in format `#XXX` or `#XXXXXX`
   */
  errorColor?: string | undefined;
  /**
   * A collection of custom macros.
   *
   * See `src/macros.js` for its usage
   */
  macros?: unknown;
  /**
   * Specifies a minimum thickness, in ems, for fraction lines,
   * \sqrt top lines, {array} vertical lines, \hline, \hdashline,
   * \underline, \overline, and the borders of \fbox, \boxed, and
   * \fcolorbox.
   */
  minRuleThickness?: number | undefined;
  /**
   * If `true`, `\color` will work like LaTeX's `\textcolor`
   * and takes 2 arguments
   *
   * If `false`, `\color` will work like LaTeX's `\color`
   * and takes 1 argument
   *
   * In both cases, `\textcolor` works as in LaTeX
   *
   * @default false
   */
  colorIsTextColor?: boolean | undefined;
  /**
   * All user-specified sizes will be caped to `maxSize` ems
   *
   * If set to Infinity, users can make elements and space
   * arbitrarily large
   *
   * @default Infinity
   */
  maxSize?: number | undefined;
  /**
   * Limit the number of macro expansions to specified number
   *
   * If set to `Infinity`, marco expander will try to fully expand
   * as in LaTex
   *
   * @default 1000
   */
  maxExpand?: number | undefined;
  /**
   * If `false` or `"ignore"`, allow features that make
   * writing in LaTex convenient but not supported by LaTex
   *
   * If `true` or `"error"`, throw an error for such transgressions
   *
   * If `"warn"`, warn about behavior via `console.warn`
   *
   * @default "warn"
   */
  // deno-lint-ignore ban-types
  strict?: boolean | string | Function | undefined;
  /**
   * If `false` (do not trust input), prevent any commands that could enable adverse behavior, rendering them instead in errorColor.
   *
   * If `true` (trust input), allow all such commands.
   *
   * @default false
   */
  trust?: boolean | ((context: TrustContext) => boolean) | undefined;
  /**
   * Place KaTeX code in the global group.
   *
   * @default false
   */
  globalGroup?: boolean | undefined;
}

export interface Katex {
  /**
   * Renders a TeX expression into the specified DOM element
   * @param tex A TeX expression
   * @param element The DOM element to render into
   * @param options KaTeX options
   */
  render(
    tex: string,
    element: HTMLElement,
    options?: KatexOptions,
  ): void;
  /**
   * Renders a TeX expression into an HTML string
   * @param tex A TeX expression
   * @param options KaTeX options
   */
  renderToString(
    tex: string,
    options?: KatexOptions,
  ): string;
}

declare global {
  interface Window {
    katex: Katex;
  }
}

// deno-lint-ignore no-namespace
export namespace katex {
  export declare class ParseError implements Error {
    // deno-lint-ignore no-explicit-any
    constructor(message: string, lexer: any, position: number);
    name: string;
    message: string;
    position: number;
  }
}

export const defaultVersion = "0.16.9";
let initialized: Promise<Katex> | undefined;
let error: string | Event | undefined;
export const importKaTeX = (version: string): Promise<Katex> => {
  const url =
    `https://cdnjs.cloudflare.com/ajax/libs/KaTeX/${version}/katex.min.js`;

  if (error) throw error;
  if (!document.querySelector(`script[src="${url}"]`)) {
    const script = document.createElement("script");
    script.src = url;
    initialized = new Promise<Katex>((resolve, reject) => {
      // deno-lint-ignore no-window
      script.onload = () => resolve(window.katex);
      script.onerror = (e) => {
        error = e;
        reject(e);
      };
      document.head.append(script);
    });
  }
  if (initialized) return initialized;

  return new Promise((resolve) => {
    const id = setInterval(() => {
      // deno-lint-ignore no-window
      if (!window.katex) return;
      clearInterval(id);
      // deno-lint-ignore no-window
      resolve(window.katex);
    }, 500);
  });
};

export { defaultVersion as version };
