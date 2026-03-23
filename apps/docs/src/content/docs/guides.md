---
title: Guides
description: Component communication, lifecycle, and context patterns
order: 2
---

## Components Communication

Parents pass data down through props. Children notify parents via custom events ([`ctx.emit()`](api#emit) / [`ctx.on()`](api#on)). When a child needs ongoing access to parent state, use the [context protocol](guides#context-api) (`nano-wc/context`). Unrelated components share [Nano Stores](https://github.com/nanostores/nanostores) atoms directly.

### Parent to child

The primary channel. A parent sets attributes or properties on its children, and each child reacts via its own prop stores:

```typescript
// Parent sets attribute — child's $mode atom updates automatically
childEl.setAttribute("mode", "dark");

// Or via property
childEl.mode = "dark";
```

### Child to parent

Standard DOM events. The child dispatches with [`ctx.emit()`](api#emit), the parent listens with [`ctx.on()`](api#on):

```typescript
// Child
ctx.emit("tab:select", { index: 2 });

// Parent
ctx.on(ctx.refs.tabs, "tab:select", (e) => {
  console.log(e.detail.index); // 2
});
```

### Child needs parent state or API

Use the [Context protocol](guides#context-api). The parent exposes a value via [`provide()`](api#contextprovide), descendants receive it via [`consume()`](api#contextconsume) or [`withContexts()`](api#withcontexts). This avoids tight coupling and works regardless of DOM depth.

When components form a logical group (Tabs/Tab, Accordion/Panel), the parent provides a typed API and children declare required contexts:

```typescript
import { createContext } from "nano-wc/context";

type TabsAPI = { register: (el: Element) => void; $active: WritableAtom<string> };
const tabsContext = createContext<TabsAPI>("tabs");

const XTabs = define("x-tabs").setup((ctx) => {
  const $active = atom("");

  tabsContext.provide(ctx, {
    $active,
  });
});

define("x-tab-panel")
  .withProps(p => ({ value: p.string() }))
  .withContexts({ tabs: tabsContext })
  .setup((ctx) => {
    ctx.effect(ctx.contexts.tabs.$active, (active) => {
      ctx.host.setAttribute('aria-)
    })
  });
```

[`withContexts()`](api#withcontexts) defers setup until all declared contexts resolve. For dynamic or conditional access, use [`consume()`](api#contextconsume) directly.

### Siblings or unrelated components

Share a [Nano Stores](https://github.com/nanostores/nanostores) atom directly. Import the same store in both components and react via [`ctx.effect()`](api#effect):

```typescript
// shared store (plain module)
export const $theme = atom("light");

// component A
ctx.on(ctx.refs.toggle, "click", () => {
  $theme.set($theme.get() === "light" ? "dark" : "light");
});

// component B
ctx.effect($theme, (theme) => {
  ctx.host.dataset.theme = theme;
});
```

### Combining patterns

You can provide a Nano Stores atom through the Context protocol so that siblings under the same parent share state without a global import:

```typescript
const filterCtx = createContext<WritableAtom<string>>("filter");

define("x-filter-panel").setup((ctx) => {
  const $filter = atom("");
  filterCtx.provide(ctx, $filter);
});

// child A writes to the store
define("x-search-input")
  .withRefs((r) => ({ input: r.one("input") }))
  .withContexts({ filter: filterCtx })
  .setup((ctx) => {
    ctx.on(ctx.refs.input, "input", (e) => {
      ctx.contexts.filter.set(e.currentTarget.value);
    });
  });

// sibling B reacts to changes
define("x-results-list")
  .withContexts({ filter: filterCtx })
  .setup((ctx) => {
    ctx.effect(ctx.contexts.filter, (query) => {
      // filter visible items
    });
  });
```

## Lifecycle

nano-wc builds on the standard Custom Elements lifecycle with a thin reactive layer on top. Understanding the four stages helps debug timing issues and write predictable components.

### 1. Constructor

Reactive prop stores are created and getter/setter descriptors are defined on the element instance. Attribute-backed props read their initial value from the DOM; JSON and property-only props start as `undefined`.

The element is usable as a JS object at this point — you can set properties, read `.tagName`, etc. — but it is not connected to the DOM and [`setup()`](api#setup) has not run.

### 2. connectedCallback

All props are hydrated: each prop's `get` function is called, the raw value is parsed through the schema, and the corresponding atom is set. Then [`setup()`](api#setup) runs.

If [`withContexts()`](api#withcontexts) was used, setup is deferred until all declared contexts resolve. See [Context API](guides#context-api) for details.

### 3. attributeChangedCallback

Fires when an observed attribute changes. The new value is validated through the prop's schema and pushed to the corresponding atom. Only attribute-backed props trigger this — JSON and property-only props are not observed.

### 4. disconnectedCallback

All registered cleanups run: event listeners are removed, store subscriptions are cancelled, and any [`onCleanup()`](api#oncleanup) callbacks execute. The cleanup list is then cleared.

### Reconnection

Re-connecting a previously disconnected component runs [`setup()`](api#setup) again with a fresh cleanup scope. Props that were set programmatically (via the property setter) retain their values; attribute-backed props that were never set programmatically re-read from the DOM.

This means:
- All props are re-hydrated
- Effects and listeners are re-registered
- Refs are re-resolved from the current DOM
- Mixin members are re-assigned

### Cleanup guarantees

All of these are auto-cleaned on disconnect:
- Event listeners registered via [`ctx.on()`](api#on)
- Store subscriptions from [`ctx.effect()`](api#effect)
- Bindings from [`ctx.bind()`](api#bind)
- Custom teardown from [`ctx.onCleanup()`](api#oncleanup)

If a cleanup function throws, the remaining cleanups still execute. The first error is re-thrown after all cleanups complete.

## Context API

The Context API enables cross-component communication for parent-child relationships without tight coupling. It's imported from the separate `nano-wc/context` entry point (~0.4 KB).

### When to use context

Use context when a child component needs **ongoing access to parent state or API** — not just a one-time value (use props) or a fire-and-forget notification (use events).

### How it works

The protocol uses two DOM events following the [Web Components Community Context Protocol](https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md):

**Normal case** (parent connects first):
1. [`provide()`](api#contextprovide) registers a `context-request` event listener on the host
2. [`consume()`](api#contextconsume) dispatches a `context-request` event that bubbles up
3. The provider catches it, stops propagation, and calls the callback with the value
4. The callback runs synchronously

**Late provider** (child upgrades before parent):
1. The `consume()` dispatch goes unhandled — no provider is listening yet
2. A lazy document-level handler stores the pending request
3. When the parent's `provide()` runs, it dispatches a `context-provider` event
4. The document handler re-dispatches `context-request` from pending consumers, resolving them

This means context works regardless of element upgrade order.

### provide vs consume vs withContexts

There are two ways to consume context. Prefer `withContexts()` — use `consume()` only when the context is optional.

**[`withContexts()`](api#withcontexts) (declarative, preferred)** — declares required contexts on the builder. Setup is deferred until **all** contexts resolve:

```typescript
define("x-tab")
  .withContexts({ tabs: tabsCtx })
  .setup((ctx) => {
    // ctx.contexts.tabs is guaranteed to be available here
    ctx.contexts.tabs.register(ctx.host);
  });
```

Use when: the component **cannot function** without the context value. If a provider never appears, setup never runs and the element stays inert.

**[`consume()`](api#contextconsume) (imperative)** — requests context inside setup. The callback runs when/if the context resolves:

```typescript
define("x-widget").setup((ctx) => {
  // Setup runs immediately, context is optional
  tabsCtx.consume(ctx, (tabs) => {
    tabs.register(ctx.host);
  });
});
```

Use when: the context is **optional** — the component should still function without it, or you need to handle the "no provider" case yourself.

Context consumers registered via `consume()` are automatically cleaned up on disconnect — pending requests are removed from the document-level queue. Providers remove their `context-request` listener on disconnect.
