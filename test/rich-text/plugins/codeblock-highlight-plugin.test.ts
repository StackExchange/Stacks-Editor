import { RichTextEditor, RichTextOptions } from "../../../src/rich-text/editor";
import { externalPluginProvider } from "../../test-helpers";
import {EditorPlugin} from "../../../src";
import {Node as ProseMirrorNode} from "prosemirror-model";

function richView(
    opts?: RichTextOptions["highlighting"],
    markdownInput?: string
) {
    return new RichTextEditor(
        document.createElement("div"),
        markdownInput || "",
        externalPluginProvider([
            fakeLanguageBlockPlugin
        ]),
        {
            highlighting: {
                ...opts,
            },
        }
    );
}

const fakeLanguageBlockPlugin: EditorPlugin = () => ({
    extendSchema: schema => {
        schema.nodes = schema.nodes.append({
            pseudocode: {
                content: "text*",
                group: "block",
                code: true,
                defining: true,
                isolating: true,
                inline: false,
                attrs: {
                    language: {
                        default: ""
                    },
                },
                toDOM() {
                    //`s-code-block` enables code block styles at present
                    // The rest are legacy hold-overs from stack-snippets. Maybe not worth keeping.
                    return [
                        "pre",
                        {
                            class: `s-code-block`,
                        },
                        ["code", 0],
                    ];
                },
            }
        });
        return schema;
    }
});

describe("CodeBlockHighlightPlugin", () => {
    it("should highlight code_block code", () => {
        const view = richView(null, "```js\nconsole.log('test');\n```");

        const variable = view.dom.querySelectorAll("span.hljs-variable");
        expect(variable).toHaveLength(1);
        expect(variable[0].textContent).toBe("console");
        const title = view.dom.querySelectorAll("span.hljs-title");
        expect(title).toHaveLength(1);
        expect(title[0].textContent).toBe("log");
        const string = view.dom.querySelectorAll("span.hljs-string");
        expect(string).toHaveLength(1);
        expect(string[0].textContent).toBe("'test'");
        const language = view.dom.querySelectorAll(".js-language-indicator");
        expect(language).toHaveLength(1);
        expect(language[0].textContent).toBe("javascript");
    });

    it("should highlight other block types if configured", () => {
        const view = richView({
            highlightedNodeTypes: ["pseudocode"],
        });
        const state = view.editorView.state;
        const content =  state.schema.text("console.log('test');");
        const psudocodeNode = state.schema.nodes.pseudocode.createChecked({ language: "js" }, content);

        view.editorView.dispatch(state.tr.replaceWith(0, view.document.nodeSize - 2, psudocodeNode));

        const variable = view.dom.querySelectorAll("code > span.hljs-variable");
        expect(variable).toHaveLength(1);
        expect(variable[0].textContent).toBe("console");
        const title = view.dom.querySelectorAll("code > span.hljs-title");
        expect(title).toHaveLength(1);
        expect(title[0].textContent).toBe("log");
        const string = view.dom.querySelectorAll("code > span.hljs-string");
        expect(string).toHaveLength(1);
        expect(string[0].textContent).toBe("'test'");
    });

    it("should not highlight other block types by default", () => {
        const view = richView({
            highlightedNodeTypes: [],
        });
        const state = view.editorView.state;
        const content =  state.schema.text("console.log('test');");
        const psudocodeNode = state.schema.nodes.pseudocode.createChecked({ language: "js" }, content);

        view.editorView.dispatch(state.tr.replaceWith(0, view.document.nodeSize - 2, psudocodeNode));

        const code = view.dom.querySelectorAll("code");
        expect(code).toHaveLength(1);
        expect(code[0].textContent).toBe("console.log('test');");
    });
});
