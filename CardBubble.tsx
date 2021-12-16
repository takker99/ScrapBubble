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

export const CSS = `
.card-bubble {
  background-color: var(--page-bg, #FFF);
  box-shadow: 0 2px 2px 0 rgba(0,0,0,.14),0 3px 1px -2px rgba(0,0,0,.2),0 1px 5px 0 rgba(0,0,0,.12);
  position: absolute;
  max-width: 80vw;
  box-sizing: content-box;
  z-index: 9000;
  font-size: 11px;
  line-height: 1.42857;
}
.card-bubble > ul {
  display: flex;
  padding: 0px;
  margin: 0px;
  list-style: none;
  overflow-x: auto;
  overflow-y: visible;
}
.card-bubble > ul > li {
  display: block;
  position: relative;
  float: none;
  margin: 5px;
  box-sizing: border-box;
  box-shadow: var(--card-box-shadow, 0 2px 0 rgba(0,0,0,0.12));
  border-radius: 2px;
  
  width: 120px;
  height: 120px;
}
`;
