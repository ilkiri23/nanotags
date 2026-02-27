let counter = 0;

export function uniqueTag(prefix = "test"): string {
  return `x-${prefix}-${++counter}`;
}

export function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

export function cleanup(): void {
  document.body.innerHTML = "";
}
