/** @jsxRuntime automatic */
/** @jsxImportSource npm:preact@10 */
import {
  FunctionComponent,
  h,
  useCallback,
  useMemo,
  useState,
} from "./deps/preact.tsx";
import { ID, toId } from "./id.ts";
import { Page, PageProps } from "./Page.tsx";
import { Bubble } from "./storage.ts";
import { BubbleOperators, Source } from "./useBubbles.ts";
import { useTheme } from "./useTheme.ts";

export interface TextBubble extends BubbleOperators {
  pages: [Bubble, ...Bubble[]];
  whiteList: Set<string>;
  delay: number;
  noIndent?: boolean;
  source: Source;
  prefetch: (project: string, title: string) => void;
  onClick?: h.JSX.MouseEventHandler<HTMLDivElement>;
}
export const TextBubble: FunctionComponent<TextBubble> = (
  { pages, onClick, source, whiteList, ...rest },
) => {
  const [activeTab, setActiveTab] = useState(
    toId(pages[0].project, pages[0].titleLc),
  );

  const pageStyle = useMemo(() => ({
    top: `${source.position.top}px`,
    maxWidth: `${source.position.maxWidth}px`,
    ...("left" in source.position
      ? {
        left: `${source.position.left}px`,
      }
      : {
        right: `${source.position.right}px`,
      }),
  }), [source.position]);
  return (
    <div
      className="text-bubble"
      style={pageStyle}
      onClick={onClick}
    >
      {pages.length > 1 &&
        (
          <div role="tablist">
            {pages.map((page) => (
              <Tab
                key={toId(page.project, page.titleLc)}
                project={page.project}
                titleLc={page.titleLc}
                selected={activeTab ===
                  toId(page.project, page.titleLc)}
                tabSelector={setActiveTab}
              />
            ))}
          </div>
        )}
      {pages.map((page) => (
        <TabPanel
          key={toId(page.project, page.titleLc)}
          selected={activeTab ===
            toId(page.project, page.titleLc)}
          {...page}
          title={page.lines[0].text}
          hash={source.hash}
          linkTo={source.linkTo}
          whiteList={whiteList}
          {...rest}
        />
      ))}
    </div>
  );
};

const Tab: FunctionComponent<
  {
    project: string;
    titleLc: string;
    selected: boolean;
    tabSelector: (id: ID) => void;
  }
> = ({ project, titleLc, tabSelector, selected }) => {
  const handleClick = useCallback(() => tabSelector(toId(project, titleLc)), [
    project,
    titleLc,
  ]);
  const theme = useTheme(project);
  return (
    <button
      role="tab"
      aria-selected={selected}
      data-theme={theme}
      tabIndex={-1}
      onClick={handleClick}
    >
      {project}
    </button>
  );
};

const TabPanel: FunctionComponent<{ selected: boolean } & PageProps> = (
  { selected, ...rest },
) => {
  const theme = useTheme(rest.project);
  return (
    <div
      role="tabpanel"
      data-theme={theme}
      hidden={!selected}
    >
      <Page {...rest} />
    </div>
  );
};
