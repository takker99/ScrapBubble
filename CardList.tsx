/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Card } from "./Card.tsx";
import { h, useMemo } from "./deps/preact.tsx";
import { useBubbleData } from "./useBubbleData.ts";
import { ID, toId } from "./id.ts";
import type { BubbleSource } from "./useBubbles.ts";
import type { Position } from "./position.ts";

export interface CardListProps
  extends
    Pick<BubbleSource, "source" | "bubble">,
    h.JSX.HTMLAttributes<HTMLUListElement> {
  delay: number;
  prefetch: (project: string, title: string) => void;
  linked: readonly ID[];
  externalLinked: readonly ID[];
}

export const CardList = ({
  source,
  linked,
  externalLinked,
  ...props
}: CardListProps) => {
  const cards = useBubbleData(linked);
  const externalCards = useBubbleData(externalLinked);

  const cardStyle = useMemo(() => makeStyle(source.position, "card"), [
    source.position,
  ]);

  return (
    <ul
      className="card-bubble"
      style={cardStyle}
      onClick={props.onClick}
    >
      {[...cards, ...externalCards].map((
        { project, lines: [{ text: title }], descriptions, image },
      ) => (
        <li>
          <Card
            key={toId(project, title)}
            project={project}
            title={title}
            linkedTo={source.title}
            linkedType={source.type}
            descriptions={descriptions}
            thumbnail={image ?? ""}
            {...props}
          />
        </li>
      ))}
    </ul>
  );
};

const makeStyle = (position: Position, type: "page" | "card") => ({
  ...(type === "page"
    ? { top: `${position.top}px` }
    : { bottom: `${position.bottom}px` }),
  maxWidth: `${position.maxWidth}px`,
  ...("left" in position
    ? {
      left: `${position.left}px`,
    }
    : {
      right: `${position.right}px`,
    }),
});
