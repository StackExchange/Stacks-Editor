import { RichTextEditor } from "../../../../src";
import { MathJaxRenderRequest } from "../src/common";
import { mathJaxExternalProvider } from "./test-helpers";

describe("MathJax rich-text rendering", () => {
    it("renders inline and display formulas through the host callback", () => {
        const renderer = jest.fn(
            ({ container, source, display }: MathJaxRenderRequest) => {
                container.textContent = `${
                    display ? "display" : "inline"
                }:${source}`;
            }
        );
        const target = document.createElement("div");

        new RichTextEditor(
            target,
            "Inline $x^2$\n\n$$\\frac{1}{2}$$",
            mathJaxExternalProvider({ renderer }),
            {}
        );

        expect(renderer).toHaveBeenCalledTimes(2);
        expect(
            target.querySelector(".stacks-editor-math-inline")?.textContent
        ).toBe("inline:x^2");
        expect(
            target.querySelector(".stacks-editor-math-display")?.textContent
        ).toBe("display:\\frac{1}{2}");
    });

    it("falls back to the original delimited source without a renderer", () => {
        const target = document.createElement("div");

        new RichTextEditor(
            target,
            "Inline $x^2$",
            mathJaxExternalProvider(),
            {}
        );

        expect(
            target.querySelector(".stacks-editor-math-inline")?.textContent
        ).toBe("$x^2$");
    });

    it("restores fallback content when the host renderer rejects", async () => {
        const target = document.createElement("div");
        new RichTextEditor(
            target,
            "Inline $x^2$",
            mathJaxExternalProvider({
                renderer: () => Promise.reject(new Error("typeset failed")),
            }),
            {}
        );

        await Promise.resolve();
        await Promise.resolve();

        expect(
            target.querySelector(".stacks-editor-math-inline")?.textContent
        ).toBe("$x^2$");
    });

    it("clears host renderer state when a formula node is destroyed", () => {
        const clear = jest.fn(() => Promise.resolve());
        const editor = new RichTextEditor(
            document.createElement("div"),
            "Inline $x^2$",
            mathJaxExternalProvider({ clear }),
            {}
        );

        editor.destroy();

        expect(clear).toHaveBeenCalledTimes(1);
        expect(clear).toHaveBeenCalledWith(expect.any(HTMLElement));
    });

    it.each([
        "Inline $x^2$ and \\(y^2\\).",
        "$$\n\\frac{1}{2}\n$$",
        "\\[\n\\sum_{i=1}^n i\n\\]",
        "> $$\n> \\frac{1}{2}\n> $$",
        "- $$\n  \\frac{1}{2}\n  $$",
        "Price: \\$5 and formula $x$.",
        "Code: `$notMath$` and formula $x$.",
    ])("round-trips Markdown without losing MathJax source: %s", (markdown) => {
        const editor = new RichTextEditor(
            document.createElement("div"),
            markdown,
            mathJaxExternalProvider(),
            {}
        );

        expect(editor.serializeContent().trimEnd()).toBe(markdown);
    });
});
