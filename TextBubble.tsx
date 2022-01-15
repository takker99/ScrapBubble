/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Page } from "./Page.tsx";
import { Fragment, FunctionComponent, h } from "./deps/preact.tsx";
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
    <>
      {lines.length > 0 && (
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
          <StatusBar>
            {project !== scrapbox.Project.name && (
              <ProjectBadge project={project} titleLc={titleLc} />
            )}
          </StatusBar>
          <Page
            lines={lines}
            project={project}
            titleLc={titleLc}
            scrollTo={scrollTo}
          />
        </div>
      )}
    </>
  );
};

const StatusBar: FunctionComponent = ({ children }) => (
  <div className="status-bar top-right">{children}</div>
);

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
