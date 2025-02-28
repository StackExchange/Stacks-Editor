import { Attrs, MarkSpec, NodeSpec } from "prosemirror-model";
import { _t } from "../shared/localization";

//TODO this relies on Stacks classes, should we abstract?

/** Base rich-text schema; heavily inspired by prosemirror-markdown's schema */

const nodes: {
    [name: string]: NodeSpec;
} = {
    doc: {
        content: "block+",
    },

    paragraph: {
        content: "inline*",
        group: "block",
        parseDOM: [{ tag: "p" }],
        toDOM() {
            return ["p", 0];
        },
    },

    /** IMPORTANT: This needs be be set _before_ blockquote below, since they share the same tag in parseDOM */
    spoiler: {
        content: "block+",
        group: "block",
        attrs: { revealed: { default: false } },
        parseDOM: [
            {
                priority: 1,
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
                    "class":
                        "spoiler" + (node.attrs.revealed ? " is-visible" : ""),
                    "data-spoiler": _t("nodes.spoiler_reveal_text"),
                },
                0,
            ];
        },
    },

    blockquote: {
        content: "block+",
        group: "block",
        parseDOM: [{ tag: "blockquote" }],
        toDOM() {
            return ["blockquote", 0];
        },
    },

    horizontal_rule: {
        group: "block",
        parseDOM: [{ tag: "hr" }],
        toDOM() {
            return ["div", ["hr"]];
        },
    },

    heading: {
        attrs: { level: { default: 1 } },
        content: "inline*",
        group: "block",
        defining: true,
        parseDOM: [
            { tag: "h1", attrs: { level: 1 } },
            { tag: "h2", attrs: { level: 2 } },
            { tag: "h3", attrs: { level: 3 } },
            { tag: "h4", attrs: { level: 4 } },
            { tag: "h5", attrs: { level: 5 } },
            { tag: "h6", attrs: { level: 6 } },
        ],
        toDOM(node) {
            return ["h" + <string>node.attrs.level, 0];
        },
    },

    code_block: {
        content: "text*",
        group: "block",
        code: true,
        defining: true,
        marks: "",
        attrs: {
            params: { default: "" },
            language: { default: "" },
            isEditingProcessor: { default: false },
        },
        parseDOM: [
            {
                tag: "pre",
                preserveWhitespace: "full",
                getAttrs: (node: HTMLElement) => ({
                    params: node.getAttribute("data-params") || "",
                }),
            },
        ],
        toDOM(node) {
            return [
                "pre",
                node.attrs.params
                    ? { "data-params": node.attrs.params as string }
                    : {},
                ["code", 0],
            ];
        },
    },

    ordered_list: {
        content: "list_item+",
        group: "block",
        attrs: { order: { default: 1 }, tight: { default: false } },
        parseDOM: [
            {
                tag: "ol",
                getAttrs(dom: HTMLElement) {
                    return {
                        order: dom.hasAttribute("start")
                            ? +dom.getAttribute("start")
                            : 1,
                        tight: dom.hasAttribute("data-tight"),
                    };
                },
            },
        ],
        toDOM(node) {
            return [
                "ol",
                {
                    "start":
                        node.attrs.order === 1
                            ? null
                            : String(node.attrs.order),
                    "data-tight": node.attrs.tight ? "true" : null,
                },
                0,
            ];
        },
    },

    bullet_list: {
        content: "list_item+",
        group: "block",
        attrs: { tight: { default: false } },
        parseDOM: [
            {
                tag: "ul",
                getAttrs: (dom: HTMLElement) => ({
                    tight: dom.hasAttribute("data-tight"),
                }),
            },
        ],
        toDOM(node) {
            return [
                "ul",
                { "data-tight": node.attrs.tight ? "true" : null },
                0,
            ];
        },
    },

    list_item: {
        content: "block+",
        defining: true,
        parseDOM: [{ tag: "li" }],
        toDOM() {
            return ["li", 0];
        },
    },

    text: {
        group: "inline",
    },

    image: {
        inline: true,
        group: "inline",
        draggable: true,
        attrs: {
            src: {},
            alt: { default: null },
            title: { default: null },
            width: { default: null },
            height: { default: null },
            referenceType: { default: "" },
            referenceLabel: { default: "" },
        },
        parseDOM: [
            {
                tag: "img[src]",
                getAttrs(dom: HTMLElement) {
                    return {
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        alt: dom.getAttribute("alt"),
                        height: dom.getAttribute("height"),
                        width: dom.getAttribute("width"),
                    };
                },
            },
        ],
        toDOM(node) {
            return ["img", node.attrs];
        },
    },

    hard_break: {
        inline: true,
        group: "inline",
        selectable: false,
        parseDOM: [{ tag: "br" }],
        toDOM() {
            return ["br"];
        },
    },

    pre: genHtmlBlockNodeSpec("pre"),

    /**
     * Defines an uneditable html_block node; Only appears when a user has written a "complicated" html_block
     * i.e. anything not resembling `<tag>content</tag>` or `<tag />`
     */
    html_block: {
        content: "text*",
        attrs: { content: { default: "" } },
        marks: "_",
        group: "block",
        atom: true,
        inline: false,
        selectable: true,
        // IMPORTANT! Removing this will cause inline content to be "collapsed" upwards, removing the metadata
        defining: true,
        // isolating set true so we don't allow outside content to accidentally enter this node (preserves html inside)
        isolating: true,
        parseDOM: [{ tag: "div.html_block" }],
        toDOM(node) {
            return [
                "div",
                {
                    class: "html_block",
                },
                node.attrs.content,
            ];
        },
    },

    /**
     * Defines an uneditable html_inline node; These should very rarely appear in cases where
     * a user has a "valid", but unpaired html_inline tag (e.g. `test</em>`)
     */
    html_inline: {
        content: "text*",
        attrs: { content: { default: "" } },
        marks: "_",
        group: "inline",
        atom: true,
        inline: true,
        selectable: true,
        // IMPORTANT! Removing this will cause inline content to be "collapsed" upwards, removing the metadata
        defining: true,
        // isolating set true so we don't allow outside content to accidentally enter this node (preserves html inside)
        isolating: true,
        parseDOM: [{ tag: "span.html_inline" }],
        toDOM(node) {
            return [
                "span",
                {
                    class: "html_inline",
                },
                node.attrs.content,
            ];
        },
    },

    /**
     * Represents an `html_block` node that was split by a newline, then put back together post-tokenization.
     * The "content" of the container is editable, but the leading/trailing html is not.
     * e.g `<blockquote>**Test**\n\n_test_</blockquote>` will have the `_test_` editable, but not the `**Test**`
     */
    html_block_container: {
        content: "block*",
        attrs: { contentOpen: { default: "" }, contentClose: { default: "" } },
        marks: "_",
        group: "block",
        inline: false,
        selectable: true,
        // IMPORTANT! Removing this will cause inline content to be "collapsed" upwards, removing the metadata
        defining: true,
        // isolating set true so we don't allow outside content to accidentally enter this node (preserves html inside)
        isolating: true,
    },

    // manually render softbreaks, making sure to mark them
    // so we when parse them back out we can convert back to \n for markdown
    softbreak: {
        content: "inline+",
        attrs: {},
        marks: "_",
        inline: true,
        group: "inline",
        // TODO accurate? necessary?
        parseDOM: [
            {
                tag: "span[softbreak]",
                getAttrs(node: HTMLElement) {
                    return {
                        content: node.innerHTML,
                    };
                },
            },
        ],
        toDOM() {
            return [
                "span",
                {
                    softbreak: "",
                },
                0,
            ];
        },
    },

    table: {
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
    },

    table_head: {
        content: "table_row",
        isolating: true,
        group: "table_block",
        selectable: false,
        parseDOM: [{ tag: "thead" }],
        toDOM() {
            return ["thead", 0];
        },
    },

    table_body: {
        content: "table_row+",
        isolating: true,
        group: "table_block",
        selectable: false,
        parseDOM: [{ tag: "tbody" }],
        toDOM() {
            return ["tbody", 0];
        },
    },

    table_row: {
        content: "(table_cell | table_header)+",
        isolating: true,
        group: "table_block",
        selectable: false,
        parseDOM: [{ tag: "tr" }],
        toDOM() {
            return ["tr", 0];
        },
    },

    table_cell: {
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
                    return textAlign
                        ? { style: `text-align: ${textAlign}` }
                        : null;
                },
            },
        ],
        toDOM(node) {
            return ["td", node.attrs, 0];
        },
    },

    table_header: {
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
                    return textAlign
                        ? { style: `text-align: ${textAlign}` }
                        : null;
                },
            },
        ],
        toDOM(node) {
            return ["th", node.attrs, 0];
        },
    },

    // TODO should this be a mark instead?
    tagLink: {
        content: "text*",
        marks: "", // TODO should it accept marks?
        atom: true, // TODO allow this to be editable
        inline: true,
        group: "inline",
        attrs: {
            tagName: { default: null },
            tagType: { default: "tag" },
        },
    },

    //...stackSnippetRichTextNodeSpec
};

