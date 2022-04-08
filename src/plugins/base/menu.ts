import { toggleMark } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { schema } from "prosemirror-markdown";
import { MenuBlock } from "../../builder/types";
import * as commonmarkCommands from "../../commonmark/commands";
import * as richTextCommands from "../../rich-text/commands";
import { makeMenuIcon } from "../../shared/menu";
import { toggleBlockType, toggleWrapIn } from "../../utils/richtext-commands";

export function generateBasicMenu(): MenuBlock[] {
    return [
        {
            name: "area1", // TODO
            priority: 0,
            entries: [
                {
                    key: "toggleHeading",
                    richText: {
                        command: toggleBlockType(
                            schema.nodes.heading,
                            schema.nodes.paragraph,
                            {
                                level: 1,
                            }
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
                        command: toggleWrapIn(schema.nodes.blockquote),
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
                        command: toggleBlockType(
                            schema.nodes.code_block,
                            schema.nodes.paragraph
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
                        command: toggleWrapIn(schema.nodes.ordered_list),
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
                        command: toggleWrapIn(schema.nodes.bullet_list),
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
                    richText: {
                        command: undo,
                        visible: () => false,
                    },
                    commonmark: {
                        command: undo,
                        visible: () => false,
                    },
                    dom: makeMenuIcon("Undo", "Undo", "undo-btn", [
                        "sm:d-inline-block",
                    ]),
                },
                {
                    key: "redo",
                    richText: {
                        command: redo,
                        visible: () => false,
                    },
                    commonmark: {
                        command: redo,
                        visible: () => false,
                    },
                    dom: makeMenuIcon("Refresh", "Redo", "redo-btn", [
                        "sm:d-inline-block",
                    ]),
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
