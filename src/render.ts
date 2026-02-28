export function render<T>(
  template: HTMLTemplateElement,
  data?: T,
  fill?: (fragment: DocumentFragment, data: T) => void,
): DocumentFragment {
  const clone = template.content.cloneNode(true) as DocumentFragment;
  if (fill && data !== undefined) fill(clone, data);
  return clone;
}

export function renderList<T>(
  template: HTMLTemplateElement,
  items: readonly T[],
  fill: (fragment: DocumentFragment, item: T, index: number) => void,
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const clone = template.content.cloneNode(true) as DocumentFragment;
    fill(clone, item, index);
    fragment.append(clone);
  });
  return fragment;
}
