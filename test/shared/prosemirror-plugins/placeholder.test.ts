import { CommonmarkEditor } from "../../../src/commonmark/editor";
import { RichTextEditor } from "../../../src/rich-text/editor";
import { placeholderPlugin } from "../../../src/shared/prosemirror-plugins/placeholder";
import { externalPluginProvider } from "../../test-helpers";

const PLACEHOLDER_TEXT = "This is a placeholder";

function commonmarkView(
    markdown: string,
    placeholderText: string
): CommonmarkEditor {
    return new CommonmarkEditor(
        document.createElement("div"),
        markdown,
        externalPluginProvider(),
        {
            placeholderText,
        }
    );
}

function richView(markdownInput: string, placeholderText: string) {
    return new RichTextEditor(
        document.createElement("div"),
        markdownInput,
        externalPluginProvider(),
        {
            placeholderText,
        }
    );
}

describe("placeholder plugin", () => {
    describe("commonmark", () => {
        it("should add placeholder when the editor is empty", () => {
            const view = commonmarkView("", PLACEHOLDER_TEXT);
            const elAttr =
                view.editorView.dom.firstElementChild.getAttribute(
                    "data-placeholder"
                );
            const ariaAttr =
                view.editorView.dom.getAttribute("aria-placeholder");

            expect(elAttr).toBe(PLACEHOLDER_TEXT);
            expect(ariaAttr).toBe(PLACEHOLDER_TEXT);
        });

        it("should not add placeholder when the editor is populated", () => {
            const view = commonmarkView("Hello world", PLACEHOLDER_TEXT);
            const elAttr =
                view.editorView.dom.firstElementChild.getAttribute(
                    "data-placeholder"
                );
            const ariaAttr =
                view.editorView.dom.getAttribute("aria-placeholder");

            expect(elAttr).toBeNull();
            expect(ariaAttr).toBe(PLACEHOLDER_TEXT);
        });

        it("should remove placeholder when text is added", () => {
            const view = commonmarkView("", PLACEHOLDER_TEXT);
            let elAttr =
                view.editorView.dom.firstElementChild.getAttribute(
                    "data-placeholder"
                );

            expect(elAttr).toBe(PLACEHOLDER_TEXT);

            view.editorView.dispatch(
                view.editorView.state.tr.insertText("Hello world")
            );

            elAttr =
                view.editorView.dom.firstElementChild.getAttribute(
                    "data-placeholder"
                );
            expect(elAttr).toBeNull();
        });
    });

    describe("rich-text", () => {
        it("should add placeholder when the editor is empty", () => {
            const view = richView("", PLACEHOLDER_TEXT);
            const elAttr =
                view.editorView.dom.firstElementChild.getAttribute(
                    "data-placeholder"
                );
            const ariaAttr =
                view.editorView.dom.getAttribute("aria-placeholder");

            expect(elAttr).toBe(PLACEHOLDER_TEXT);
            expect(ariaAttr).toBe(PLACEHOLDER_TEXT);
        });

        it("should not add placeholder when the editor is populated", () => {
            const view = richView("# Hello", PLACEHOLDER_TEXT);
            const elAttr =
                view.editorView.dom.firstElementChild.getAttribute(
                    "data-placeholder"
                );
            const ariaAttr =
                view.editorView.dom.getAttribute("aria-placeholder");

            expect(elAttr).toBeNull();
            expect(ariaAttr).toBe(PLACEHOLDER_TEXT);
        });

        it("should remove placeholder when text is added", () => {
            const view = richView("", PLACEHOLDER_TEXT);
            let elAttr =
                view.editorView.dom.firstElementChild.getAttribute(
                    "data-placeholder"
                );

            expect(elAttr).toBe(PLACEHOLDER_TEXT);

            view.editorView.dispatch(
                view.editorView.state.tr.insertText("Hello world")
            );

            elAttr =
                view.editorView.dom.firstElementChild.getAttribute(
                    "data-placeholder"
                );
            expect(elAttr).toBeNull();
        });
    });

    describe("plugin", () => {
        it("should not activate when the placeholder text is invalid", () => {
            // start with a valid option to set the base case
            let plugin = placeholderPlugin(PLACEHOLDER_TEXT);
            expect(plugin.spec.state).toBeDefined();

            // now try with an invalid option
            plugin = placeholderPlugin("");
            expect(plugin.spec.state).toBeUndefined();
        });
    });
});
