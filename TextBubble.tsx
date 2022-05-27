/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Page } from "./Page.tsx";
import { Fragment, FunctionComponent, h } from "./deps/preact.tsx";
import { encodeTitleURI } from "./deps/scrapbox-std.ts";
import { useTheme } from "./useTheme.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export type TextBubbleProps = {
  project: string;
  title: string;
  lines: {
    text: string;
    id: string;
  }[];
  emptyLinks: string[];
  hasChildCards: boolean;
  index: number;
  position: {
    top: number;
    maxWidth: number;
  } & ({ left: number } | { right: number });
  scrollTo?: {
    type: "id" | "link";
    value: string;
  };
  onPointerEnterCapture: h.JSX.PointerEventHandler<HTMLDivElement>;
  onClick: h.JSX.MouseEventHandler<HTMLDivElement>;
};
export const TextBubble = ({
  project,
  title,
  lines,
  emptyLinks,
  hasChildCards,
  position,
  index,
  onPointerEnterCapture,
  scrollTo,
  onClick,
}: TextBubbleProps) => {
  const theme = useTheme(project);

  return (
    <>
      {lines.length > 0 && (
        <div
          className={`text-bubble${hasChildCards ? " no-scroll" : ""}`}
          data-index={index}
          data-theme={theme}
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
              <ProjectBadge project={project} title={title} />
            )}
          </StatusBar>
          <Page
            lines={lines}
            emptyLinks={emptyLinks}
            project={project}
            title={title}
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
  title: string;
};
const ProjectBadge = ({ project, title }: ProjectBadgeProps): h.JSX.Element => (
  <a
    href={`/${project}/${encodeTitleURI(title)}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    {project}
  </a>
);
