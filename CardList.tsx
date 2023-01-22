/** @jsx h */
/** @jsxFrag Fragment */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Card } from "./Card.tsx";
import { h, useMemo } from "./deps/preact.tsx";
import { useBubbleData } from "./useBubbleData.ts";
import { Bubble } from "./storage.ts";
import { ID, toId } from "./id.ts";
import type { BubbleSource } from "./useBubbles.ts";

export interface CardListProps
  extends
    Pick<BubbleSource, "source" | "bubble">,
    h.JSX.HTMLAttributes<HTMLUListElement> {
  delay: number;
  prefetch: (project: string, title: string) => void;
  linked: readonly ID[];
  externalLinked: readonly ID[];
  projectsForSort: Set<string>;
}

export const CardList = ({
  source,
  linked,
  externalLinked,
  projectsForSort: projectsForSort_,
  ...props
}: CardListProps) => {
  const cards = useBubbleData(linked);
  const externalCards = useBubbleData(externalLinked);
  const projectsForSort = useMemo(() => [...projectsForSort_], [
    projectsForSort_,
  ]);

  /** 更新日時降順とproject昇順に並び替えた関連ページデータ
   *
   * externalCardsは分けない
   */
  const sortedCards = useMemo(
    () => {
      const compare = (a: Bubble, b: Bubble) => {
        const aIndex = projectsForSort.indexOf(a.project);
        const bIndex = projectsForSort.indexOf(b.project);

        if (aIndex === bIndex) return b.updated - a.updated;
        if (aIndex < 0) return 1;
        if (bIndex < 0) return -1;
        return aIndex - bIndex;
      };

      return [...cards, ...externalCards].sort(compare);
    },
    [cards, externalCards, projectsForSort],
  );

  const cardStyle = useMemo(() => ({
    bottom: `${source.position.bottom}px`,
    maxWidth: `${source.position.maxWidth}px`,
    ...("left" in source.position
      ? {
        left: `${source.position.left}px`,
      }
      : {
        right: `${source.position.right}px`,
      }),
  }), [
    source.position,
  ]);

  return (
    <ul
      className="card-bubble"
      style={cardStyle}
      onClick={props.onClick}
    >
      {sortedCards.map((
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
