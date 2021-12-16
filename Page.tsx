/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

/** @jsx h */
/** @jsxFrag Fragment */
import {
  ComponentChildren,
  Fragment,
  h,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "./deps/preact.tsx";
import { useKaTeX } from "./deps/useKaTeX.ts";
import {
  BlankNode,
  CodeBlock as CodeBlockType,
  CodeNode,
  CommandLineNode,
  DecorationNode,
  FormulaNode,
  GoogleMapNode,
  HashTagNode,
  HelpfeelNode,
  IconNode,
  ImageNode,
  LinkNode,
  Node as NodeType,
  parse,
  PlainNode,
  QuoteNode,
  StrongIconNode,
  StrongImageNode,
  StrongNode,
  Table as TableType,
} from "https://esm.sh/@progfay/scrapbox-parser@7.1.0";
import { encodeTitle } from "./utils.ts";
import { parseLink } from "./parseLink.ts";
import { sleep } from "./sleep.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

declare global {
  interface Window {
    /** CSRF token */
    _csrf: string;
  }
}

export type PageProps = {
  project: string;
  lines: { text: string; id: string }[] | string[];
  titleLc: string;
  noIndent?: boolean;
};

export function Page({ lines, project, titleLc, noIndent }: PageProps) {
  const blocks = useMemo(() => {
    const text = lines.map((line) =>
      typeof line === "string" ? line : line.text
    ).join("\n");
    return parse(text, { hasTitle: false });
  }, [lines]);
  const lineIds = useMemo(
    () => lines.flatMap((line) => typeof line === "string" ? [] : [line.id]),
    [lines],
  );

  let counter = 0;
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "title":
            return <div />; // dummy
          case "codeBlock": {
            const start = counter;
            counter += block.content.split("\n").length + 1;
            return (
              <CodeBlock
                key={lineIds[start]}
                block={block}
                project={project}
                titleLc={titleLc}
                noIndent={noIndent}
                ids={lineIds.slice(start, counter)}
              />
            );
          }
          case "table": {
            const start = counter;
            counter += block.cells.length + 1;
            return (
              <Table
                key={lineIds[start]}
                block={block}
                project={project}
                titleLc={titleLc}
                noIndent={noIndent}
                ids={lineIds.slice(start, counter)}
              />
            );
          }
          case "line":
            counter++;
            return (
              <Line
                key={lineIds[counter - 1]}
                index={lineIds[counter - 1]}
                indent={block.indent}
                noIndent={noIndent}
              >
                {block.nodes.length > 0
                  ? block.nodes.map((node) => (
                    <Node node={node} project={project} />
                  ))
                  : <br />}
              </Line>
            );
        }
      })}
    </>
  );
}

type LineProps = {
  index: string;
  indent: number;
  noIndent?: boolean;
  children: ComponentChildren;
};

const Line = ({ index, indent, noIndent, children }: LineProps) => (
  <div
    className="line"
    data-id={index}
    data-indent={indent}
    style={{ "margin-left": noIndent ? "" : `${1.0 * indent}em` }}
  >
    {children}
  </div>
);

type CodeBlockProps = {
  project: string;
  block: CodeBlockType;
  noIndent?: boolean;
  titleLc: string;
  ids: string[];
};
const CodeBlock = (
  { block: { fileName, content, indent }, project, titleLc, ids }:
    CodeBlockProps,
) => {
  const [buttonLabel, setButtonLabel] = useState("\uf0c5");
  const handleClick = useCallback(
    async (e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(content);
        setButtonLabel("Copied");
        await sleep(1000);
        setButtonLabel("\uf0c5");
      } catch (e) {
        alert(`Failed to copy the code block\nError:${e.message}`);
      }
    },
    [content],
  );

  return (
    <>
      <Line index={ids[0]} indent={indent}>
        <span className="code-block">
          <span className="code-block-start">
            {fileName.includes(".")
              ? (
                <a
                  href={`/api/code/${project}/${titleLc}/${fileName}`}
                  target="_blank"
                >
                  {fileName}
                </a>
              )
              : fileName}
          </span>
          <span className="copy" title="Copy" onClick={handleClick}>
            {buttonLabel}
          </span>
        </span>
      </Line>
      <>
        {content.split("\n").map((line, index) => (
          <Line index={ids[index + 1]} indent={indent}>
            <code className="code-block">
              {line}
            </code>
          </Line>
        ))}
      </>
    </>
  );
};

