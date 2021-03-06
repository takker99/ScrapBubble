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
  useEffect,
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
  Line as LineType,
  LinkNode,
  Node as NodeType,
  PlainNode,
  QuoteNode,
  StrongIconNode,
  StrongImageNode,
  StrongNode,
  Table as TableType,
} from "./deps/scrapbox-parser.ts";
import { parseLink } from "./parseLink.ts";
import { sleep } from "./sleep.ts";
import { useParser } from "./useParser.ts";
import type { ScrollTo } from "./types.ts";
import { encodeTitleURI, toTitleLc } from "./deps/scrapbox-std.ts";
import type { Scrapbox, StringLc } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

declare global {
  interface Window {
    /** CSRF token */
    _csrf?: string;
  }
}

export type PageProps = {
  project: string;
  lines: { text: string; id: string }[] | string[];
  emptyLinks: StringLc[];
  title: string;
  noIndent?: boolean;
  scrollTo?: ScrollTo;
};

const hasLink = (link: string, nodes: NodeType[]): boolean =>
  nodes.some((node) => {
    switch (node.type) {
      case "hashTag":
        return toTitleLc(node.href) === toTitleLc(link);
      case "link": {
        if (node.pathType !== "relative") return false;
        const { title = "" } = parseLink({
          pathType: "relative",
          href: node.href,
        });
        return toTitleLc(title) === toTitleLc(link);
      }
      case "quote":
      case "strong":
      case "decoration":
        return hasLink(link, node.nodes);
    }
  });

export const Page = (
  { lines, project, title, emptyLinks, noIndent, scrollTo }: PageProps,
): h.JSX.Element => {
  const _blocks = useParser(lines, { hasTitle: true });
  const lineIds = useMemo(
    () => lines.flatMap((line) => typeof line === "string" ? [] : [line.id]),
    [lines],
  );
  const blocks = useMemo(() => {
    let counter = 0;
    return _blocks.map((block) => {
      switch (block.type) {
        case "title":
        case "line":
          return {
            ...block,
            id: lineIds[counter++],
          };
        case "codeBlock": {
          const start = counter;
          counter += block.content.split("\n").length + 1;
          return {
            ...block,
            ids: lineIds.slice(start, counter),
          };
        }
        case "table": {
          const start = counter;
          counter += block.cells.length + 1;
          return {
            ...block,
            ids: lineIds.slice(start, counter),
          };
        }
      }
    });
  }, [_blocks, lineIds]);

  const scrollId = useMemo(() => {
    if (!scrollTo) return;

    const id = scrollTo.type === "id"
      ? scrollTo.value
      : (blocks.find((block) => {
        if (block.type !== "line") return false;

        return hasLink(scrollTo.value, block.nodes);
      }) as LineType & { id: string } | undefined)?.id ?? "";
    if (!lineIds.includes(id)) return;
    return id;
  }, [scrollTo, blocks, lineIds]);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollId) return;

    // Page???????????????????????????
    const targetLine = ref.current?.querySelector(`[data-id="${scrollId}"]`);
    const scrollY = window.scrollY;
    targetLine?.scrollIntoView?.({ block: "center" });
    window.scroll(0, scrollY);
  }, [scrollId]);

  return (
    <div className="lines" ref={ref}>
      {blocks.map((block) => {
        switch (block.type) {
          case "title":
            return (
              <>
                <Line
                  key={block.id}
                  index={block.id}
                  indent={0}
                  noIndent={noIndent}
                  permalink={block.id === scrollId}
                >
                  <Plain node={block} />
                </Line>
                <hr />
              </>
            );
          case "codeBlock": {
            return (
              <CodeBlock
                key={block.ids[0]}
                block={block}
                project={project}
                title={title}
                noIndent={noIndent}
                ids={block.ids}
                scrollId={scrollId}
              />
            );
          }
          case "table": {
            return (
              <Table
                key={block.ids[0]}
                block={block}
                project={project}
                title={title}
                emptyLinks={emptyLinks}
                noIndent={noIndent}
                ids={block.ids}
                scrollId={scrollId}
              />
            );
          }
          case "line":
            return (
              <Line
                key={block.id}
                index={block.id}
                indent={block.indent}
                noIndent={noIndent}
                permalink={block.id === scrollId}
              >
                {block.nodes.length > 0
                  ? block.nodes.map((node) => (
                    <Node
                      node={node}
                      project={project}
                      emptyLinks={emptyLinks}
                    />
                  ))
                  : <br />}
              </Line>
            );
        }
      })}
    </div>
  );
};

type LineProps = {
  index: string;
  indent: number;
  permalink?: boolean;
  noIndent?: boolean;
  children: ComponentChildren;
};

