/** @jsxRuntime automatic */
/** @jsxImportSource npm:preact@10 */
import {
  type ComponentChildren,
  createContext,
  type h,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "./deps/preact.tsx";
import { useKaTeX } from "./useKaTeX.ts";
import type {
  CodeBlock as CodeBlockType,
  CommandLineNode,
  DecorationNode,
  FormulaNode,
  GoogleMapNode,
  HashTagNode,
  IconNode,
  ImageNode,
  Line as LineType,
  LinkNode,
  Node as NodeType,
  StrongIconNode,
  Table as TableType,
} from "./deps/scrapbox-parser.ts";
import { parseLink } from "./parseLink.ts";
import { hasLink } from "./hasLink.ts";
import { toId } from "./id.ts";
import { stayHovering } from "./stayHovering.ts";
import type { BubbleOperators } from "./useBubbles.ts";
import type { LinkTo } from "./types.ts";
import { useBubbleData } from "./useBubbleData.ts";
import { isEmptyLink } from "./storage.ts";
import { calcBubblePosition } from "./position.ts";
import { parse } from "./deps/scrapbox-parser.ts";
import {
  type AnchorFMNode,
  type AudioNode,
  encodeTitleURI,
  parseAbsoluteLink,
  type SpotifyNode,
  type VideoNode,
  type VimeoNode,
  type YoutubeListNode,
  type YoutubeNode,
} from "./deps/scrapbox-std.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
import { useTheme } from "./useTheme.ts";
import { delay } from "./deps/async.ts";
declare const scrapbox: Scrapbox;

declare global {
  interface Window {
    /** CSRF token */
    _csrf?: string;
  }
}

export interface PageProps extends BubbleOperators {
  title: string;
  project: string;
  whiteList: Set<string>;
  delay: number;
  lines: { text: string; id: string }[] | string[];
  noIndent?: boolean;
  hash?: string;
  linkTo?: LinkTo;

  prefetch: (project: string, title: string) => void;
}

// <Page />限定のcontext
const context = createContext<
  & {
    title: string;
    project: string;
    whiteList: Set<string>;
    delay: number;
    prefetch: (project: string, title: string) => void;
  }
  & BubbleOperators
>({
  title: "",
  project: "",
  whiteList: new Set(),
  bubble: () => {},
  hide: () => {},
  delay: 0,
  prefetch: () => {},
});

export const Page = (
  { lines, project, title, whiteList, noIndent, hash, linkTo, ...props }:
    PageProps,
): h.JSX.Element => {
  const lineIds = useMemo(
    () => lines.flatMap((line) => typeof line === "string" ? [] : [line.id]),
    [lines],
  );
  const blocks = useMemo(() => {
    let counter = 0;
    return parse(
      lines.map((line) => typeof line === "string" ? line : line.text).join(
        "\n",
      ),
      { hasTitle: true },
    ).map((block) => {
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
  }, [lines, lineIds]);

  const scrollId = useMemo(() => {
    if (hash && lineIds.includes(hash)) return hash;
    if (!linkTo) return;

    return (blocks.find((block) => {
      if (block.type !== "line") return false;

      return hasLink(linkTo, block.nodes);
    }) as LineType & { id: string } | undefined)?.id;
  }, [blocks, lineIds, hash, linkTo?.project, linkTo?.titleLc]);

  // リンク先にスクロールする
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollId) return;

    const targetLine = ref.current?.querySelector(`[data-id="${scrollId}"]`);
    const scrollY = globalThis.scrollY;
    targetLine?.scrollIntoView?.({ block: "center" });
    globalThis.scroll(0, scrollY);
  }, [scrollId]);

  const theme = useTheme(project);

  return (
    <div className="lines" data-theme={theme} ref={ref}>
      <context.Provider
        value={{ project, title, whiteList, ...props }}
      >
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
                    <a
                      className="page-link"
                      type="link"
                      href={`/${project}/${encodeTitleURI(block.text)}`}
                      rel={project === scrapbox.Project.name
                        ? "route"
                        : "noopener noreferrer"}
                      target={project === scrapbox.Project.name ? "" : "_blank"}
                    >
                      {block.text}
                    </a>
                  </Line>
                  <hr />
                </>
              );
            case "codeBlock": {
              return (
                <CodeBlock
                  key={block.ids[0]}
                  block={block}
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
                      <Node key={node.raw} node={node} />
                    ))
                    : <br />}
                </Line>
              );
          }
        })}
      </context.Provider>
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
  block: CodeBlockType;
  noIndent?: boolean;
  ids: string[];
  scrollId?: string;
};
const CodeBlock = (
  { block: { fileName, content, indent }, ids, scrollId }: CodeBlockProps,
) => {
  const { project, title } = useContext(context);
  const [buttonLabel, setButtonLabel] = useState("\uf0c5");
  const handleClick = useCallback(
    async (e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(content);
        setButtonLabel("Copied");
        await delay(1000);
        setButtonLabel("\uf0c5");
      } catch (e: unknown) {
        alert(`Failed to copy the code block\nError: ${e}`);
      }
    },
    [content],
  );

  return (
    <>
      <Line index={ids[0]} indent={indent} permalink={ids[0] === scrollId}>
        <span className="code-block">
          <span className="code-block-start">
            <a
              href={`/api/code/${project}/${encodeTitleURI(title)}/${fileName}`}
              target="_blank"
            >
              {fileName}
            </a>
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
  noIndent?: boolean;
  scrollId?: string;
  ids: string[];
};
const Table = (
  {
    block: { fileName, cells, indent },
    ids,
    scrollId,
  }: TableProps,
) => {
  const { project, title } = useContext(context);

  return (
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
                  {row.map((node) => <Node key={node.raw} node={node} />)}
                </span>
              ))}
            </span>
          </Line>
        ))}
      </>
    </>
  );
};

