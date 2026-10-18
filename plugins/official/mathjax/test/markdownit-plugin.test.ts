import MarkdownIt from "markdown-it";
import { mathJaxMarkdownPlugin } from "../src/schema";

describe("mathJaxMarkdownPlugin", () => {
    const markdownIt = new MarkdownIt("default", {});
    markdownIt.use(mathJaxMarkdownPlugin);

    it.each([
        ["$x^2$", "math_inline", "x^2", "$", "$"],
        ["\\(x^2\\)", "math_inline", "x^2", "\\(", "\\)"],
        ["$$x^2$$", "math_block", "x^2", "$$", "$$"],
        ["\\[x^2\\]", "math_block", "x^2", "\\[", "\\]"],
    ])(
        "tokenizes %s",
        (markdown, tokenType, source, openDelimiter, closeDelimiter) => {
            const tokens = markdownIt.parse(markdown, {});
            const token =
                tokenType === "math_inline"
                    ? tokens
                          .find((candidate) => candidate.type === "inline")
                          ?.children?.find(
                              (candidate) => candidate.type === tokenType
                          )
                    : tokens.find((candidate) => candidate.type === tokenType);

            expect(token).toBeDefined();
            expect(token.content).toBe(source);
            expect(token.attrGet("openDelimiter")).toBe(openDelimiter);
            expect(token.attrGet("closeDelimiter")).toBe(closeDelimiter);
        }
    );

    it("does not tokenize MathJax inside Markdown code", () => {
        const tokens = markdownIt.parse(
            "`$inline$`\n\n```text\n$$block$$\n```",
            {}
        );
        const allTokens = tokens.flatMap((token) => [
            token,
            ...(token.children ?? []),
        ]);

        expect(
            allTokens.filter((token) =>
                ["math_inline", "math_block"].includes(token.type)
            )
        ).toHaveLength(0);
    });

    it("does not allow inline MathJax to cross a code span", () => {
        const tokens = markdownIt.parse("$before `code` after$", {});
        const allTokens = tokens.flatMap((token) => [
            token,
            ...(token.children ?? []),
        ]);

        expect(
            allTokens.filter((token) => token.type === "math_inline")
        ).toHaveLength(0);
    });

    it("does not allow display MathJax to cross a fenced code block", () => {
        const tokens = markdownIt.parse(
            "$$before\n```text\ncode\n```\nafter$$",
            {}
        );

        expect(
            tokens.filter((token) => token.type === "math_block")
        ).toHaveLength(0);
    });

    it("removes blockquote prefixes from display MathJax source", () => {
        const tokens = markdownIt.parse("> $$\n> \\frac{1}{2}\n> $$", {});
        const math = tokens.find((token) => token.type === "math_block");

        expect(math?.content).toBe("\n\\frac{1}{2}\n");
    });

    it("preserves escaped dollars as a dedicated token", () => {
        const tokens = markdownIt.parse("Price: \\$5", {});
        const escapedDollar = tokens
            .find((token) => token.type === "inline")
            ?.children?.find((token) => token.type === "math_escaped_dollar");

        expect(escapedDollar).toBeDefined();
    });

    it.each(["$unclosed", "$$unclosed", "\\(unclosed", "\\[unclosed"])(
        "leaves unmatched delimiters as text: %s",
        (markdown) => {
            const tokens = markdownIt.parse(markdown, {});
            const allTokens = tokens.flatMap((token) => [
                token,
                ...(token.children ?? []),
            ]);

            expect(
                allTokens.filter((token) =>
                    ["math_inline", "math_block"].includes(token.type)
                )
            ).toHaveLength(0);
        }
    );
});
