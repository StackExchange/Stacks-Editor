import { RichTextEditor } from "../../../src/rich-text/editor";
import { externalPluginProvider } from "../../test-helpers";

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
