/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Fragment, h, useMemo } from "./deps/preact.tsx";
import { useKaTeX } from "./deps/useKaTeX.ts";
import {
  FormulaNode,
  HashTagNode,
  IconNode,
  LinkNode,
  Node as NodeType,
  parse,
  StrongIconNode,
} from "./deps/scrapbox-parser.ts";
import { toLc } from "./utils.ts";
import type { Scrapbox, Theme } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export type CardProps = {
  project: string;
  title: string;
  descriptions: string[];
  thumbnail: string;
  theme: Theme;
};
export const Card = ({
  project,
  title,
  descriptions,
  thumbnail,
  theme,
  ...props
}: CardProps) => {
  const blocks = useMemo(
    () => thumbnail ? [] : parse(descriptions.join("\n"), { hasTitle: false }),
    [descriptions, thumbnail],
  );

  return (
    <a
      className="related-page-card page-link"
      type="link"
      data-theme={theme}
      href={`/${project}/${toLc(title)}`}
      rel={project === scrapbox.Project.name ? "route" : "noopner noreferrer"}
      target={project !== scrapbox.Project.name ? "_blank" : ""}
      {...props}
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

  return <img class="icon" src={`/api/pages/${project}/${toLc(title)}/icon`} />;
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
  pathType !== "absolute" ? <span class="page-link">{href}</span> : // contentが空のときはundefinedではなく''になるので、
  // ??ではなく||でfallback処理をする必要がある
    <span class="link">{content || href}</span>;

export const CSS = `
.related-page-card[data-theme="default-dark"] {
  --card-title-bg: hsl(0, 0%, 39%);
}
.related-page-card[data-theme="default-minimal"] {
  --card-title-bg: hsl(0, 0%, 89%);
}
.related-page-card[data-theme="paper-light"] {
  --card-title-bg: hsl(53, 8%, 58%);
}
.related-page-card[data-theme="paper-dark-dark"] {
  --card-title-bg: hsl(203, 42%, 17%);
}
.related-page-card[data-theme="blue"] {
  --card-title-bg: hsl(227, 68%, 62%);
}
.related-page-card[data-theme="purple"] {
  --card-title-bg: hsl(267, 39%, 60%);
}
.text-bubble[data-theme="green"] {
  --card-title-bg: hsl(136, 29%, 50%);
}
.related-page-card[data-theme="orange"] {
  --card-title-bg: hsl(43, 71%, 51%);
}
.related-page-card[data-theme="red"] {
  --card-title-bg: hsl(4, 58%, 56%);
}
.related-page-card[data-theme="spring"] {
  --card-title-bg: hsl(72, 64%, 57%);
}
.related-page-card[data-theme="kyoto"] {
  --card-title-bg: hsl(331, 21%, 26%);
}
.related-page-card[data-theme="newyork"] {
  --card-title-bg: hsl(176, 29%, 67%);
}

.related-page-card {
  display: block;
  position: relative;
  height: inherit;
  width: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: "Roboto",Helvetica,Arial,"Hiragino Sans",sans-serif;
  background-color: var(--card-bg, #fff);
  color: var(--card-title-color, #555);
  word-break: break-word;
  text-decoration: none;
}
.related-page-card:hover {
  box-shadow: var(--card-box-hover-shadow, 0 2px 0 rgba(0,0,0,0.23));
}
.related-page-card:focus {
  outline: 0;
  box-shadow: 0 0px 0px 3px rgba(102,175,233,0.6);
  border-color: #66afe9;
  transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s
}
.related-page-card.hover {
  opacity: 0;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: var(--card-hover-bg, rgba(0,0,0,0.05));
  mix-blend-mode: multiply;
  z-index: 1;
  transition: background-color .1s
}
.related-page-card:hover .hover{
  opacity: 1;
}
.related-page-card:active .hover{
  opacity: 1;
  background-color: var(--card-active-bg, rgba(0,0,0,0.1))
}
.related-page-card .content {
  height: calc(100% - 5px);
  width: inherit;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.related-page-card .content .header {
  width: 100%;
  color: #396bdd;
  text-overflow: ellipsis;
  border-top: var(--card-title-bg, #f2f2f3) solid 10px;
  padding: 8px 10px;
}
.related-page-card .content .header .title {
  font-size: 11px; /* 14 * 0.8 */
  line-height: 16px; /* 20 * 0.8 */
  font-weight: bold;
  max-height: 48px; /* 60 * 0.8 */
  color: var(--card-title-color, #363c49);
  margin: 0;
  overflow: hidden;
  display: block;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
}
.related-page-card .content .description {
  line-height: 16px; /* 20 * 0.8 */
  padding: 8px 10px 0;
  font-size: 10px; /* 12 * 0.8 */
  white-space: pre-line;
  column-count: 1;
  column-gap: 2em;
  column-width: 10em;
  height: inherit;
  color: var(--card-description-color, gray);
  flex-shrink: 16;
  overflow: hidden;
}
.related-page-card .content .thumbnail {
  display: block;
  width: 100%;
  margin: 0 auto;
  padding: 0 5px;
}
.related-page-card .content .description p {
  margin: 0;
  display: block;
}
.related-page-card .content .description code {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 90%;
  color: var(--code-color, #342d9c);
  background-color: var(--code-bg, rgba(0,0,0,0.04));
  padding: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
 
.related-page-card .content .description .icon {
  height: 9px; /* 11 * 0.8 */
  vertical-align: middle;
}
.related-page-card .content .description .page-link {
  background-color: transparent;
  text-decoration: none;
  cursor: pointer;
  color: var(--page-link-color, #5e8af7);
}
`;
