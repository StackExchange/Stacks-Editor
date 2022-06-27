import { RichTextEditor } from "../../../src/rich-text/editor";
import { externalPluginProvider } from "../../test-helpers";
import "../../matchers";
import { sleepAsync } from "../test-helpers";

describe("code-block", () => {
    let richText: RichTextEditor;

    beforeEach(() => {
        richText = new RichTextEditor(
            document.createElement("div"),
            "",
            externalPluginProvider([
                () => ({
                    codeBlockProcessors: [
                        {
                            lang: "checkmark",
                            // contrived processor sometimes renders a double checkmark before the content
                            callback: (content, container) => {
                                const handle = content === "double";

                                if (handle) {
                                    container.textContent = "✔✔" + content;
                                }

                                return handle;
                            },
                        },
                        {
                            lang: "*",
                            // contrived processor that only works on the word "test", no matter the language, rendering an emoji
                            callback: (content, container) => {
                                const handle = content === "fallback";

                                if (handle) {
                                    container.textContent = "👍";
                                }

                                return handle;
                            },
                        },
                    ],
                }),
                () => ({
                    codeBlockProcessors: [
                        {
                            lang: "checkmark",
                            // contrived processor always renders a single checkmark before the content
                            callback: (content, container) => {
                                container.textContent = "✔" + content;

                                return true;
                            },
                        },
                    ],
                }),
            ])
        );
    });

    it("should render regular codeblocks with no processor", () => {
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

        // check that the processor is not applied
        expect(
            richText.editorView.dom.querySelector(".js-processor-toggle")
                .classList
        ).toContain("d-none");
    });

    it("should render codeblocks with language specific processors", () => {
        richText.content = `~~~checkmark
double
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
                            "text": "double",
                        },
                    ],
                    "attrs.params": "checkmark",
                    "attrs.isEditingProcessor": false,
                },
            ],
        });

        // check that the processor is not applied
        const processorEl =
            richText.editorView.dom.querySelector(".js-processor-view");
        const codeEl = richText.editorView.dom.querySelector(".js-code-view");
        const processorToggle = richText.editorView.dom.querySelector(
            ".js-processor-toggle"
        );
        expect(processorEl.classList).not.toContain("d-none");
        expect(processorToggle.classList).not.toContain("d-none");
        expect(processorEl.textContent).toBe("✔✔double");
        expect(codeEl.classList).toContain("d-none");

        // "click" on the processor toggle to switch to edit mode
        const input = processorToggle.querySelector("input");
        input.checked = true;
        input.dispatchEvent(new Event("change"));

        // check that edit mode is active
        expect(richText.editorView.state.doc).toMatchNodeTree({
            content: [
                {
                    "type.name": "code_block",
                    "attrs.isEditingProcessor": true,
                },
            ],
        });
        expect(processorEl.classList).toContain("d-none");
        expect(codeEl.classList).not.toContain("d-none");
    });

    it("should fallback to other language specific processors when a language specific processor refuses render", () => {
        richText.content = `~~~checkmark
won't render the double checkmark
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
                            "text": "won't render the double checkmark",
                        },
                    ],
                    "attrs.params": "checkmark",
                },
            ],
        });

        // check that the second processor is applied since the first will refuse render
        const processorEl =
            richText.editorView.dom.querySelector(".js-processor-view");
        expect(processorEl.classList).not.toContain("d-none");
        expect(processorEl.textContent).toBe(
            "✔won't render the double checkmark"
        );
    });

    it("should fallback to generic processors when others don't apply or render", () => {
        richText.content = `~~~whatever
fallback
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
                            "text": "fallback",
                        },
                    ],
                    "attrs.params": "whatever",
                },
            ],
        });

        // check that the fallback processor is applied
        let processorEl =
            richText.editorView.dom.querySelector(".js-processor-view");
        expect(processorEl.classList).not.toContain("d-none");
        expect(processorEl.textContent).toBe("👍");

        // should apply to non-specified langs as well
        richText.content = `~~~
fallback
~~~`;

        expect(richText.editorView.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "code_block",
                    "content": [
                        {
                            "type.name": "text",
                            "text": "fallback",
                        },
                    ],
                    "attrs.params": "",
                },
            ],
        });

        processorEl =
            richText.editorView.dom.querySelector(".js-processor-view");
        expect(processorEl.classList).not.toContain("d-none");
        expect(processorEl.textContent).toBe("👍");
    });
});
