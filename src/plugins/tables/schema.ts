import { NodeSpec } from "prosemirror-model";
import { PluginSchemaSpec } from "../../builder/types";

const tableNodeSpec: NodeSpec = {
    content: "table_head table_body*",
    isolating: true,
    group: "block",
    selectable: false,
    parseDOM: [{ tag: "table" }],
    toDOM() {
        return [
            "div",
            { class: "s-table-container" },
            ["table", { class: "s-table" }, 0],
        ];
    },
};

const tableHeadNodeSpec: NodeSpec = {
    content: "table_row",
    isolating: true,
    group: "table_block",
    selectable: false,
    parseDOM: [{ tag: "thead" }],
    toDOM() {
        return ["thead", 0];
    },
};

const tableBodyNodeSpec: NodeSpec = {
    content: "table_row+",
    isolating: true,
    group: "table_block",
    selectable: false,
    parseDOM: [{ tag: "tbody" }],
    toDOM() {
        return ["tbody", 0];
    },
};

const tableRowNodeSpec: NodeSpec = {
    content: "(table_cell | table_header)+",
    isolating: true,
    group: "table_block",
    selectable: false,
    parseDOM: [{ tag: "tr" }],
    toDOM() {
        return ["tr", 0];
    },
};

const tableCellNodeSpec: NodeSpec = {
    content: "inline*",
    isolating: true,
    group: "table_block",
    selectable: false,
    attrs: {
        style: { default: null },
    },
    parseDOM: [
        {
            tag: "td",
            getAttrs(dom: HTMLElement) {
                const textAlign = dom.style.textAlign;
                return textAlign ? { style: `text-align: ${textAlign}` } : null;
            },
        },
    ],
    toDOM(node) {
        return ["td", node.attrs, 0];
    },
};

const tableHeaderNodeSpec: NodeSpec = {
    content: "inline*",
    isolating: true,
    group: "table_block",
    selectable: false,
    attrs: {
        style: { default: null },
    },
    parseDOM: [
        {
            tag: "th",
            getAttrs(dom: HTMLElement) {
                const textAlign = dom.style.textAlign;
                return textAlign ? { style: `text-align: ${textAlign}` } : null;
            },
        },
    ],
    toDOM(node) {
        return ["th", node.attrs, 0];
    },
};

export const generateTableSpec = (s: PluginSchemaSpec): PluginSchemaSpec => {
    s.nodes
        .addToEnd("table", tableNodeSpec)
        .addToEnd("table_head", tableHeadNodeSpec)
        .addToEnd("table_body", tableBodyNodeSpec)
        .addToEnd("table_row", tableRowNodeSpec)
        .addToEnd("table_cell", tableCellNodeSpec)
        .addToEnd("table_header", tableHeaderNodeSpec);
    return s;
};