type NodeProps = {
  node: NodeType;
};
const Node = ({ node }: NodeProps) => {
  switch (node.type) {
    case "code":
      return <code className="code">{node.text}</code>;
    case "formula":
      return <Formula node={node} />;
    case "commandLine":
      return <CommandLine node={node} />;
    case "helpfeel":
      return (
        <code className="helpfeel">
          <span className="prefix">?</span>{" "}
          <span className="entry">{node.text}</span>
        </code>
      );
    case "quote":
      return (
        <blockquote className="quote">
          {node.nodes.map((node) => <Node key={node.raw} node={node} />)}
        </blockquote>
      );
    case "strong":
      return (
        <strong>
          {node.nodes.map((node) => <Node key={node.raw} node={node} />)}
        </strong>
      );
    case "decoration":
      return <Decoration node={node} />;
    case "plain":
    case "blank":
      return <>{node.text}</>;
    case "hashTag":
      return <HashTag node={node} />;
    case "link":
      return <Link node={node} />;
    case "googleMap":
      return <GoogleMap node={node} />;
    case "icon":
      return <Icon node={node} />;
    case "strongIcon":
      return <Icon node={node} strong />;
    case "image":
      return <Image node={node} />;
    case "strongImage":
      return <img className="image strong-image" src={node.src} />;
    case "numberList":
      return (
        <>
          {`${node.number}. `}
          {node.nodes.map((node) => <Node key={node.raw} node={node} />)}
        </>
      );
  }
};

type FormulaProps = { node: FormulaNode };
const Formula = ({ node: { formula } }: FormulaProps) => {
  const { ref, error } = useKaTeX(formula);

  return (
    <span className={`formula ${error ? " error" : ""}`}>
      {error
        ? <code>{formula}</code>
        : <span className="katex-display" ref={ref} />}
    </span>
  );
};
type DecorationProps = { node: DecorationNode };
const Decoration = (
  { node: { decos, nodes } }: DecorationProps,
) => (
  <span className={decos.map((deco) => `deco-${deco}`).join(" ")}>
    {nodes.map((node) => <Node key={node.raw} node={node} />)}
  </span>
);

type CommandLineProps = { node: CommandLineNode };
const CommandLine = (
  { node }: CommandLineProps,
) => {
  const [buttonLabel, setButtonLabel] = useState("\uf0c5");
  const handleClick = useCallback(
    async (e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(node.text);
        setButtonLabel("Copied");
        await delay(1000);
        setButtonLabel("\uf0c5");
      } catch (e: unknown) {
        alert(`Failed to copy the code block\nError: ${e}`);
      }
    },
    [node.text],
  );

  return (
    <>
      <code className="cli">
        <span className="prefix">{node.symbol}</span>{"  "}
        <span className="command">{node.text}</span>
      </code>
      <span className="tool-buttons">
        <span title="Copy" className="copy" onClick={handleClick}>
          {buttonLabel}
        </span>
      </span>
    </>
  );
};
type GoogleMapProps = { node: GoogleMapNode };
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
        src={`/api/google-map/static-map?center=${latitude}%2C${longitude}&markers=${place}&zoom=${zoom}&_csrf=${
          // deno-lint-ignore no-explicit-any
          (globalThis as any)._csrf}`}
      />
    </a>
  </span>
);
type IconProps = {
  node: IconNode;
  strong?: false;
} | {
  node: StrongIconNode;
  strong: true;
};
const Icon = (
  { node: { pathType, path }, strong }: IconProps,
) => {
  const { project: _project } = useContext(context);
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
      />
    </a>
  );
};
type ImageProps = { node: ImageNode };
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

