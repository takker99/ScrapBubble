/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { h } from "./deps/preact.tsx";
import { Card } from "./Card.tsx";
import { useBackCards } from "./useBackCards.ts";
import { toId } from "./utils.ts";
import type { BubbleSource } from "./useBubbles.ts";
import type { ProjectId } from "./deps/scrapbox.ts";

export type CardBubbleProps = {
  source: BubbleSource;
  projects: string[];
  watchList: ProjectId[];
  index: number;
  onClick: h.JSX.MouseEventHandler<HTMLDivElement>;
  onPointerEnterCapture: h.JSX.PointerEventHandler<HTMLDivElement>;
};
export const CardBubble = ({
  source,
  projects,
  watchList,
  index,
  ...rest
}: CardBubbleProps) => {
  const position = source.position;
  const cards = useBackCards(source.title, [
    ...new Set([source.project, ...projects]),
  ], watchList);

  return (
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
          { projectName, title, descriptions, image },
        ) => (
          <li>
            <Card
              key={toId(projectName, title)}
              project={projectName}
              title={title}
              linkedTo={source.title}
              linkedType={source.type}
              descriptions={descriptions}
              thumbnail={image ?? ""}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};
