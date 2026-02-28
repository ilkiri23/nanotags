import { afterEach, describe, expect, it } from "vitest";

import { define } from "./define";
import { render, renderList } from "./render";
import { cleanup, mount, uniqueTag } from "../tests/utils";

afterEach(() => cleanup());

describe("render", () => {
  it("clones template element", () => {
    const tag = uniqueTag("rnd");
    let fragment: DocumentFragment | undefined;
    define(tag, (ctx) => {
      const tpl = ctx.host.querySelector<HTMLTemplateElement>("template")!;
      fragment = render(tpl);
    });
    mount(`<${tag}><template><span class="tpl">hello</span></template></${tag}>`);
    expect(fragment?.querySelector(".tpl")?.textContent).toBe("hello");
  });

  it("fill called with data", () => {
    const tag = uniqueTag("rnd");
    let fragment: DocumentFragment | undefined;
    define(tag, (ctx) => {
      const tpl = ctx.host.querySelector<HTMLTemplateElement>("template")!;
      fragment = render(tpl, { title: "Hi" }, (f, d) => {
        f.querySelector(".title")!.textContent = d.title;
      });
    });
    mount(`<${tag}><template><div class="title"></div></template></${tag}>`);
    expect(fragment?.querySelector(".title")?.textContent).toBe("Hi");
  });

  it("no fill: returns unmodified clone", () => {
    const tag = uniqueTag("rnd");
    let fragment: DocumentFragment | undefined;
    define(tag, (ctx) => {
      const tpl = ctx.host.querySelector<HTMLTemplateElement>("template")!;
      fragment = render(tpl);
    });
    mount(`<${tag}><template><span>static</span></template></${tag}>`);
    expect(fragment?.querySelector("span")?.textContent).toBe("static");
  });
});

describe("renderList", () => {
  it("one clone per item, correct order", () => {
    const tag = uniqueTag("rl");
    let fragment: DocumentFragment | undefined;
    define(tag, (ctx) => {
      const tpl = ctx.host.querySelector<HTMLTemplateElement>("template")!;
      fragment = renderList(tpl, ["a", "b", "c"], (f, item) => {
        f.querySelector(".val")!.textContent = item;
      });
    });
    mount(`<${tag}><template><span class="val"></span></template></${tag}>`);
    const spans = Array.from(fragment?.querySelectorAll(".val") ?? []);
    expect(spans).toHaveLength(3);
    expect(spans[0]?.textContent).toBe("a");
    expect(spans[1]?.textContent).toBe("b");
    expect(spans[2]?.textContent).toBe("c");
  });

  it("index passed correctly", () => {
    const tag = uniqueTag("rl");
    const indices: number[] = [];
    define(tag, (ctx) => {
      const tpl = ctx.host.querySelector<HTMLTemplateElement>("template")!;
      renderList(tpl, ["x", "y"], (_f, _item, i) => indices.push(i));
    });
    mount(`<${tag}><template><span></span></template></${tag}>`);
    expect(indices).toEqual([0, 1]);
  });

  it("empty items → empty fragment", () => {
    const tag = uniqueTag("rl");
    let fragment: DocumentFragment | undefined;
    define(tag, (ctx) => {
      const tpl = ctx.host.querySelector<HTMLTemplateElement>("template")!;
      fragment = renderList(tpl, [], () => {});
    });
    mount(`<${tag}><template><span></span></template></${tag}>`);
    expect(fragment?.childNodes).toHaveLength(0);
  });
});