type TableProps = {
  block: TableType;
  project: string;
  titleLc: string;
  noIndent?: boolean;
  ids: string[];
};
const Table = (
  { block: { fileName, cells, indent }, project, titleLc, ids }: TableProps,
) => (
  <>
    <Line index={ids[0]} indent={indent}>
      <span className="table-block">
        <span className="table-block-start">
          <a
            href={`/api/table/${project}/${titleLc}/${fileName}.csv`}
            target="_blank"
          >
            {fileName}
          </a>
        </span>
      </span>
    </Line>
    <>
      {cells.map((cell, i) => (
        <Line index={ids[i + 1]} indent={indent}>
          <span className="table-block table-block-row">
            {cell.map((row, index) => (
              <span className={`cell col-${index}`}>
                {row[0]?.raw ?? ""}
              </span>
            ))}
          </span>
        </Line>
      ))}
    </>
  </>
);

type NodeProps = {
  node: NodeType;
  project: string;
};
const Node = ({ node, project }: NodeProps) => {
  switch (node.type) {
    case "code":
      return <Code node={node} />;
    case "formula":
      return <Formula node={node} />;
    case "commandLine":
      return <CommandLine node={node} />;
    case "helpfeel":
      return <Helpfeel node={node} />;
    case "quote":
      return <Quote node={node} project={project} />;
    case "strong":
      return <Strong node={node} project={project} />;
    case "decoration":
      return <Decoration node={node} project={project} />;
    case "plain":
    case "blank":
      return <Plain node={node} />;
    case "hashTag":
      return <HashTag node={node} project={project} />;
    case "link":
      return <Link node={node} project={project} />;
    case "googleMap":
      return <GoogleMap node={node} />;
    case "icon":
      return <Icon node={node} project={project} strong={false} />;
    case "strongIcon":
      return <Icon node={node} project={project} strong />;
    case "image":
      return <Image node={node} />;
    case "strongImage":
      return <StrongImage node={node} />;
  }
};

type CodeProps = {
  node: CodeNode;
};
const Code = ({ node: { text } }: CodeProps) => (
  <code className="code">{text}</code>
);

type FormulaProps = {
  node: FormulaNode;
};
const Formula = ({ node: { formula } }: FormulaProps) => {
  const { ref, error, setFormula } = useKaTeX("");
  setFormula(formula);

  return (
    <span className={`formula ${error ? " error" : ""}`}>
      {error
        ? <code>{formula}</code>
        : <span className="katex-display" ref={ref} />}
    </span>
  );
};

type CommandLineProps = {
  node: CommandLineNode;
};
const CommandLine = ({ node: { text, symbol } }: CommandLineProps) => (
  <code className="cli">
    <span className="prefix">{symbol}</span>{" "}
    <span className="command">{text}</span>
  </code>
);

type HelpfeelProps = {
  node: HelpfeelNode;
};
const Helpfeel = ({ node: { text } }: HelpfeelProps) => (
  <code className="helpfeel">
    <span className="prefix">?</span> <span className="entry">{text}</span>
  </code>
);
type QuoteProps = {
  node: QuoteNode;
  project: string;
};
const Quote = ({ node: { nodes }, project }: QuoteProps) => (
  <blockquote className="quote">
    {nodes.map((node) => <Node node={node} project={project} />)}
  </blockquote>
);

