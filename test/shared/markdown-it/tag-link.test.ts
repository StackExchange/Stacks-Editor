import MarkdownIt from "markdown-it";
import { tagLinks } from "../../../src/shared/markdown-it/tag-link";
import { TagLinkOptions } from "../../../src/shared/view";

function createParser(validate?: TagLinkOptions["validate"]) {
    return new MarkdownIt().use(tagLinks, {
        validate,
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

    it("should call the tag link validate method", () => {
        const markup = "[tag:python]";
        const instance = createParser((tagName, _, totalMarkup) => {
            expect(tagName).toBe("python");
            expect(totalMarkup).toBe(markup);
            return true;
        });
        const tokens = instance.parseInline(markup, {});

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

    it("should reject tag link parsing when validate method returns false", () => {
        const markup = "[tag:python]";
        const instance = createParser(() => false);
        const tokens = instance.parseInline(markup, {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("inline");
        expect(tokens[0].content).toBe("[tag:python]");
        // no tag_link_open/close tokens, just the original text
        expect(tokens[0].children).toHaveLength(1);
        expect(tokens[0].children[0].type).toBe("text");
    });

    it("should detect meta tag links", () => {
        const instance = createParser((_, isMetaTag, totalMarkup) => {
            expect(isMetaTag).toBe(totalMarkup.includes("meta-tag:"));
            return true;
        });
        instance.parseInline("[meta-tag:discussion]", {});
        instance.parseInline("[tag:discussion]", {});
    });

    it("should reject meta tag links when disableMetaTags is set", () => {
        const instance = new MarkdownIt().use(tagLinks, {
            // disable meta tags entirely
            disableMetaTags: true,
            validate: () => {
                throw "This should never be called!";
            },
        });
        const tokens = instance.parseInline("[meta-tag:discussion]", {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("inline");
        expect(tokens[0].content).toBe("[meta-tag:discussion]");
        // no tag_link_open/close tokens, just the original text
        expect(tokens[0].children).toHaveLength(1);
        expect(tokens[0].children[0].type).toBe("text");
    });
});