const marks: {
    [name: string]: MarkSpec;
} = {
    em: {
        parseDOM: [
            { tag: "i" },
            { tag: "em" },
            {
                style: "font-style",
                getAttrs: (value: string): Attrs | false | null =>
                    value === "italic" && null,
            },
        ],
        toDOM() {
            return ["em"];
        },
    },

    strong: {
        parseDOM: [
            { tag: "b" },
            { tag: "strong" },
            {
                style: "font-weight",
                getAttrs: (value: string): Attrs | false | null =>
                    /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
            },
        ],
        toDOM() {
            return ["strong"];
        },
    },

    link: {
        inclusive: false,
        attrs: {
            href: {},
            title: { default: null },
            referenceType: { default: "" },
            referenceLabel: { default: "" },
        },
        parseDOM: [
            {
                tag: "a[href]",
                getAttrs(dom: HTMLElement) {
                    return {
                        href: dom.getAttribute("href"),
                        title: dom.getAttribute("title"),
                    };
                },
            },
        ],
        toDOM(node) {
            return [
                "a",
                {
                    href: node.attrs.href as string,
                    title: node.attrs.title as string,
                },
            ];
        },
    },

    code: {
        exitable: true,
        inclusive: true,
        parseDOM: [{ tag: "code" }],
        toDOM() {
            return ["code"];
        },
    },

    strike: genHtmlInlineMarkSpec({}, "del", "s", "strike"),

    kbd: genHtmlInlineMarkSpec({ exitable: true, inclusive: true }, "kbd"),

    sup: genHtmlInlineMarkSpec({}, "sup"),

    sub: genHtmlInlineMarkSpec({}, "sub"),
};

