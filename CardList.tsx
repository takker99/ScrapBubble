/** @jsxRuntime automatic */
/** @jsxImportSource npm:preact@10 */
import { Card } from "./Card.tsx";
import { h, useMemo } from "./deps/preact.tsx";
import { useBubbleData } from "./useBubbleData.ts";
import { Bubble } from "./storage.ts";
import { LinkTo } from "./types.ts";
import { ID, toId } from "./id.ts";
import { BubbleOperators, Source } from "./useBubbles.ts";

export interface CardListProps {
  delay: number;
  prefetch: (project: string, title: string) => void;
  /** key ページカードのID, value: 逆リンク先 */
  linked: Map<ID, LinkTo>;
  /** key ページカードのID, value: 逆リンク先 */
  externalLinked: Map<ID, LinkTo>;
  bubble: BubbleOperators["bubble"];
  source: Pick<Source, "project" | "title" | "position">;
  projectsForSort: Set<string>;
  onClick?: h.JSX.MouseEventHandler<HTMLUListElement>;
}

export const CardList = ({
  source,
  linked,
  externalLinked,
  projectsForSort: projectsForSort_,
  ...props
}: CardListProps) => {
  const ids = useMemo(() => [...linked.keys(), ...externalLinked.keys()], [
    linked,
    externalLinked,
  ]);
  const cards = useBubbleData(ids);

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

      return [...cards].sort(compare);
    },
    [cards, projectsForSort],
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
        {
          project,
          titleLc,
          lines: [{ text: title }],
          descriptions,
          image,
        },
      ) => {
        const key = toId(project, titleLc);
        // hookの計算にラグがあり、linkToが見つからない場合がある
        const linkTo = linked.get(key) ?? externalLinked.get(key);

        return (
          <li key={key}>
            <Card
              project={project}
              title={title}
              linkTo={linkTo}
              descriptions={descriptions}
              thumbnail={image ?? ""}
              {...props}
            />
          </li>
        );
      })}
    </ul>
  );
};
