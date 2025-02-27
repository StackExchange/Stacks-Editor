import {NodeSpec} from "prosemirror-model";

export const stackSnippetRichTextNodeSpec: {
    [name: string]: NodeSpec;
} = {
    stack_snippet: {
        //It can have exactly 3 lang blocks: html, css, js.
        // These look the same, and I don't think we need to be picky about order.
        content: "stack_snippet_lang stack_snippet_lang stack_snippet_lang",
        group: "block",
        selectable: false,
        inline: false,
        defining: true,
        isolating: true,
        attrs: {
            hide: { default: "null" },
            console: { default: "null" },
            babel: { default: "null" },
            babelPresetReact: { default: "null" },
            babelPresetTS: { default: "null" },
        },
        toDOM() {
            return ["div", { class: "snippet" }, ["div", { class: "snippet-code" }, 0]]
        }
    },

    stack_snippet_lang: {
        content: "text*",
        code: true,
        defining: true,
        isolating: true,
        inline: false,
        attrs: {
            language: {
                default: "",
                validate: (value) => {
                    if(typeof value !== "string"){
                        return false;
                    }
                    return ["js", "css", "html"].includes(value)
                }
            }
        },
        toDOM(node) {
            const language = node.attrs.language || "";
            return ["pre", {class: `snippet-code-${language} lang-${language}`}, ["code", 0]]
        }
    }
}
