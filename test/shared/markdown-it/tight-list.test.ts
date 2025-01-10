import MarkdownIt from "markdown-it";
import { tight_list } from "../../../src/shared/markdown-it/tight-list";

describe("tight-list markdown-it plugin", () => {
    const instance = new MarkdownIt("default", { html: true });
    instance.use(tight_list);

    it("should tighten up a tight list", () => {
        const markdown = `
- test1
- test2
- test3`;
        const rendered = instance.parse(markdown, {});
        const list = rendered.find((t) => t.type === "bullet_list_open");
        expect(list.attrGet("tight")).toBeTruthy();
    });

    it("should leave loose lists alone", () => {
        const markdown = `
- test1

- test2

- test3`;
        const rendered = instance.parse(markdown, {});
        const list = rendered.find((t) => t.type === "bullet_list_open");
        expect(list.attrGet("tight")).toBeFalsy();
    });

    it("should tighten up nested tight lists", () => {
        const markdown = `
- loose1
    - tight1
    - tight2

- loose2`;
        const rendered = instance.parse(markdown, {});
        const lists = rendered
            .filter((t) => t.type === "bullet_list_open")
            .map((t) => t.attrGet("tight"));
        expect(lists).toEqual([null, "true"]);
    });

    it("should leave nested loose lists alone", () => {
        const markdown = `
- tight1
    - loose1

    - loose2
- tight2`;
        const rendered = instance.parse(markdown, {});
        const lists = rendered
            .filter((t) => t.type === "bullet_list_open")
            .map((t) => t.attrGet("tight"));
        expect(lists).toEqual(["true", null]);
    });

    it("should work on mixed content", () => {
        const markdown = `
# test

- tight1
    - loose1

    - loose2
- tight2
---
- list2_1
- list2_2`;
        const rendered = instance.parse(markdown, {});
        const lists = rendered
            .filter((t) => t.type === "bullet_list_open")
            .map((t) => t.attrGet("tight"));
        expect(lists).toEqual(["true", null, "true"]);
    });
});