type StrongProps = {
  node: StrongNode;
  project: string;
};
const Strong = ({ node: { nodes }, project }: StrongProps) => (
  <strong>
    {nodes.map((node) => <Node node={node} project={project} />)}
  </strong>
);
type DecorationProps = {
  node: DecorationNode;
  project: string;
};
const Decoration = ({ node: { decos, nodes }, project }: DecorationProps) => (
  <span className={decos.map((deco) => `deco-${deco}`).join(" ")}>
    {nodes.map((node) => <Node node={node} project={project} />)}
  </span>
);
type GoogleMapProps = {
  node: GoogleMapNode;
};
const GoogleMap = (
  { node: { place, latitude, longitude, zoom } }: GoogleMapProps,
) => (
  <span className="pointing-device-map">
    <a
      href={`https://www.google.com/maps/search/${place}/@${latitude},${longitude},${zoom}z`}
      rel="noopner noreferrer"
      target="_blank"
    >
      <img
        className="google-map"
        src={`/api/google-map/static-map?center=${latitude}%2C${longitude}&markers=${place}&zoom=${zoom}&_csrf=${window._csrf}`}
      />
    </a>
  </span>
);
type PlainProps = {
  node: PlainNode | BlankNode;
};
const Plain = ({ node: { text } }: PlainProps) => <>{text}</>;
type IconProps =
  & {
    project: string;
  }
  & ({
    node: IconNode;
    strong: false;
  } | {
    node: StrongIconNode;
    strong: true;
  });
const Icon = (
  { node: { pathType, path }, strong, project: _project }: IconProps,
) => {
  const [project, title] = pathType === "relative"
    ? [
      _project,
      path,
    ]
    : path.match(/\/([\w\-]+)\/(.+)$/)?.slice?.(1) ?? [_project, path];
  const titleLc = encodeTitle(title);
  return (
    <a
      href={`/${project}/${titleLc}`}
      rel={project === scrapbox.Project.name ? "route" : "noopener noreferrer"}
      target={project === scrapbox.Project.name ? "" : "_blank"}
    >
      <img
        className={strong ? "icon strong-icon" : "icon"}
        alt={title}
        src={`/api/pages/${project}/${titleLc}/icon`}
      >
        {title}
      </img>
    </a>
  );
};
type ImageProps = {
  node: ImageNode;
};
const Image = ({ node: { link, src } }: ImageProps) => {
  const href = link ||
    // linkが空文字のとき
    (/https:\/\/gyazo\.com\/[^\/]+\/thumb\/1000/.test(src)
      ? src.slice(0, -"/thumb/1000".length)
      : src);

  return (
    <a
      className={link ? "link" : ""}
      href={href}
      rel="noopner noreferrer"
      target="_blank"
    >
      <img className="image" src={src} />
    </a>
  );
};
type StrongImageProps = {
  node: StrongImageNode;
};
const StrongImage = ({ node: { src } }: StrongImageProps) => (
  <img className="image strong-image" src={src} />
);

type HashTagProps = {
  node: HashTagNode;
  project: string;
};
const HashTag = ({ node: { href }, project }: HashTagProps) => (
  <a
    href={`/${project}/${encodeTitle(href)}`}
    className="page-link"
    type="hashTag"
    rel={project === scrapbox.Project.name ? "route" : "noopener noreferrer"}
    target={project === scrapbox.Project.name ? "" : "_blank"}
  >
    #{href}
  </a>
);
type LinkProps = {
  node: LinkNode;
  project: string;
};
const Link = ({ node: { pathType, href, content }, project }: LinkProps) => {
  switch (pathType) {
    case "relative":
    case "root": {
      const { project: _project = project, title, hash = "" } = parseLink({
        pathType,
        href,
      });
      return (
        <a
          className="page-link"
          type="link"
          href={`/${_project}${
            title === undefined
              ? ""
              : `/${encodeTitle(title)}${hash === "" ? "" : `#${hash}`}`
          }`}
          rel={_project === scrapbox.Project.name
            ? "route"
            : "noopener noreferrer"}
          target={_project === scrapbox.Project.name ? "" : "_blank"}
        >
          {href}
        </a>
      );
    }
    case "absolute": {
      const youtube = parseYoutube(href);
      if (youtube) {
        return <Youtube {...youtube} />;
      }
      const vimeo = parseVimeo(href);
      if (vimeo) {
        return <Vimeo {...vimeo} />;
      }
      if (isAudioURL(href)) {
        return <Audio href={href} content={content} />;
      }
      if (isVideoURL(href)) {
        return <Video href={href} />;
      }
      return (
        <a
          className="link"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {
            // contentが空のときはundefinedではなく''になるので、
            // ??ではなく||でfallback処理をする必要がある
            content || href
          }
        </a>
      );
    }
  }
};

