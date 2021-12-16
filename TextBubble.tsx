/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { CSS as pageCSS, Page } from "./Page.tsx";
import { CSS as StatusBarCSS } from "./StatusBar.tsx";
import { Fragment, h } from "./deps/preact.tsx";
import type { Scrapbox, Theme } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export type TextBubbleProps = {
  project: string;
  titleLc: string;
  lines: {
    text: string;
    id: string;
  }[];
  hasChildCards: boolean;
  index: number;
  position: {
    top: number;
    maxWidth: number;
  } & ({ left: number } | { right: number });
  theme: Theme;
  scrollTo?: {
    type: "id" | "link";
    value: string;
  };
  onPointerEnterCapture: h.JSX.PointerEventHandler<HTMLDivElement>;
  onClick: h.JSX.MouseEventHandler<HTMLDivElement>;
};
export const TextBubble = ({
  project,
  titleLc,
  lines,
  hasChildCards,
  position,
  theme,
  index,
  onPointerEnterCapture,
  scrollTo,
  onClick,
}: TextBubbleProps) => {
  return (
    (
      <div
        className={`text-bubble${hasChildCards ? " no-scroll" : ""}`}
        data-theme={theme}
        data-index={index}
        onPointerEnterCapture={onPointerEnterCapture}
        onClick={onClick}
        style={{
          top: `${position.top}px`,
          maxWidth: `${position.maxWidth}px`,
          ...("left" in position
            ? {
              left: `${position.left}px`,
            }
            : {
              right: `${position.right}px`,
            }),
        }}
      >
        {project !== scrapbox.Project.name &&
          <ProjectBadge project={project} titleLc={titleLc} />}
        {lines.length > 0 &&
          (
            <Page
              lines={lines}
              project={project}
              titleLc={titleLc}
              scrollTo={scrollTo}
            />
          )}
      </div>
    )
  );
};

export const CSS = `
.text-bubble {
  padding: 5px 0px 5px 5px;
  font-size: 11px;
  line-height: 1.42857;
  user-select: text;
  position: absolute;
  max-height: 80vh;
  overflow-y: auto;
  background-color: var(--page-bg, #fefefe);
  color: var(--page-text-color, #4a4a4a);
  border-radius: 4px;
  --text-bubble-border-color: hsl(221, 15%, 25%);
  border: 1px solid var(--text-bubble-border-color, #f2f2f3);
  --status-bar-border-color: var(--text-bubble-border-color, #f2f2f3);
  box-shadow: 0 6px 12px rgba(0,0,0,0.175);
  
  z-index: 9000;
}
.text-bubble.no-scroll {
  overflow-y: hidden;
}

.text-bubble[data-theme="default-dark"] {
  --text-bubble-border-color: hsl(0, 0%, 39%);
}
.text-bubble[data-theme="default-minimal"] {
  --text-bubble-border-color: hsl(0, 0%, 89%);
}
.text-bubble[data-theme="paper-light"] {
  --text-bubble-border-color: hsl(53, 8%, 58%);
}
.text-bubble[data-theme="paper-dark-dark"] {
  --text-bubble-border-color: hsl(203, 42%, 17%);
}
.text-bubble[data-theme="blue"] {
  --text-bubble-border-color: hsl(227, 68%, 62%);
}
.text-bubble[data-theme="purple"] {
  --text-bubble-border-color: hsl(267, 39%, 60%);
}
.text-bubble[data-theme="green"] {
  --text-bubble-border-color: hsl(136, 29%, 50%);
}
.text-bubble[data-theme="orange"] {
  --text-bubble-border-color: hsl(43, 71%, 51%);
}
.text-bubble[data-theme="red"] {
  --text-bubble-border-color: hsl(4, 58%, 56%);
}
.text-bubble[data-theme="spring"] {
  --text-bubble-border-color: hsl(72, 64%, 57%);
}
.text-bubble[data-theme="kyoto"] {
  --text-bubble-border-color: hsl(331, 21%, 26%);
}
.text-bubble[data-theme="newyork"] {
  --text-bubble-border-color: hsl(176, 29%, 67%);
}

${pageCSS}
${StatusBarCSS}

.project-badge {
  text-decoration: none;
  color: var(--tool-text-color, #363c49);
}
`;

type ProjectBadgeProps = {
  project: string;
  titleLc: string;
};
function ProjectBadge({ project, titleLc }: ProjectBadgeProps) {
  return (
    <a
      href={`/${project}/${titleLc}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {project}
    </a>
  );
}