// for *every* mark, add in support for the `markup` attribute
// we use this to save the "original" html tag used to create the mark when converting from html markdown
// this is important because a user could use either `<b>` or `<strong>` to create bold, and we want to preserve this when converting back
Object.values(marks).forEach((node) => {
    const attrs = node.attrs || {};
    attrs.markup = { default: "" };
    node.attrs = attrs;
});

// ditto for nodes
Object.entries(nodes).forEach(([k, node]) => {
    if (k === "text") {
        return;
    }

    const attrs = node.attrs || {};
    attrs.markup = { default: "" };
    node.attrs = attrs;
});

/** The complete schema spec used by the rich-text editor */
export const richTextSchemaSpec = {
    nodes: nodes,
    marks: marks,
};

/**
 * Creates a generic html NodeSpec for a block html tag
 * @param tag The name of the tag to use in the Prosemirror dom
 */
function genHtmlBlockNodeSpec(tag: string): NodeSpec {
    return {
        content: "block+",
        marks: "",
        group: "block",
        inline: false,
        selectable: true,
        toDOM() {
            return [tag, 0];
        },
        parseDOM: [{ tag: tag }],
    };
}

/**
 * Creates a generic html MarkSpec for an inline html tag
 * @param tag The name of the tag to use in the Prosemirror dom
 */
function genHtmlInlineMarkSpec(
    attributes: Record<string, unknown>,
    ...tags: string[]
): MarkSpec {
    return {
        ...attributes,
        toDOM() {
            return [tags[0], 0];
        },
        parseDOM: tags.map((tag) => ({ tag: tag })),
    };
}
