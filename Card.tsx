/** @jsxRuntime automatic */
/** @jsxImportSource npm:preact@10 */
import { h, useCallback, useMemo } from "./deps/preact.tsx";
import { useKaTeX } from "./useKaTeX.ts";
import { encodeTitleURI } from "./deps/scrapbox-std.ts";
import { pushPageTransition } from "./deps/scrapbox-std-browser.ts";
import {
  FormulaNode,
  HashTagNode,
  IconNode,
  LinkNode,
  Node as NodeType,
  StrongIconNode,
} from "./deps/scrapbox-parser.ts";
import { parse } from "./deps/scrapbox-parser.ts";
import { useTheme } from "./useTheme.ts";
import { stayHovering } from "./stayHovering.ts";
import { BubbleOperators } from "./useBubbles.ts";
import { calcBubblePosition } from "./position.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export interface CardProps {
  project: string;
  title: string;
  descriptions: string[];
  thumbnail: string;
  linkTo?: {
    project?: string;
    titleLc: string;
  };
  delay: number;
  prefetch: (project: string, title: string) => void;
  bubble: BubbleOperators["bubble"];
}

export const Card = ({
  project,
  title,
  descriptions,
  thumbnail,
  linkTo,
  bubble,
  delay,
  prefetch,
}: CardProps) => {
  const blocks = useMemo(
    () => thumbnail ? [] : parse(descriptions.join("\n"), { hasTitle: false }),
    [
      thumbnail,
      descriptions,
    ],
  );
  const theme = useTheme(project);

  const handleEnter = useCallback(
    async (
      { currentTarget: a }: h.JSX.TargetedMouseEvent<HTMLAnchorElement>,
    ) => {
      prefetch(project, title);

      if (!await stayHovering(a, delay)) return;

      bubble({
        project,
        title,
        linkTo,
        type: "link",
        position: calcBubblePosition(a),
      });
    },
    [project, title, delay, linkTo?.project, linkTo?.titleLc],
  );

  const handleClick = useMemo(() =>
    linkTo
      ? () => {
        pushPageTransition({
          type: "page",
          from: { project: linkTo.project ?? project, title: linkTo.titleLc },
          to: { project, title },
        });
      }
      : () => {}, [project, title, linkTo?.project, linkTo?.titleLc]);

  return (
    <a
      className="related-page-card page-link"
      type="link"
      data-theme={theme}
      href={`/${project}/${encodeTitleURI(title)}`}
      rel={project === scrapbox.Project.name ? "route" : "noopner noreferrer"}
      target={project !== scrapbox.Project.name ? "_blank" : ""}
      onPointerEnter={handleEnter}
      onClick={handleClick}
    >
      <div class="hover" />
      <div class="content">
        <div class="header">
          <div class="title">{title}</div>
        </div>
        {thumbnail
          ? (
            <div class="thumbnail">
              <img src={thumbnail} />
            </div>
          )
          : (
            <div class="description">
              {blocks.flatMap((block, index) =>
                block.type === "line"
                  ? [
                    <p key={index}>
                      {block.nodes.map((node) => (
                        <SummaryNode node={node} project={project} />
                      ))}
                    </p>,
                  ]
                  : []
              )}
            </div>
          )}
      </div>
    </a>
  );
};

type NodeProps = {
  node: NodeType;
  project: string;
};
const SummaryNode = ({ node, project }: NodeProps) => {
  switch (node.type) {
    case "code":
      return <code>{node.text}</code>;
    case "formula":
      return <Formula node={node} />;
    case "commandLine":
      return <code>{node.symbol} ${node.text}</code>;
    case "helpfeel":
      return <code>? {node.text}</code>;
    case "quote":
    case "strong":
    case "decoration":
      return (
        <>
          {node.nodes.map((node) => (
            <SummaryNode node={node} project={project} />
          ))}
        </>
      );
    case "icon":
    case "strongIcon":
      return <Icon node={node} project={project} />;
    case "hashTag":
      return <HashTag node={node} />;
    case "link":
      return <Link node={node} />;
    case "plain":
    case "blank":
      return <>{node.text}</>;
    default:
      return <></>;
  }
};

type FormulaProps = {
  node: FormulaNode;
};
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
type IconProps = {
  project: string;
  node: IconNode | StrongIconNode;
};
const Icon = ({ node: { pathType, path }, project: _project }: IconProps) => {
  const [project, title] = pathType === "relative"
    ? [
      _project,
      path,
    ]
    : path.match(/\/([\w\-]+)\/(.+)$/)?.slice?.(1) ?? [_project, path];

  return (
    <img
      class="icon"
      src={`/api/pages/${project}/${encodeTitleURI(title)}/icon`}
    />
  );
};
type HashTagProps = {
  node: HashTagNode;
};
const HashTag = ({ node: { href } }: HashTagProps) => (
  <span class="page-link">#{href}</span>
);
type LinkProps = {
  node: LinkNode;
};
const Link = ({ node: { pathType, href, content } }: LinkProps) =>
  pathType !== "absolute"
    ? <span class="page-link">{href}</span> // contentが空のときはundefinedではなく''になるので、
    // ??ではなく||でfallback処理をする必要がある
    : <span class="link">{content || href}</span>;
