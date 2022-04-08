import OrderedMap from "orderedmap";
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
import { escapeHTML } from "./utils";

//TODO this relies on Stacks classes, should we abstract?

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
            {
                "class": "spoiler" + (node.attrs.revealed ? " is-visible" : ""),
                // TODO localization
                "data-spoiler": "Reveal spoiler",
            },
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

const defaultNodes = schema.spec.nodes as OrderedMap<NodeSpec>;

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
    .addBefore("image", "tagLink", tagLinkNodeSpec)
    .addBefore("blockquote", "spoiler", spoilerNodeSpec)
    .update("image", extendedImageSpec)
    .update("code_block", extendedCodeblockSpec);

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

const defaultMarks = schema.spec.marks as OrderedMap<MarkSpec>;

const defaultLinkMark = defaultMarks.get("link");
const extendedLinkMark: MarkSpec = {
    ...defaultLinkMark,
    ...{
        attrs: {
            ...defaultLinkMark.attrs,
            referenceType: { default: "" },
            referenceLabel: { default: "" },
        },
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

const defaultCodeMark = defaultMarks.get("code");
const extendedCodeMark: MarkSpec = {
    ...defaultCodeMark,
    exitable: true,
    inclusive: true,
};

const marks = defaultMarks
    .addBefore(
        "strong",
        "strike",
        genHtmlInlineMarkSpec({}, "del", "s", "strike")
    )
    .addBefore(
        "strong",
        "kbd",
        genHtmlInlineMarkSpec({ exitable: true, inclusive: true }, "kbd")
    )
    .addBefore("strong", "sup", genHtmlInlineMarkSpec({}, "sup"))
    .addBefore("strong", "sub", genHtmlInlineMarkSpec({}, "sub"))
    .update("link", extendedLinkMark)
    .update("code", extendedCodeMark);

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

// create our new, final schema using the extended nodes/marks taken from `schema`
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

/** Parses out a Prosemirror document from a code (markdown) string */
export class CodeStringParser extends DOMParser {
    // TODO missing from @types
    declare static schemaRules: (schema: Schema) => ParseRule[];

    public parseCode(content: string, options?: ParseOptions): ProseMirrorNode {
        const node = document.createElement("div");
        node.innerHTML = escapeHTML`<pre>${content}</pre>`;

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
