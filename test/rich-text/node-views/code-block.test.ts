import { EditorPlugin } from "../../../src";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { RichTextEditor } from "../../../src/rich-text/editor";
import { externalPluginProvider } from "../../test-helpers";
import { EditorView, EditorProps } from "prosemirror-view";
import { CodeBlockView } from "../../../src/rich-text/node-views/code-block";

const languages = ["javascript", "python", "ruby"];

const testCodeBlockPlugin: EditorPlugin = () => ({
    richText: {
        nodeViews: {
            code_block: (
                node: ProseMirrorNode,
                view: EditorView,
                getPos: () => number
            ) => new CodeBlockView(node, view, getPos, languages),
        } as EditorProps["nodeViews"],
    },
});

describe("code-block", () => {
    let richText: RichTextEditor;

    beforeEach(() => {
        richText = new RichTextEditor(
            document.createElement("div"),
            "",
            externalPluginProvider([])
        );
    });

    it("should render codeblocks", () => {
        richText.content = `~~~js
console.log("Hello World");
~~~`;

        // check the node type
        expect(richText.editorView.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "code_block",
                    "content": [
                        {
                            "type.name": "text",
                            "text": 'console.log("Hello World");',
                        },
                    ],
                    "attrs.params": "js",
                },
            ],
        });
    });
});

describe("code-block language picker", () => {
    let richText: RichTextEditor;

    beforeEach(() => {
        richText = new RichTextEditor(
            document.createElement("div"),
            "",
            externalPluginProvider([testCodeBlockPlugin])
        );
        // seed with a JS codeblock
        richText.content = `~~~js
console.log("Hello");
~~~`;
    });

    it("toggles the language‐input panel when the selector button is clicked", () => {
        const button = richText.editorView.dom.querySelector<HTMLButtonElement>(
            "button.js-language-selector"
        );
        expect(button).toBeTruthy();

        // initially closed
        const inputPanel =
            richText.editorView.dom.querySelector<HTMLDivElement>(
                ".js-language-input"
            );
        expect(inputPanel.style.display).toBe("none");

        // open it
        button.click();
        const codeNode = richText.editorView.state.doc.firstChild;
        expect(codeNode.attrs.isEditingLanguage).toBe(true);

        // panel should now be visible
        expect(inputPanel.style.display).toBe("block");
    });

    it("updates suggestions as you type into the language textbox", () => {
        // open the panel first
        richText.editorView.dom
            .querySelector<HTMLElement>("button.js-language-selector")
            .click();

        const textbox = richText.editorView.dom.querySelector<HTMLInputElement>(
            ".js-language-input-textbox"
        );
        // simulate typing "py"
        textbox.value = "Py";
        textbox.dispatchEvent(new Event("input", { bubbles: true }));

        // model should get the suggestions array
        const codeNode = richText.editorView.state.doc.firstChild;
        expect(codeNode.attrs.suggestions).toEqual(["python"]);

        // and the dropdown should contain one <li>
        const items = richText.editorView.dom.querySelectorAll(
            ".js-language-dropdown li"
        );
        expect(items).toHaveLength(1);
        expect(items[0].textContent).toBe("python");
    });

    it("sets the language on clicking a suggestion", () => {
        // open and type "ru"
        richText.editorView.dom
            .querySelector<HTMLElement>("button.js-language-selector")
            .click();
        const textbox = richText.editorView.dom.querySelector<HTMLInputElement>(
            ".js-language-input-textbox"
        );
        textbox.value = "Ru";
        textbox.dispatchEvent(new Event("input", { bubbles: true }));

        // click the only suggestion
        const suggestion = richText.editorView.dom.querySelector<HTMLElement>(
            ".js-language-dropdown li"
        );
        suggestion.click();

        // model should have updated params → "ruby" and closed the panel
        const codeNode = richText.editorView.state.doc.firstChild;
        expect(codeNode.attrs.params).toBe("ruby");
        expect(codeNode.attrs.isEditingLanguage).toBe(false);

        const inputPanel =
            richText.editorView.dom.querySelector<HTMLDivElement>(
                ".js-language-input"
            );
        expect(inputPanel.style.display).toBe("none");
    });

    it("commits whatever you typed if you blur without selecting a suggestion", () => {
        // open and type "typescript"
        richText.editorView.dom
            .querySelector<HTMLElement>("button.js-language-selector")
            .click();
        const textbox = richText.editorView.dom.querySelector<HTMLInputElement>(
            ".js-language-input-textbox"
        );
        textbox.value = "typescript";

        // blur the textbox (simulate losing focus)
        textbox.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

        // the code_block should now have params = "typescript"
        const codeNode = richText.editorView.state.doc.firstChild;
        expect(codeNode.attrs.params).toBe("typescript");
        expect(codeNode.attrs.isEditingLanguage).toBe(false);
        // suggestions should be cleared
        expect(codeNode.attrs.suggestions).toBeNull();
    });

    it("cancels editing and closes on Escape key", () => {
        // open panel
        richText.editorView.dom
            .querySelector<HTMLElement>("button.js-language-selector")
            .click();

        const textbox = richText.editorView.dom.querySelector<HTMLInputElement>(
            ".js-language-input-textbox"
        );
        // press Escape
        const ev = new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
        });
        textbox.dispatchEvent(ev);

        // should cancel and close
        const codeNode = richText.editorView.state.doc.firstChild;
        expect(codeNode.attrs.isEditingLanguage).toBe(false);
        expect(codeNode.attrs.suggestions).toBeNull();
        // panel hidden
        const inputPanel =
            richText.editorView.dom.querySelector<HTMLDivElement>(
                ".js-language-input"
            );
        expect(inputPanel.style.display).toBe("none");
    });
});
