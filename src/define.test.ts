import type { WritableAtom } from "nanostores";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";

import { ComponentBuilder, define } from "./define";
import { cleanup, mount, uniqueTag } from "../tests/utils";

afterEach(() => cleanup());

describe("define", () => {
  describe("short form: define(name, setupFn)", () => {
    it("returns ComponentComponent", () => {
      const tag = uniqueTag("def");
      const Component = define(tag, () => {});
      expect(Component.elementName).toBe(tag);
    });

    it("registered with customElements", () => {
      const tag = uniqueTag("def");
      const Component = define(tag, () => {});
      expect(customElements.get(tag)).toBe(Component);
    });

    it("mixin type inferred from setup return", () => {
      const tag = uniqueTag("ty") as "x-ty-202";
      const Component = define(tag, () => ({ value: 42 }));
      expectTypeOf(Component.elementName).toEqualTypeOf<"x-ty-202">();
      const el = new Component();
      expectTypeOf(el.value).toEqualTypeOf<number>();
    });

    it("mixin methods callable on instance", () => {
      const tag = uniqueTag("mix");
      const Component = define(tag, () => ({ greet: () => "hi" }));
      const el = mount<InstanceType<typeof Component>>(`<${tag}></${tag}>`);
      expect(el.greet()).toBe("hi");
    });
  });

  describe("fluent: define(name).withProps().withRefs().setup()", () => {
    it("define(name) returns ComponentBuilder", () => {
      const tag = uniqueTag("def");
      const builder = define(tag);
      expect(builder).toBeInstanceOf(ComponentBuilder);
    });

    it("withProps/withRefs chain", () => {
      const tag = uniqueTag("def");
      const builder = define(tag)
        .withProps((p) => ({ name: p.string() }))
        .withRefs((r) => ({ btn: r.one("button") }));
      expect(builder).toBeInstanceOf(ComponentBuilder);
    });

    it(".setup() returns ComponentComponent with elementName", () => {
      const tag = uniqueTag("def");
      const Component = define(tag)
        .withProps((p) => ({ label: p.string() }))
        .setup(() => {});
      expect(Component.elementName).toBe(tag);
      expect(customElements.get(tag)).toBe(Component);
    });

    it("withRefs threads ref types to setup context", () => {
      const tag = uniqueTag("ty") as "x-ty-200";
      define(tag)
        .withRefs((r) => ({ btn: r.one("button"), items: r.many("li") }))
        .setup((ctx) => {
          expectTypeOf(ctx.refs.btn).toEqualTypeOf<HTMLButtonElement>();
          expectTypeOf(ctx.refs.items).toEqualTypeOf<HTMLLIElement[]>();
        });
    });

    it("withProps creates $-prefixed stores on ctx.props", () => {
      const tag = uniqueTag("ty") as "x-ty-201";
      define(tag)
        .withProps((p) => ({ label: p.string() }))
        .setup((ctx) => {
          expectTypeOf(ctx.props).toHaveProperty("$label");
          expectTypeOf(ctx.props.$label).toExtend<WritableAtom>();
        });
    });

    it("fluent form: elementName preserved", () => {
      const tag = uniqueTag("ty") as "x-ty-203";
      const Component = define(tag).setup(() => {});
      expectTypeOf(Component.elementName).toEqualTypeOf<"x-ty-203">();
    });
  });

  describe("builder immutability", () => {
    it("withProps returns new builder", () => {
      const tag = uniqueTag("def");
      const b1 = define(tag);
      const b2 = b1.withProps((p) => ({ x: p.string() }));
      expect(b1).not.toBe(b2);
    });

    it("withRefs returns new builder", () => {
      const tag = uniqueTag("def");
      const b1 = define(tag);
      const b2 = b1.withRefs((r) => ({ y: r.one() }));
      expect(b1).not.toBe(b2);
    });
  });
});
