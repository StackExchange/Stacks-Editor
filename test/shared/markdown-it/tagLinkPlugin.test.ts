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
        expect(tokens[0].type).toBe("inline");
        expect(tokens[0].content).toBe("[tag:python]");
        // text wrapped in tag_link_open/close
        expect(tokens[0].children).toHaveLength(3);
        expect(tokens[0].children[0].type).toBe("tag_link_open");
        expect(tokens[0].children[0].attrGet("tagName")).toBe("python");
        expect(tokens[0].children[0].attrGet("tagType")).toBe("tag");
        expect(tokens[0].children[1].type).toBe("text");
        expect(tokens[0].children[1].content).toBe("python");
        expect(tokens[0].children[2].type).toBe("tag_link_close");
    });

    it("should parse meta-tag links on meta sites", () => {
        const instance = createParser(false, true);
        const tokens = instance.parseInline("[meta-tag:discussion]", {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("inline");
        expect(tokens[0].content).toBe("[meta-tag:discussion]");
        // text wrapped in tag_link_open/close
        expect(tokens[0].children).toHaveLength(3);
        expect(tokens[0].children[0].type).toBe("tag_link_open");
        expect(tokens[0].children[0].attrGet("tagName")).toBe("discussion");
        expect(tokens[0].children[0].attrGet("tagType")).toBe("meta-tag");
        expect(tokens[0].children[1].type).toBe("text");
        expect(tokens[0].children[1].content).toBe("discussion");
        expect(tokens[0].children[2].type).toBe("tag_link_close");
    });

    it("should not parse meta-tag links on non-meta sites", () => {
        const instance = createParser();
        const tokens = instance.parseInline("[meta-tag:discussion]", {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("inline");
        expect(tokens[0].content).toBe("[meta-tag:discussion]");
        expect(tokens[0].children).toHaveLength(1);
        expect(tokens[0].children[0].type).toBe("text");
        expect(tokens[0].children[0].content).toBe("[meta-tag:discussion]");
        expect(tokens[0].children[0].attrGet("tagName")).toBeNull();
        expect(tokens[0].children[0].attrGet("tagType")).toBeNull();
    });

    it("should not parse non-ASCII tags when those are not allowed", () => {
        const instance = createParser();
        const tokens = instance.parseInline("[tag:обсуждение]", {});
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("inline");
        expect(tokens[0].content).toBe("[tag:обсуждение]");
        expect(tokens[0].children).toHaveLength(1);
        expect(tokens[0].children[0].type).toBe("text");
        expect(tokens[0].children[0].content).toBe("[tag:обсуждение]");
        expect(tokens[0].children[0].attrGet("tagName")).toBeNull();
        expect(tokens[0].children[0].attrGet("tagType")).toBeNull();
    });

    it("should parse non-ASCII tags when allowed", () => {
        const instance = createParser(true);
        const tokens = instance.parseInline("[tag:обсуждение]", {});
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("inline");
        expect(tokens[0].content).toBe("[tag:обсуждение]");
        // text wrapped in tag_link_open/close
        expect(tokens[0].children).toHaveLength(3);
        expect(tokens[0].children[0].type).toBe("tag_link_open");
        expect(tokens[0].children[0].attrGet("tagName")).toBe("обсуждение");
        expect(tokens[0].children[0].attrGet("tagType")).toBe("tag");
        expect(tokens[0].children[1].type).toBe("text");
        expect(tokens[0].children[1].content).toBe("обсуждение");
        expect(tokens[0].children[2].type).toBe("tag_link_close");
    });
});
