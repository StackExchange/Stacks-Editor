import { escapeHtml } from "markdown-it/lib/common/utils";
import OrderedMap from "orderedmap";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error for some reason, schema is not in the types...
import { schema } from "prosemirror-markdown";
import {
    DOMParser,
    MarkSpec,
    Node as ProseMirrorNode,
    NodeSpec,
    ParseOptions,
    ParseRule,
    Schema,
} from "prosemirror-model";

//TODO this relies on Stacks classes, should we abstract?

// TODO this is to cast schema above to a type since it isn't exposed by @types
const defaultSchema: Schema = schema as Schema;

/**
 * Defines an uneditable html_block node; Only appears when a user has written a "complicated" html_block
 * i.e. anything not resembling `<tag>content</tag>` or `<tag />`
 */
const htmlBlockSpec: NodeSpec = {
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
};

/**
 * Defines an uneditable html_inline node; These should very rarely appear in cases where
 * a user has a "valid", but unpaired html_inline tag (e.g. `test</em>`)
 */
const htmlInlineSpec: NodeSpec = {
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
};

/**
 * Represents an `html_block` node that was split by a newline, then put back together post-tokenization.
 * The "content" of the container is editable, but the leading/trailing html is not.
 * e.g `<blockquote>**Test**\n\n_test_</blockquote>` will have the `_test_` editable, but not the `**Test**`
 */
const htmlBlockContainerSpec: NodeSpec = {
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
};

// manually render softbreaks, making sure to mark them
// so we when parse them back out we can convert back to \n for markdown
const softbreakSpec: NodeSpec = {
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
};

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
            { class: "spoiler" + (node.attrs.revealed ? " is-visible" : "") },
            0,
        ];
    },
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

const defaultNodes = defaultSchema.spec.nodes as OrderedMap<NodeSpec>;

const extendedImageSpec: NodeSpec = {
    ...defaultNodes.get("image"),
    ...{
        attrs: {
            src: {},
            alt: { default: null },
            title: { default: null },
            width: { default: null },
            height: { default: null },
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
};

const extendedCodeblockSpec: NodeSpec = {
    ...defaultNodes.get("code_block"),
    ...{
        attrs: {
            params: { default: "" },
            detectedHighlightLanguage: { default: "" },
        },
    },
};

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

// TODO should this be a mark instead?
const tagLinkNodeSpec: NodeSpec = {
    content: "text*",
    marks: "", // TODO should it accept marks?
    atom: true, // TODO allow this to be editable
    inline: true,
    group: "inline",
    attrs: {
        tagName: { default: null },
        tagType: { default: "tag" },
    },
};

const nodes = defaultNodes
    .addBefore("image", "pre", genHtmlBlockNodeSpec("pre"))
    .addBefore("image", "html_block", htmlBlockSpec)
    .addBefore("image", "html_inline", htmlInlineSpec)
    .addBefore("image", "html_block_container", htmlBlockContainerSpec)
    .addBefore("image", "softbreak", softbreakSpec)
    .addBefore("image", "table", tableNodeSpec)
    .addBefore("image", "table_head", tableHeadNodeSpec)
    .addBefore("image", "table_body", tableBodyNodeSpec)
    .addBefore("image", "table_row", tableRowNodeSpec)
    .addBefore("image", "table_cell", tableCellNodeSpec)
    .addBefore("image", "table_header", tableHeaderNodeSpec)
    .addBefore("image", "tagLink", tagLinkNodeSpec)
    .addBefore("blockquote", "spoiler", spoilerNodeSpec)
    .update("image", extendedImageSpec)
    .update("code_block", extendedCodeblockSpec);

/**
 * Creates a generic html MarkSpec for an inline html tag
 * @param tag The name of the tag to use in the Prosemirror dom
 */
function genHtmlInlineMarkSpec(...tags: string[]): MarkSpec {
    return {
        toDOM() {
            return [tags[0], 0];
        },
        parseDOM: tags.map((tag) => ({ tag: tag })),
    };
}

const defaultMarks = defaultSchema.spec.marks as OrderedMap<MarkSpec>;

const extendedLinkMark: MarkSpec = {
    ...defaultMarks.get("link"),
    ...{
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
};

const marks = defaultMarks
    .addBefore("strong", "strike", genHtmlInlineMarkSpec("del", "s", "strike"))
    .addBefore("strong", "kbd", genHtmlInlineMarkSpec("kbd"))
    .addBefore("strong", "sup", genHtmlInlineMarkSpec("sup"))
    .addBefore("strong", "sub", genHtmlInlineMarkSpec("sub"))
    .update("link", extendedLinkMark);

// for *every* mark, add in support for the `markup` attribute
// we use this to save the "original" html tag used to create the mark when converting from html markdown
// this is important because a user could use either `<b>` or `<strong>` to create bold, and we want to preserve this when converting back
marks.forEach((k: string, node: MarkSpec) => {
    const attrs = node.attrs || {};
    attrs.markup = { default: "" };
    node.attrs = attrs;
});

// ditto for nodes
nodes.forEach((k: string, node: NodeSpec) => {
    if (k === "text") {
        return;
    }

    const attrs = node.attrs || {};
    attrs.markup = { default: "" };
    node.attrs = attrs;
});

// create our new, final schema using the extended nodes/marks taken from `defaultSchema`
export const richTextSchema = new Schema({
    nodes: nodes,
    marks: marks,
});

export const tableNodes = [
    richTextSchema.nodes.table,
    richTextSchema.nodes.table_head,
    richTextSchema.nodes.table_body,
    richTextSchema.nodes.table_row,
    richTextSchema.nodes.table_cell,
    richTextSchema.nodes.table_header,
];

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
            // don't let the user select / delete with (ctrl+a)
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

/** Parses out a Prosemirror document from a code (markdown) string */
export class CodeStringParser extends DOMParser {
    // TODO missing from @types
    declare static schemaRules: (schema: Schema) => ParseRule[];

    public parseCode(content: string, options?: ParseOptions): ProseMirrorNode {
        const htmlContent = "<pre>" + escapeHtml(content) + "</pre>";
        const node = document.createElement("div");
        node.innerHTML = htmlContent;

        return super.parse(node, options);
    }

    static fromSchema(schema: Schema): CodeStringParser {
        return (
            (schema.cached.domParser as CodeStringParser) ||
            (schema.cached.domParser = new CodeStringParser(
                schema,
                CodeStringParser.schemaRules(schema)
            ))
        );
    }

    static toString(node: ProseMirrorNode): string {
        return node.textBetween(0, node.content.size, "\n\n");
    }
}