const Line = ({ index, indent, noIndent, children, permalink }: LineProps) => (
  <div
    className={`line${permalink ? " permalink" : ""}`}
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
  title: string;
  ids: string[];
  scrollId?: string;
};
const CodeBlock = (
  { block: { fileName, content, indent }, project, title, ids, scrollId }:
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
      <Line index={ids[0]} indent={indent} permalink={ids[0] === scrollId}>
        <span className="code-block">
          <span className="code-block-start">
            {fileName.includes(".")
              ? (
                <a
                  href={`/api/code/${project}/${
                    encodeTitleURI(title)
                  }/${fileName}`}
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
          <Line
            index={ids[index + 1]}
            indent={indent}
            permalink={ids[index + 1] === scrollId}
          >
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
  title: string;
  emptyLinks: string[];
  noIndent?: boolean;
  scrollId?: string;
  ids: string[];
};
const Table = (
  {
    block: { fileName, cells, indent },
    project,
    title,
    emptyLinks,
    ids,
    scrollId,
  }: TableProps,
) => (
  <>
    <Line index={ids[0]} indent={indent} permalink={ids[0] === scrollId}>
      <span className="table-block">
        <span className="table-block-start">
          <a
            href={`/api/table/${project}/${
              encodeTitleURI(title)
            }/${fileName}.csv`}
            target="_blank"
          >
            {fileName}
          </a>
        </span>
      </span>
    </Line>
    <>
      {cells.map((cell, i) => (
        <Line
          index={ids[i + 1]}
          indent={indent}
          permalink={ids[i + 1] === scrollId}
        >
          <span className="table-block table-block-row">
            {cell.map((row, index) => (
              <span className={`cell col-${index}`}>
                {row.map((node) => (
                  <Node node={node} project={project} emptyLinks={emptyLinks} />
                ))}
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
  emptyLinks: string[];
};
const Node = ({ node, project, emptyLinks }: NodeProps) => {
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
      return <Quote node={node} project={project} emptyLinks={emptyLinks} />;
    case "strong":
      return <Strong node={node} project={project} emptyLinks={emptyLinks} />;
    case "decoration":
      return (
        <Decoration node={node} project={project} emptyLinks={emptyLinks} />
      );
    case "plain":
    case "blank":
      return <Plain node={node} />;
    case "hashTag":
      return <HashTag node={node} project={project} emptyLinks={emptyLinks} />;
    case "link":
      return <Link node={node} project={project} emptyLinks={emptyLinks} />;
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
  emptyLinks: string[];
};
const Quote = ({ node: { nodes }, project, emptyLinks }: QuoteProps) => (
  <blockquote className="quote">
    {nodes.map((node) => (
      <Node node={node} project={project} emptyLinks={emptyLinks} />
    ))}
  </blockquote>
);

type StrongProps = {
  node: StrongNode;
  project: string;
  emptyLinks: string[];
};
const Strong = ({ node: { nodes }, project, emptyLinks }: StrongProps) => (
  <strong>
    {nodes.map((node) => (
      <Node node={node} project={project} emptyLinks={emptyLinks} />
    ))}
  </strong>
);
type DecorationProps = {
  node: DecorationNode;
  project: string;
  emptyLinks: string[];
};
const Decoration = (
  { node: { decos, nodes }, project, emptyLinks }: DecorationProps,
) => (
  <span className={decos.map((deco) => `deco-${deco}`).join(" ")}>
    {nodes.map((node) => (
      <Node node={node} project={project} emptyLinks={emptyLinks} />
    ))}
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
  node: Pick<PlainNode | BlankNode, "text">;
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
  const titleLc = encodeTitleURI(title);
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
    // link?????????????????????
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
  emptyLinks: string[];
};
const HashTag = ({ node: { href }, project, emptyLinks }: HashTagProps) => (
  <a
    href={`/${project}/${encodeTitleURI(href)}`}
    className={`page-link${
      emptyLinks.includes(toTitleLc(href)) ? " empty-page-link" : ""
    }`}
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
  emptyLinks: string[];
};
const Link = (
  { node: { pathType, href, content }, project, emptyLinks }: LinkProps,
) => {
  switch (pathType) {
    case "relative":
    case "root": {
      const { project: _project = project, title, hash = "" } = parseLink({
        pathType,
        href,
      });
      return (
        <a
          className={`page-link${
            title !== undefined && emptyLinks.includes(toTitleLc(title))
              ? " empty-page-link"
              : ""
          }`}
          type="link"
          href={`/${_project}${
            title === undefined
              ? ""
              : `/${encodeTitleURI(title)}${hash === "" ? "" : `#${hash}`}`
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
            // content??????????????????undefined????????????''??????????????????
            // ??????????????||???fallback??????????????????????????????
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
      <span className="play" onClick={togglePlay}>???</span>
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