type YoutubeProps = {
  params: URLSearchParams;
  videoId: string;
};
const youtubeRegExp =
  /https?:\/\/(?:www\.|)youtube\.com\/watch\?((?:[^\s]+&|)v=([a-zA-Z\d_-]+)(?:&[^\s]+|))/;
const youtubeShortRegExp =
  /https?:\/\/youtu\.be\/([a-zA-Z\d_-]+)(?:\?([^\s]{0,100})|)/;
const youtubeListRegExp =
  /https?:\/\/(?:www\.|)youtube\.com\/playlist\?((?:[^\s]+&|)list=([a-zA-Z\d_-]+)(?:&[^\s]+|))/;
function parseYoutube(url: string): YoutubeProps | undefined {
  {
    const matches = url.match(youtubeRegExp);
    if (matches) {
      const [, params, videoId] = matches;
      const _params = new URLSearchParams(params);
      _params.delete("v");
      _params.append("autoplay", "0");
      return {
        videoId,
        params: _params,
      };
    }
  }
  {
    const matches = url.match(youtubeShortRegExp);
    if (matches) {
      const [, videoId] = matches;
      return {
        videoId,
        params: new URLSearchParams("autoplay=0"),
      };
    }
  }
  {
    const matches = url.match(youtubeListRegExp);
    if (matches) {
      const [, params, listId] = matches;

      const _params = new URLSearchParams(params);
      const videoId = _params.get("v");
      if (!videoId) return;
      _params.delete("v");
      _params.append("autoplay", "0");
      _params.append("list", listId);
      return {
        videoId,
        params: _params,
      };
    }
  }
  return undefined;
}
const Youtube = ({ videoId, params }: YoutubeProps) => (
  <div className="iframe-video-player">
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
      allowFullScreen
      type="text/html"
    />
  </div>
);
const vimeoRegExp = /https?:\/\/vimeo\.com\/([0-9]+)/i;
function parseVimeo(url: string) {
  const matches = url.match(vimeoRegExp);
  if (!matches) return undefined;
  return { vimeoId: matches[1] };
}
type VimeoProps = {
  vimeoId: string;
};
const Vimeo = ({ vimeoId }: VimeoProps) => (
  <div className="iframe-video-player">
    <iframe
      src={`https://player.vimeo.com/video/${vimeoId}`}
      allowFullScreen
      type="text/html"
    />
  </div>
);
type AudioURL = `${string}.${"mp3" | "ogg" | "wav" | "acc"}`;
function isAudioURL(url: string): url is AudioURL {
  return /\.(?:mp3|ogg|wav|aac)$/.test(url);
}
type AudioProps = {
  href: AudioURL;
  content: string;
};
const Audio = ({ href, content }: AudioProps) =>
  content === ""
    ? <audio className="audio-player" preload="none" controls src={href} />
    : <AudioLink href={href} content={content} />;
const AudioLink = ({ href, content }: AudioProps) => {
  const ref = useRef<HTMLAudioElement>(null);
  const togglePlay = useCallback(() => {
    if (ref.current?.paused) {
      ref.current.currentTime = 0;
      ref.current.play();
    } else {
      ref.current?.pause?.();
    }
  }, []);

  return (
    <span className="audio-link">
      <a href={href} rel="noopener noreferrer" target="_blank">
        {content}
      </a>
      <span className="play" onClick={togglePlay}>♬</span>
      <audio preload="none" src={href} ref={ref} />
    </span>
  );
};

type VideoURL = `${string}.${"mp4" | "webm"}`;
function isVideoURL(url: string): url is VideoURL {
  return /\.(?:mp4|webm)$/.test(url);
}
type VideoProps = {
  href: VideoURL;
};
const Video = ({ href }: VideoProps) => (
  <div className="video-player">
    <video
      class="video"
      style={{ display: "inline-block" }}
      controls
      loop
      src={href}
    />
  </div>
);

