import { NodeSpec } from "prosemirror-model";
import { EditorPlugin } from "../../builder/types";
import { generateTablesMenu } from "./menu";
import { generateTableSpec } from "./schema";

const spoilerNodeSpec: NodeSpec = {
    content: "block+",
    group: "block",
    attrs: { revealed: { default: false } },
    parseDOM: [
        {
            tag: "blockquote.spoiler",
            getAttrs(node: HTMLElement) {
                return {
                    revealed: node.classList.contains("is-visible"),
                };
            },
        },
    ],
    toDOM(node) {
        return [
            "blockquote",
            {
                "class": "spoiler" + (node.attrs.revealed ? " is-visible" : ""),
                // TODO localization
                "data-spoiler": "Reveal spoiler",
            },
            0,
        ];
    },
};

export const spoilerPlugin: EditorPlugin = {
    optionDefaults: {},
    schema: generateTableSpec,
    markdownParser: () => ({
        tokens: {
            table: {
                block: "table",
            },

            thead: {
                block: "table_head",
            },

            tbody: {
                block: "table_body",
            },

            th: {
                block: "table_header",
                getAttrs: (tok) => ({
                    style: tok.attrGet("style"),
                }),
            },

            tr: {
                block: "table_row",
            },

            td: {
                block: "table_cell",
                getAttrs: (tok) => ({
                    style: tok.attrGet("style"),
                }),
            },
        },
        plugins: [],
    }),
    configureMarkdownIt: (instance) => {
        instance.enable("tables");
    },
    menu: generateTablesMenu,
};
