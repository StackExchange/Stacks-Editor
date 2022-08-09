import MarkdownIt from "markdown-it/lib";
import { htmlComment } from "../../../src/shared/markdown-it/html-comment";

function createParser() {
    const instance = new MarkdownIt("default", { html: true });
    instance.use(htmlComment);
    return instance;
}

describe("html-comment markdown-it plugin", () => {
    it("should add the html comment block rule to the instance", () => {
        const instance = createParser();
        const blockRulesNames = instance.block.ruler
            .getRules("")
            .map((r) => r.name);
        expect(blockRulesNames).toContain("html_comment");
    });

    it("should detect single line html comment blocks", () => {
        const singleLineComment = "<!-- an html comment -->";
        const instance = createParser();
        const tokens = instance.parse(singleLineComment, {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("html_comment");
        expect(tokens[0].content).toBe(singleLineComment);
        expect(tokens[0].map).toEqual([0, 1]);
    });

    it("should detect multiline html comment blocks", () => {
        const multilineComment = `<!-- an html comment\n over multiple lines -->`;
        const instance = createParser();
        const tokens = instance.parse(multilineComment, {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("html_comment");
        expect(tokens[0].content).toBe(multilineComment);
        expect(tokens[0].map).toEqual([0, 2]);
    });

    it("should detect indented html comment blocks", () => {
        const indentedComment = `  <!--\n  an html comment\n  2 space indented\n  -->`;
        const instance = createParser();
        const tokens = instance.parse(indentedComment, {});

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("html_comment");
        expect(tokens[0].content).toBe(indentedComment);
        expect(tokens[0].map).toEqual([0, 4]);
    });

    it.each([
        "other text <!-- an html comment -->",
        "<!-- an html comment --> other text",
        "<!-- an html comment --> <div>other element</div> <!-- an html comment -->",
    ])(
        "should ignore html comments inlined with other element/text (test #%#)",
        (inlinedHtmlComment) => {
            const instance = createParser();
            const tokens = instance.parse(inlinedHtmlComment, {});

            expect(tokens.map((t) => t.type)).not.toContain("html_comment");
        }
    );
});
