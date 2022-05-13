import { Schema } from "prosemirror-model";

// create a modified schema for commonmark
export const commonmarkSchema = new Schema({
    nodes: {
        doc: {
            content: "code_block+",
        },
        text: {
            group: "inline",
        },
        code_block: {
            content: "text*",
            group: "block",
            marks: "",
            code: true,
            defining: true,
            isolating: true,
            // don't let the user select / delete
            selectable: false,
            // force the block language to always be markdown
            attrs: { params: { default: "markdown" } },
            parseDOM: [
                {
                    tag: "pre",
                    preserveWhitespace: "full",
                },
            ],
            toDOM() {
                return ["pre", { class: "s-code-block markdown" }, ["code", 0]];
            },
        },
    },
    marks: {},
});
