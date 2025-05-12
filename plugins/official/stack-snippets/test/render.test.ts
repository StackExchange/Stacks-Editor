import {
    invalidSnippetRenderCases,
    snippetExternalProvider,
    validSnippetRenderCases,
} from "./stack-snippet-helpers";
import { RichTextEditor } from "../../../../src";
import { StackSnippetOptions } from "../src/common";

describe("stack snippets", () => {
    function richView(markdownInput: string, opts?: StackSnippetOptions) {
        return new RichTextEditor(
            document.createElement("div"),
            markdownInput,
            snippetExternalProvider(opts),
            {}
        );
    }

    const shouldHaveSnippetBlock = (rendered: Element) => {
        expect(rendered.querySelectorAll("div.snippet")).toHaveLength(1);
        expect(rendered.querySelectorAll("div.snippet-code")).toHaveLength(1);
        expect(rendered.querySelectorAll("div.snippet-result")).toHaveLength(1);
        expect(rendered.querySelectorAll("div.snippet-result")).toHaveLength(1);
        const resultCode = rendered.querySelectorAll("div.snippet-result-code");
        expect(resultCode).toHaveLength(1);
        expect(resultCode[0].childNodes).toHaveLength(0);
    };

    const shouldHaveSnippetControls = (rendered: Element) => {
        const snippetButtons = rendered.querySelectorAll("div.snippet-buttons > button");
        expect(snippetButtons).toHaveLength(2);
        expect(snippetButtons[0].attributes.getNamedItem("title").value).toBe(
            "Run code snippet"
        );
        expect(snippetButtons[0].attributes.getNamedItem("aria-label").value).toBe(
            "Run code snippet"
        );
        expect(snippetButtons[1].attributes.getNamedItem("title").value).toBe(
            "Edit code snippet"
        );
        expect(snippetButtons[1].attributes.getNamedItem("aria-label").value).toBe(
            "Edit code snippet"
        );
    };

    const shouldHaveLanguageBlocks = (rendered: Element, langs: string[]) => {
        for (const lang of langs) {
            const langBlock = rendered.querySelectorAll(
                `div.snippet-code > pre.lang-${lang} > code`
            );
            expect(langBlock).toHaveLength(1);
            expect(langBlock[0].innerHTML).toBeTruthy();
        }

        const codeBlocks = rendered.querySelectorAll(`div.snippet-code > pre`);
        expect(codeBlocks).toHaveLength(langs.length);
    };

    it.each(validSnippetRenderCases)(
        "should render snippets",
        (markdown: string, langs: string[]) => {
            const richEditorView = richView(markdown, {
                renderer: () => Promise.resolve(null),
                openSnippetsModal: () => {},
            });

            const rendered = richEditorView.dom;
            shouldHaveSnippetBlock(rendered);
            shouldHaveSnippetControls(rendered);
            shouldHaveLanguageBlocks(rendered, langs);
        }
    );

    it.each(validSnippetRenderCases)(
        "should render without button if no render supplied",
        (markdown: string, langs: string[]) => {
            const richEditorView = richView(markdown);

            const rendered = richEditorView.dom;
            shouldHaveSnippetBlock(rendered);
            shouldHaveLanguageBlocks(rendered, langs);
        }
    );

    //Snippets with four spaces should render as if in a code block
    it("should render four-space indented snippets within a code block", () => {
        const markdown = `    <!-- begin snippet: js hide: false console: true babel: null babelPresetReact: false babelPresetTS: false -->

    <!-- language: lang-js -->

        console.log("test");

    <!-- end snippet -->`;

        const richEditorView = richView(markdown, {
            renderer: () => null,
            openSnippetsModal: () => {},
        });

        const rendered = richEditorView.dom;
        const codeBlocks = rendered.querySelectorAll(
            "div > pre.s-code-block > code"
        );
        expect(codeBlocks).toHaveLength(1);
        expect(codeBlocks[0].innerHTML).toBeTruthy();
    });

    it.each(invalidSnippetRenderCases)(
        "should not render invalid snippets",
        (markdown) => {
            const richEditorView = richView(markdown, {
                renderer: () => null,
                openSnippetsModal: () => {},
            });

            const rendered = richEditorView.dom;

            expect(rendered.querySelectorAll("div.snippet")).toHaveLength(0);
        }
    );
});
