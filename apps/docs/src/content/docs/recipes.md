---
title: Recipes
description: TypeScript augmentation and reusable attachment patterns
order: 4
---

## TypeScript

Both recipes below use TypeScript [global augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#global-augmentation) to extend built-in DOM interfaces.

### Augmenting HTMLElementTagNameMap

Register your element so that refs ([`r.one()`/`r.many()`](api#withrefs)), [`ctx.getElement()`](api#getelement), [`ctx.getElements()`](api#getelements), and standard DOM APIs (`querySelector`, `createElement`) return properly typed instances:

```typescript
declare global {
  interface HTMLElementTagNameMap {
    "x-my-el": InstanceType<typeof MyEl>;
  }
}

const MyEl = define("x-my-el")
  .withProps(/* ... */)
  .setup(/* ... */);
```

This also enables typed ref lookups in other components:

```typescript
r.one("x-my-el"); // typed as InstanceType<typeof MyEl>, validated at runtime
```

### Typed custom events

Use [`TypedEvent`](api#typedevent) to define type-safe events, then augment `HTMLElementEventMap` so that [`ctx.on()`](api#on), [`ctx.emit()`](api#emit), and `addEventListener` are fully typed:

```typescript
import type { TypedEvent } from "nano-wc";

type SelectionChangeEvent = TypedEvent<
  InstanceType<typeof XListBox>,
  { selected: string[] }
>;

declare global {
  interface HTMLElementEventMap {
    "listbox:change": SelectionChangeEvent;
  }
}

// Emit (inside x-listbox setup):
ctx.emit("listbox:change", { selected: ["a", "b"] });

// Listen (anywhere in the app):
ctx.on(listboxEl, "listbox:change", (e) => {
  e.target; // XListBox instance
  e.detail.selected; // string[]
});
```

### Combining both augmentations

For a complete component definition, declare both the element and its events together:

```typescript
import { define } from "nano-wc";
import type { TypedEvent } from "nano-wc";

type TabsChangedEvent = TypedEvent<InstanceType<typeof XTabs>, { index: number }>;

declare global {
  interface HTMLElementTagNameMap {
    "x-tabs": InstanceType<typeof XTabs>;
  }
  interface HTMLElementEventMap {
    "tabs:changed": TabsChangedEvent;
  }
}

const XTabs = define("x-tabs")
  .withProps((p) => ({ active: p.string("") }))
  .setup((ctx) => {
    // ...
  });
```

## Attachments

Attachments are reusable functions that receive the setup context (`ctx`) and wire up behavior—effects, event listeners, cleanup—without creating a new component.

Unlike regular helper functions, attachments are **lifecycle-aware**: because they receive `ctx`, everything they register via [`ctx.on()`](api#on), [`ctx.effect()`](api#effect), or [`ctx.onCleanup()`](api#oncleanup) is automatically cleaned up when the host component disconnects. A plain helper that calls `addEventListener` would leak listeners; an attachment never does.

Attachments also compose naturally with the [context protocol](guides#context-api). An attachment can call [`consume()`](api#contextconsume) to access ancestor state, or accept a context value as a parameter, letting you build reusable behaviors (keyboard navigation, drag handling, focus traps) that participate in the component tree without being components themselves.

### Writing your own

An attachment is just a function, no special API needed. Follow these conventions:

1. Accept `ctx: SetupContext` as the first parameter
2. Use [`ctx.on()`](api#on), [`ctx.effect()`](api#effect), [`ctx.onCleanup()`](api#oncleanup) for auto-cleanup
3. Accept configuration via additional parameters or an options object
4. Optionally return state or methods for the calling component

```typescript
export function attachClickOutside(
  ctx: SetupContext,
  callback: () => void,
) {
  ctx.on(document, "click", (e) => {
    if (!ctx.host.contains(e.target as Node)) callback();
  });
}
```

### Example: roving focus

Arrow-key navigation through a group of focusable elements:

```typescript
export function attachRovingFocus(
  ctx: SetupContext,
  container: HTMLElement,
  items: HTMLElement[],
  options: { onFocus?: (el: HTMLElement) => void } = {},
) {
  function setActive(index: number) {
    items.forEach((item, i) => {
      item.setAttribute("tabindex", i === index ? "0" : "-1");
    });
  }

  setActive(0);

  ctx.on(container, "keydown", (e) => {
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;

    let next = -1;
    if (e.key === "ArrowRight") next = (current + 1) % items.length;
    if (e.key === "ArrowLeft") next = (current - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;

    if (next !== -1) {
      e.preventDefault();
      setActive(next);
      items[next].focus();
      options.onFocus?.(items[next]);
    }
  });
}
```

Usage:

```typescript
define("x-tabs")
  .withRefs((r) => ({ tablist: r.one("div"), tabs: r.many("[role=tab]") }))
  .setup((ctx) => {
    attachRovingFocus(ctx, ctx.refs.tablist, ctx.refs.tabs, {
      onFocus: (el) => activate(el.dataset.value),
    });
  });
```
