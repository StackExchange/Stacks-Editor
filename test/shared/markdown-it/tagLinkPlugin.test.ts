import MarkdownIt from "markdown-it/lib";
import { tagLinks } from "../../../src/shared/markdown-it/tag-link";

function createParser(allowNonAscii = false, allowMetaTags = false) {
    return new MarkdownIt().use(tagLinks, {
        allowNonAscii,
        allowMetaTags,
    });
}

describe("tagLinks markdown-it plugin", () => {
    it("should add an inline rule", () => {
        const instance = createParser();
        const addedRule = instance.inline.ruler
            .getRules("")
            .find((r) => r.name === "tag_link");
        expect(addedRule).toBeDefined();
    });

    it("should parse non-ASCII tag links", () => {
        const instance = createParser();
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

    it("should parse meta-tag links on meta sites", () => {
        const instance = createParser(false, true);
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

    it("should not parse meta-tag links on non-meta sites", () => {
        const instance = createParser();
        const tokens = instance.parseInline("[meta-tag:discussion]", {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toEqual("inline");
        expect(tokens[0].content).toEqual("[meta-tag:discussion]");
        expect(tokens[0].children).toHaveLength(1);
        expect(tokens[0].children[0].type).toEqual("text");
        expect(tokens[0].children[0].content).toEqual("[meta-tag:discussion]");
        expect(tokens[0].children[0].attrGet("tagName")).toBeNull();
        expect(tokens[0].children[0].attrGet("tagType")).toBeNull();
    });

    it("should not parse non-ASCII tags when those are not allowed", () => {
        const instance = createParser();
        const tokens = instance.parseInline("[tag:обсуждение]", {});
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toEqual("inline");
        expect(tokens[0].content).toEqual("[tag:обсуждение]");
        expect(tokens[0].children).toHaveLength(1);
        expect(tokens[0].children[0].type).toEqual("text");
        expect(tokens[0].children[0].content).toEqual("[tag:обсуждение]");
        expect(tokens[0].children[0].attrGet("tagName")).toBeNull();
        expect(tokens[0].children[0].attrGet("tagType")).toBeNull();
    });

    it("should parse non-ASCII tags when allowed", () => {
        const instance = createParser(true);
        const tokens = instance.parseInline("[tag:обсуждение]", {});
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toEqual("inline");
        expect(tokens[0].content).toEqual("[tag:обсуждение]");
        // text wrapped in tag_link_open/close
        expect(tokens[0].children).toHaveLength(3);
        expect(tokens[0].children[0].type).toEqual("tag_link_open");
        expect(tokens[0].children[0].attrGet("tagName")).toEqual("обсуждение");
        expect(tokens[0].children[0].attrGet("tagType")).toEqual("tag");
        expect(tokens[0].children[1].type).toEqual("text");
        expect(tokens[0].children[1].content).toEqual("обсуждение");
        expect(tokens[0].children[2].type).toEqual("tag_link_close");
    });
});
