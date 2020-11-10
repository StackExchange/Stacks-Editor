import MarkdownIt from "markdown-it/lib";
import { tagLinks } from "../../../src/shared/markdown-it/tag-link";

describe("tagLinks markdown-it plugin", () => {
    const instance = new MarkdownIt().use(tagLinks);

    it("should add an inline rule", () => {
        const addedRule = instance.inline.ruler
            .getRules("")
            .find((r) => r.name === "tag_link");
        expect(addedRule).toBeDefined();
    });

    it("should parse tag links", () => {
        const tokens = instance.parseInline("[tag:python]", {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toEqual("inline");
        expect(tokens[0].content).toEqual("[tag:python]");
        // text wrapped in tag_link_open/close
        expect(tokens[0].children).toHaveLength(3);
        expect(tokens[0].children[0].type).toEqual("tag_link_open");
        expect(tokens[0].children[0].attrGet("tagName")).toEqual("python");
        expect(tokens[0].children[0].attrGet("tagType")).toEqual("tag");
        expect(tokens[0].children[1].type).toEqual("text");
        expect(tokens[0].children[1].content).toEqual("python");
        expect(tokens[0].children[2].type).toEqual("tag_link_close");
    });

    it("should parse meta-tag links", () => {
        const tokens = instance.parseInline("[meta-tag:discussion]", {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toEqual("inline");
        expect(tokens[0].content).toEqual("[meta-tag:discussion]");
        // text wrapped in tag_link_open/close
        expect(tokens[0].children).toHaveLength(3);
        expect(tokens[0].children[0].type).toEqual("tag_link_open");
        expect(tokens[0].children[0].attrGet("tagName")).toEqual("discussion");
        expect(tokens[0].children[0].attrGet("tagType")).toEqual("meta-tag");
        expect(tokens[0].children[1].type).toEqual("text");
        expect(tokens[0].children[1].content).toEqual("discussion");
        expect(tokens[0].children[2].type).toEqual("tag_link_close");
    });
});
