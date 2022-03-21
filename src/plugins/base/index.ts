import OrderedMap from "orderedmap";
import { toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { schema } from "prosemirror-markdown";
import { MarkSpec, Node, NodeSpec } from "prosemirror-model";
import { EditorPlugin, MenuBlock, PluginSchemaSpec } from "../../builder/types";
import * as commonmarkCommands from "../../commonmark/commands";
import * as richTextCommands from "../../rich-text/commands";
import { richTextInputRules_new } from "../../rich-text/inputrules";
import { CodeBlockView } from "../../rich-text/node-views/code-block";
import { CodeBlockHighlightPlugin } from "../../shared/highlighting/highlight-plugin";
import { makeMenuIcon } from "../../shared/menu";
import { readonlyPlugin } from "../../shared/prosemirror-plugins/readonly";

function generateBasicSchema(): PluginSchemaSpec {
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

    const nodes = defaultNodes
        .addBefore("image", "softbreak", softbreakSpec)
        .update("image", extendedImageSpec)
        .update("code_block", extendedCodeblockSpec);

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
    return {
        nodes: nodes,
        marks: marks,
    };
}

function generateBasicMenu(): MenuBlock[] {
    return [
        {
            name: "area1", // TODO
            priority: 0,
            entries: [
                {
                    key: "toggleHeading",
                    richText: {
                        command: richTextCommands.toggleBlockType(
                            schema.nodes.heading,
                            { level: 1 }
                        ),
                        active: richTextCommands.nodeTypeActive(
                            schema.nodes.heading
                        ),
                    },
                    commonmark: commonmarkCommands.headerCommand,
                    dom: makeMenuIcon("Header", "Heading", "heading-btn"),
                },
                {
                    key: "toggleBold",
                    richText: {
                        command: toggleMark(schema.marks.strong),
                        active: richTextCommands.markActive(
                            schema.marks.strong
                        ),
                    },
                    commonmark: commonmarkCommands.boldCommand,
                    dom: makeMenuIcon("Bold", "Bold", "bold-btn"),
                },
                {
                    key: "toggleEmphasis",
                    richText: {
                        command: toggleMark(schema.marks.em),
                        active: richTextCommands.markActive(schema.marks.em),
                    },
                    commonmark: commonmarkCommands.emphasisCommand,
                    dom: makeMenuIcon("Italic", "Italic", "italic-btn"),
                },
                {
                    key: "toggleCode",
                    richText: {
                        command: toggleMark(schema.marks.code),
                        active: richTextCommands.markActive(schema.marks.code),
                    },
                    commonmark: commonmarkCommands.inlineCodeCommand,
                    dom: makeMenuIcon("Code", "Inline code", "code-btn"),
                },
            ],
        },
        {
            name: "area2", // TODO
            priority: 10,
            entries: [
                {
                    key: "toggleLink",
                    richText: { command: richTextCommands.insertLinkCommand },
                    commonmark: commonmarkCommands.insertLinkCommand,
                    dom: makeMenuIcon("Link", "Insert link", "insert-link-btn"),
                },
                {
                    key: "toggleBlockquote",
                    richText: {
                        command: richTextCommands.toggleWrapIn(
                            schema.nodes.blockquote
                        ),
                        active: richTextCommands.nodeTypeActive(
                            schema.nodes.blockquote
                        ),
                    },
                    commonmark: commonmarkCommands.blockquoteCommand,
                    dom: makeMenuIcon("Quote", "Blockquote", "blockquote-btn"),
                },
                {
                    key: "insertCodeblock",
                    richText: {
                        command: richTextCommands.toggleBlockType(
                            schema.nodes.code_block
                        ),
                        active: richTextCommands.nodeTypeActive(
                            schema.nodes.code_block
                        ),
                    },
                    commonmark: commonmarkCommands.insertCodeblockCommand,
                    dom: makeMenuIcon(
                        "Codeblock",
                        "Insert code block",
                        "code-block-btn"
                    ),
                },
            ],
        },
        {
            name: "area3", // TODO
            priority: 20,
            entries: [
                {
                    key: "toggleOrderedList",
                    richText: {
                        command: richTextCommands.toggleWrapIn(
                            schema.nodes.ordered_list
                        ),
                        active: richTextCommands.nodeTypeActive(
                            schema.nodes.ordered_list
                        ),
                    },
                    commonmark: commonmarkCommands.orderedListCommand,
                    dom: makeMenuIcon(
                        "OrderedList",
                        "Numbered list",
                        "numbered-list-btn"
                    ),
                },
                {
                    key: "toggleUnorderedList",
                    richText: {
                        command: richTextCommands.toggleWrapIn(
                            schema.nodes.bullet_list
                        ),
                        active: richTextCommands.nodeTypeActive(
                            schema.nodes.bullet_list
                        ),
                    },
                    commonmark: commonmarkCommands.unorderedListCommand,
                    dom: makeMenuIcon(
                        "UnorderedList",
                        "Bulleted list",
                        "bullet-list-btn"
                    ),
                },
                {
                    key: "insertRule",
                    richText: richTextCommands.insertHorizontalRuleCommand,
                    commonmark: commonmarkCommands.insertHorizontalRuleCommand,
                    dom: makeMenuIcon(
                        "HorizontalRule",
                        "Insert Horizontal rule",
                        "horizontal-rule-btn"
                    ),
                },
            ],
        },
        {
            name: "area4", // TODO
            priority: 30,
            entries: [
                {
                    key: "undo",
                    richText: undo,
                    commonmark: undo,
                    dom: makeMenuIcon("Undo", "Undo", "undo-btn", [
                        "sm:d-inline-block",
                    ]),
                    //visible: () => false, // TODO
                },
                {
                    key: "redo",
                    richText: redo,
                    commonmark: redo,
                    dom: makeMenuIcon("Refresh", "Redo", "redo-btn", [
                        "sm:d-inline-block",
                    ]),
                    //visible: () => false, // TODO
                },
            ],
        },
        {
            name: "help",
            priority: 40,
            entries: [
                //TODO eventually this will mimic the "help" dropdown in the prod editor
                //makeMenuLinkEntry("Help", "Help", options.editorHelpLink),
            ],
        },
    ];
}

interface BasePluginOptions {
    /** The method used to validate links; defaults to Stack Overflow's link validation */
    validateLink?: (url: string) => boolean | false;
    codeblockOverrideLanguage?: string;
}

export const basePlugin: EditorPlugin<BasePluginOptions> = {
    optionDefaults: {},
    schema: generateBasicSchema,
    commonmark: () => ({
        plugins: [history(), CodeBlockHighlightPlugin(null), readonlyPlugin()],
    }),
    richText: (options) => ({
        plugins: [
            history(),
            CodeBlockHighlightPlugin(options.codeblockOverrideLanguage),
            readonlyPlugin(),
        ],
        inputRules: richTextInputRules_new({
            validateLink: options.validateLink,
        }),
        nodeViews: {
            code_block(node: Node) {
                return new CodeBlockView(node);
            },
        },
    }),

    menu: generateBasicMenu,
};