export const CSS = `
a {
  background-color: transparent;
  text-decoration: none;
  cursor: pointer;
}
img {
  display: inline-block;
  max-width: 100%;
  max-height: 100px;
}
code {
  font-family: var(--code-text-font, Menlo, Monaco, Consolas, "Courier New", monospace);
  font-size: 90%;
  color: var(--code-color, #342d9c);
  background-color: var(--code-bg, rgba(0,0,0,0.04));
  padding: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
blockquote {
  background-color: var(--quote-bg-color, rgba(0,0,0,0.05));
  display: block;
  border-left: solid 4px #a0a0a0;
  padding-left: 4px;
  margin: 0px;
}
strong {
  font-weight: bold;
}
iframe {
  display: inline-block;
  margin: 3px 0;
  vertical-align: middle;
  max-width: 100%;
  width: 640px;
  height: 360px;
  border: 0;
}
audio {
  display: inline-block;
  vertical-align: middle;
  white-space: initial;
  max-width: 100%;
}

.formula {
  margin: auto 6px;
}
.formula.error code {color:#fd7373; }
.katex-display {
  display: inline-block !important;
  margin: 0 !important;
  text-align: inherit !important;
}
.error .katex-display {
  display: none;
}
.cli {
  border-radius: 4px;
}
.cli .prefix {
  color: #9c6248;
}
.helpfeel {
  background-color: #fbebdd;
  border-radius: 4px;
  padding: 3px !important;
}
.helpfeel .prefix {
  color: #f17c00;
}
.helpfeel .entry {
  color: #cc5020;
}

.code-block {
  display: block;
  line-height: 1.7em;
  background-color: var(--code-bg, rgba(0,0,0,0.04));
}
.code-block-start {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  color: #342d9c;
  background-color: #ffcfc6;
  font-size: .9em;
  padding: 1px 2px;
}
.code-block-start a {
  color: #342d9c;
  text-decoration: underline;
}
code.code-block,
.table-block.table-block-row {
  padding-left: 1.0em;
}
.copy {
  font-family: "Font Awesome 5 Free";
  cursor: pointer;
}

.table-block {
  white-space: nowrap;
}
.table-block-start {
  padding: 1px 2px;
  font-size: .9em;
  background-color: #ffcfc6;
}
.table-block-start a {
  color: #342d9c;
  text-decoration: underline;
}
.cell {
  margin: 0;
  padding: 0 2px 0 8px;
  box-sizing: content-box;
  display: inline-block;
  white-space: pre;
}
.cell:nth-child(2n+1) {
  background-color: rgba(0,0,0,0.04);
}
.cell:nth-child(2n) {
  background-color: rgba(0,0,0,0.06);
}

.strong-image {
  max-height: 100%;
}
.icon {
  height: 11px;
  vertical-align: middle;
}
.strong-icon {
  height: calc(11px * 1.2);
}

.deco-\\/ {font-style: italic;}
.deco-\\*-1 {font-weight: bold;}
.deco-\\*-2 {font-weight: bold; font-size: 1.20em;}
.deco-\\*-3 {font-weight: bold; font-size: 1.44em;}
.deco-\\*-4 {font-weight: bold; font-size: 1.73em;}
.deco-\\*-5 {font-weight: bold; font-size: 2.07em;}
.deco-\\*-6 {font-weight: bold; font-size: 2.49em;}
.deco-\\*-7 {font-weight: bold; font-size: 3.00em;}
.deco-\\*-8 {font-weight: bold; font-size: 3.58em;}
.deco-\\*-9 {font-weight: bold; font-size: 4.30em;}
.deco-\\*-10 {font-weight: bold; font-size: 5.16em;}
.deco-\\- {text-decoration: line-through;}
.deco-_ {text-decoration: underline;}
.page-link {color: var(--page-link-color, #5e8af7);}
.page-link:hover {color: var(--page-link-hover-color, #2d67f5);}
.empty-page-link {color: :var(--empty-page-link-color, #fd7373);}
.empty-page-link:hover {color: :var(--empty-page-link-hover-color, #fd7373);}
.link {
  color: var(--page-link-color, #5e8af7);
  text-decoration: underline;
}
.link:hover {color: var(--page-link-color-hover-color, #2d67f5);}
.link img {
  padding-bottom: 3px;
  border-style: none none solid;
  border-width: 1.5px;
  border-color: #8fadf9;
}

.permalink {
  background-color: var(--line-permalink-color, rgba(234,218,74,0.75));
}
`;
