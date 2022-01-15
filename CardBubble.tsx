/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { h } from "./deps/preact.tsx";
import type { LinkType } from "./types.ts";
import type { Theme } from "./deps/scrapbox.ts";
import { Card } from "./Card.tsx";

export type CardBubbleProps = {
  cards: {
    descriptions: string[];
    image: string | null;
    project: string;
    title: string;
    theme: Theme;
    linkedTo: string;
    linkedType: LinkType;
  }[];
  index: number;
  position: {
    bottom: number;
    maxWidth: number;
  } & ({ left: number } | { right: number });
  onClick: h.JSX.MouseEventHandler<HTMLDivElement>;
  onPointerEnterCapture: h.JSX.PointerEventHandler<HTMLDivElement>;
};
export const CardBubble = ({
  cards,
  index,
  position,
  ...rest
}: CardBubbleProps) => (
  <div
    className="card-bubble"
    data-index={index}
    style={{
      bottom: `${position.bottom}px`,
      maxWidth: `${position.maxWidth}px`,
      ...("left" in position
        ? {
          left: `${position.left}px`,
        }
        : {
          right: `${position.right}px`,
        }),
    }}
    {...rest}
  >
    <ul>
      {cards.map((
        { project, title, theme, descriptions, image, linkedTo, linkedType },
      ) => (
        <li>
          <Card
            key={`/${project}/${title}`}
            project={project}
            title={title}
            theme={theme}
            linkedTo={linkedTo}
            linkedType={linkedType}
            descriptions={descriptions}
            thumbnail={image ?? ""}
          />
        </li>
      ))}
    </ul>
  </div>
);
