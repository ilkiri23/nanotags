export function clone<T>(
  template: HTMLTemplateElement,
  data?: T,
  fill?: (fragment: DocumentFragment, data: T) => void,
): DocumentFragment {
  const cloned = template.content.cloneNode(true) as DocumentFragment;
  if (fill && data !== undefined) fill(cloned, data);
  return cloned;
}

export function cloneList<T>(
  template: HTMLTemplateElement,
  items: readonly T[],
  fill: (fragment: DocumentFragment, item: T, index: number) => void,
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const cloned = template.content.cloneNode(true) as DocumentFragment;
    fill(cloned, item, index);
    fragment.append(cloned);
  });
  return fragment;
}
