import MarkdownIt from "markdown-it";
import { stackSnippetPlugin } from "../src/schema";
import {
    invalidSnippetRenderCases,
    validSnippetRenderCases,
    validBegin,
    validJs,
    validEnd,
} from "./stack-snippet-helpers";

describe("stackSnippetPlugin (Markdown-it)", () => {
    const mdit = new MarkdownIt("default", {});
    mdit.use(stackSnippetPlugin);

    it.each(validSnippetRenderCases)(
        "should return a markdown token stream of stack_snippet tokens",
        (markdown: string, langs: string[]) => {
            const tokens = mdit.parse(markdown, {});

            expect(tokens).toHaveLength(langs.length + 2);
            expect(tokens[0].type).toBe("stack_snippet_open");
            expect(tokens[0].attrGet("id")).toBeDefined();
            expect(tokens[0].attrGet("hide")).toBe("false");
            expect(tokens[0].attrGet("console")).toBe("true");
            expect(tokens[0].attrGet("babel")).toBe("null");
            expect(tokens[0].attrGet("babelPresetReact")).toBe("false");
            expect(tokens[0].attrGet("babelPresetTS")).toBe("false");
            expect(tokens[tokens.length - 1].type).toBe("stack_snippet_close");
            //1-indexed, because we want to start from the second element
            for (let i = 1; i < langs.length + 1; i++) {
                expect(tokens[i].type).toBe("stack_snippet_lang");
                expect(langs).toContain(tokens[i].attrGet("language"));
            }
        }
    );

    it.each(invalidSnippetRenderCases)(
        "should return a token stream that does not include stack_snippet tokens",
        (markdown: string) => {
            const tokens = mdit.parse(markdown, {});
            const snippetTokenTypes = [
                "stack_snippet_open",
                "stack_snippet_close",
                "stack_snippet_lang",
            ];

            for (const token of tokens) {
                expect(snippetTokenTypes).not.toContain(token.type);
            }
        }
    );

    it("should correctly parse multiple consecutive snippets", () => {
        const multipleSnippets = `${validBegin}${validJs}${validEnd}

Some text in between snippets.

${validBegin}${validJs}${validEnd}`;

        const tokens = mdit.parse(multipleSnippets, {});

        // We expect:
        // - First snippet: open + lang + close (3 tokens)
        // - Paragraph with text (3 tokens: paragraph_open, inline, paragraph_close)
        // - Second snippet: open + lang + close (3 tokens)
        expect(tokens).toHaveLength(9);

        // First snippet
        expect(tokens[0].type).toBe("stack_snippet_open");
        expect(tokens[1].type).toBe("stack_snippet_lang");
        expect(tokens[2].type).toBe("stack_snippet_close");

        // Text in between
        expect(tokens[3].type).toBe("paragraph_open");
        expect(tokens[4].type).toBe("inline");
        expect(tokens[5].type).toBe("paragraph_close");

        // Second snippet
        expect(tokens[6].type).toBe("stack_snippet_open");
        expect(tokens[7].type).toBe("stack_snippet_lang");
        expect(tokens[8].type).toBe("stack_snippet_close");
    });
});
