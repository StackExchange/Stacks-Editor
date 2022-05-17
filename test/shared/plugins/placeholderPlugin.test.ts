import { CommonmarkEditor } from "../../../src/commonmark/editor";
import { RichTextEditor } from "../../../src/rich-text/editor";

const target = document.createElement("div");

function commonmarkView(
    markdown: string,
    placeholderText: string
): CommonmarkEditor {
    return new CommonmarkEditor(target, markdown, { placeholderText });
}

function richView(markdownInput: string, placeholderText: string) {
    return new RichTextEditor(document.createElement("div"), markdownInput, {
        placeholderText,
    });
}

describe("placeholder plugin", () => {
    describe("commonmark", () => {
        it("should add placeholder when the editor is empty", () => {
            const view = commonmarkView("", "Enter your question…");
            const hasPlaceholder =
                view.editorView.dom.hasAttribute("data-placeholder");

            expect(hasPlaceholder).toBe(true);
        });

        it("should not add placeholder when the editor is populated", () => {
            const view = commonmarkView("# Hello", "Enter your question…");
            const hasPlaceholder =
                view.editorView.dom.hasAttribute("data-placeholder");

            expect(hasPlaceholder).toBe(false);
        });
    });

    describe("rich-text", () => {
        it("should add placeholder when the editor is empty", () => {
            const view = richView("", "Enter your question…");

            expect(view.editorView.dom.hasAttribute("data-placeholder")).toBe(
                true
            );
        });

        it("should not add placeholder when the editor is populated", () => {
            const view = richView("# Hello", "Enter your question…");

            expect(view.editorView.dom.hasAttribute("data-placeholder")).toBe(
                false
            );
        });
        it("should include the placeholder when the editor contains an empty heading", () => {
            const view = richView("# ", "Enter your question…");

            expect(view.editorView.dom.hasAttribute("data-placeholder")).toBe(
                true
            );
        });
    });
});
