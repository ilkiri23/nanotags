const Q: unique symbol = Symbol.for("nano-wc.q");
type Entry = [el: HTMLElement, run: () => void];

declare global {
  interface Window {
    [Q]?: Entry[];
  }
}

export function deferSetups(): void {
  window[Q] ??= [];
}

export function flushSetups(): void {
  const q: Entry[] | undefined = window[Q];
  if (!q) return;
  delete window[Q];
  q.sort(([a], [b]) => {
    const pos = a.compareDocumentPosition(b);
    return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  for (const [el, run] of q) {
    if (el.isConnected) run();
  }
}
