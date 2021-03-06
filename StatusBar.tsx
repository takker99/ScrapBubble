export const CSS = `
.status-bar {
  display: inline-block;
  position: absolute;
  background-color: var(--page-bg, #fefefe);
  cursor: default;
}

.status-bar.top-left {
  top: 0;
  left: 0;
}
.status-bar.top-left * {
  border-right: 1px solid var(--status-bar-border-color, #a9aaaf);
  border-bottom: 1px solid var(--status-bar-border-color, #a9aaaf);
}
.status-bar.top-left :last-of-type {
  border-bottom-right-radius: 3px;
}

.status-bar.top-right {
  top: 0;
  right: 0;
}
.status-bar.top-right * {
  border-left: 1px solid var(--status-bar-border-color, #a9aaaf);
  border-bottom: 1px solid var(--status-bar-border-color, #a9aaaf);
}
.status-bar.top-right :last-of-type {
  border-bottom-left-radius: 3px;
}

.status-bar.bottom-right {
  bottom: 0;
  right: 0;
}
.status-bar.bottom-right * {
  border-left: 1px solid var(--status-bar-border-color, #a9aaaf);
  border-top: 1px solid var(--status-bar-border-color, #a9aaaf);
}
.status-bar.bottom-right :last-of-type {
  border-top-left-radius: 3px;
}

.status-bar.bottom-left {
  bottom: 0;
  left: 0;
}
.status-bar.bottom-left * {
  border-right: 1px solid var(--status-bar-border-color, #a9aaaf);
  border-top: 1px solid var(--status-bar-border-color, #a9aaaf);
}
.status-bar.bottom-left :last-of-type {
  border-top-right-radius: 3px;
}
`;