type HashTagProps = { node: HashTagNode };
const HashTag = ({ node: { href } }: HashTagProps) => {
  const { project } = useContext(context);
  const emptyLink = useEmptyLink(project, href);
  const handleHover = useHover(project, href, "hashtag");

  return (
    <a
      href={`/${project}/${encodeTitleURI(href)}`}
      className={`page-link${emptyLink ? " empty-page-link" : ""}`}
      type="hashTag"
      rel={project === scrapbox.Project.name ? "route" : "noopener noreferrer"}
      target={project === scrapbox.Project.name ? "" : "_blank"}
      onPointerEnter={handleHover}
    >
      #{href}
    </a>
  );
};
type LinkProps = { node: LinkNode };
const Link = (
  { node: { pathType, ...node } }: LinkProps,
) => {
  switch (pathType) {
    case "relative":
    case "root":
      return <ScrapboxLink pathType={pathType} href={node.href} />;
    case "absolute": {
      const linkNode = parseAbsoluteLink({ pathType, ...node });
      switch (linkNode.type) {
        case "youtube":
          return <Youtube {...linkNode} />;
        case "vimeo":
          return <Vimeo {...linkNode} />;
        case "spotify":
          return <Spotify {...linkNode} />;
        case "anchor-fm":
          return <AnchorFM {...linkNode} />;
        case "audio":
          return <Audio {...linkNode} />;
        case "video":
          return <Video {...linkNode} />;
        case "absoluteLink":
          return (
            <a
              className="link"
              href={linkNode.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {
                // contentが空のときはundefinedではなく''になるので、
                // ??ではなく||でfallback処理をする必要がある
                linkNode.content || linkNode.href
              }
            </a>
          );
      }
    }
  }
};

type ScrapboxLinkProps = {
  pathType: "relative" | "root";
  href: string;
};
const ScrapboxLink = (
  { pathType, href }: ScrapboxLinkProps,
) => {
  const { project: project_ } = useContext(context);
  const { project = project_, title, hash = "" } = parseLink(
    {
      pathType,
      href,
    },
  );
  const handleHover = useHover(project, title, "link", hash);
  const emptyLink = useEmptyLink(project, title ?? "");

  return (
    <a
      className={`page-link${
        title !== undefined && emptyLink ? " empty-page-link" : ""
      }`}
      type="link"
      href={`/${project}${
        title === undefined
          ? ""
          : `/${encodeTitleURI(title)}${hash === "" ? "" : `#${hash}`}`
      }`}
      rel={project === scrapbox.Project.name ? "route" : "noopener noreferrer"}
      target={project === scrapbox.Project.name ? "" : "_blank"}
      onPointerEnter={handleHover}
    >
      {href}
    </a>
  );
};

const Youtube = (props: YoutubeNode | YoutubeListNode) => {
  props.params.append("autoplay", "0");
  const src = props.pathType === "list"
    ? `https://www.youtube.com/embed/?${props.params.toString()}&list=${props.listId}`
    : `https://www.youtube.com/embed/${props.videoId}?${props.params.toString()}`;

  return (
    <div className="iframe-video-player">
      <iframe
        src={src}
        allowFullScreen
      />
    </div>
  );
};

const Vimeo = ({ videoId }: VimeoNode) => (
  <div className="iframe-video-player">
    <iframe
      src={`https://player.vimeo.com/video/${videoId}`}
      allowFullScreen
    />
  </div>
);

const Spotify = (props: SpotifyNode) => (
  <div className="iframe-video-player">
    <iframe
      className={`spotify type-${props.pathType}`}
      src={`https://open.spotify.com/embed/${props.pathType}/${props.videoId}`}
      allowFullScreen
    />
  </div>
);

const AnchorFM = (props: AnchorFMNode) => (
  <div className="iframe-video-player">
    <iframe
      className="anchor-fm"
      src={props.href.replace("/episodes/", "/embed/episodes/")}
      allowFullScreen
    />
  </div>
);

const Audio = (props: AudioNode) =>
  props.content === ""
    ? (
      <audio
        className="audio-player"
        preload="none"
        controls
        src={props.href}
      />
    )
    : <AudioLink {...props} />;
const AudioLink = ({ href, content }: AudioNode) => {
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

const Video = ({ href }: VideoNode) => (
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

const useEmptyLink = (project: string, link: string) => {
  const { whiteList } = useContext(
    context,
  );
  const pageIds = useMemo(
    () =>
      (whiteList.has(project) ? [...whiteList] : [project, ...whiteList]).map(
        (project) => toId(project, link),
      ),
    [whiteList, project],
  );
  const bubbles = useBubbleData(pageIds);

  return useMemo(() => isEmptyLink(bubbles), bubbles);
};

/** <a>にhover機能を付与する */
const useHover = (
  project: string,
  title: string | undefined,
  type: "link" | "hashtag",
  hash?: string,
) => {
  const { delay, bubble, prefetch } = useContext(context);

  return useCallback(
    async (
      { currentTarget: a }: h.JSX.TargetedMouseEvent<HTMLAnchorElement>,
    ) => {
      if (!title) return;

      prefetch(project, title);

      if (!await stayHovering(a, delay)) return;

      bubble({
        project,
        title,
        hash,
        type,
        position: calcBubblePosition(a),
      });
    },
    [project, title, hash, type, delay, prefetch, bubble],
  );
};
