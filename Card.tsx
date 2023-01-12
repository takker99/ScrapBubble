/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Fragment, h, useCallback, useMemo } from "./deps/preact.tsx";
import { useKaTeX } from "./deps/useKaTeX.ts";
import { encodeTitleURI } from "./deps/scrapbox-std.ts";
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
import type { LinkType } from "./types.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export interface CardProps {
  project: string;
  title: string;
  descriptions: string[];
  thumbnail: string;
  linkedTo: string;
  delay: number;
  linkedType: LinkType;
  prefetch: (project: string, title: string) => void;
  bubble: BubbleOperators["bubble"];
}

export const Card = ({
  project,
  title,
  descriptions,
  thumbnail,
  linkedTo,
  linkedType,
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

      bubble({ project, title, type: "link", position: calcBubblePosition(a) });
    },
    [project, title, delay],
  );

  return (
    <a
      className="related-page-card page-link"
      type="link"
      data-theme={theme}
      data-linked-to={linkedTo}
      data-linked-type={linkedType}
      href={`/${project}/${encodeTitleURI(title)}`}
      rel={project === scrapbox.Project.name ? "route" : "noopner noreferrer"}
      target={project !== scrapbox.Project.name ? "_blank" : ""}
      onPointerEnter={handleEnter}
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
