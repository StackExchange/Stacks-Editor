import { toggleMark } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import {
    insertCommonmarkLinkCommand,
    insertCommonmarkImageCommand,
    insertCommonmarkTableCommand,
    insertCommonmarkHorizontalRuleCommand,
    insertTagLinkCommand,
    spoilerCommand,
    kbdCommand,
    supCommand,
    subCommand,
    headerCommand,
    boldCommand,
    emphasisCommand,
    inlineCodeCommand,
    strikethroughCommand,
    blockquoteCommand,
    insertCodeblockCommand,
    orderedListCommand,
    unorderedListCommand,
} from "../../commonmark/commands";
import {
    inTable,
    removeColumnCommand,
    insertTableColumnBeforeCommand,
    insertTableColumnAfterCommand,
    removeRowCommand,
    insertTableRowBeforeCommand,
    insertTableRowAfterCommand,
    toggleHeadingLevel,
    toggleTagLinkCommand,
    toggleWrapIn,
    toggleBlockType,
    nodeTypeActive,
    markActive,
    insertRichTextLinkCommand,
    insertRichTextImageCommand,
    insertRichTextHorizontalRuleCommand,
    insertRichTextTableCommand,
    toggleList,
    toggleCodeBlock,
} from "../../rich-text/commands";
import { _t } from "../localization";
import { makeMenuButton, makeMenuDropdown } from "./helpers";
import { getShortcut } from "../utils";
import { CommonViewOptions, EditorType } from "../view";
import {
    makeDropdownSection,
    makeDropdownItem,
    addIf,
    makeMenuLinkEntry,
    MenuBlock,
} from "./helpers";

/**
 * Creates a dropdown menu for table edit functionality
 */
const tableDropdown = () =>
    makeMenuDropdown(
        "Table",
        _t("commands.table_edit"),
        "table-dropdown",
        (state: EditorState) => inTable(state.schema, state.selection),
        () => false,
        makeDropdownSection("Column", "columnSection"),
        makeDropdownItem(
            _t("commands.table_column.remove"),
            {
                richText: removeColumnCommand,
                commonmark: null,
            },
            "remove-column-btn"
        ),
        makeDropdownItem(
            _t("commands.table_column.insert_before"),
            { richText: insertTableColumnBeforeCommand, commonmark: null },
            "insert-column-before-btn"
        ),
        makeDropdownItem(
            _t("commands.table_column.insert_after"),
            { richText: insertTableColumnAfterCommand, commonmark: null },

            "insert-column-after-btn"
        ),

        makeDropdownSection("Row", "rowSection"),
        makeDropdownItem(
            _t("commands.table_row.remove"),
            { richText: removeRowCommand, commonmark: null },
            "remove-row-btn"
        ),
        makeDropdownItem(
            _t("commands.table_row.insert_before"),
            { richText: insertTableRowBeforeCommand, commonmark: null },
            "insert-row-before-btn"
        ),
        makeDropdownItem(
            _t("commands.table_row.insert_after"),
            { richText: insertTableRowAfterCommand, commonmark: null },
            "insert-row-after-btn"
        )
    );

/**
 * Creates a dropdown menu for heading formatting
 * @param schema The finalized rich-text schema
 */
const headingDropdown = (schema: Schema) =>
    makeMenuDropdown(
        "Header",
        _t("commands.heading.dropdown", { shortcut: getShortcut("Mod-H") }),
        "heading-dropdown",
        () => true,
        nodeTypeActive(schema.nodes.heading),
        makeDropdownItem(
            _t("commands.heading.entry", { level: 1 }),
            {
                richText: {
                    command: toggleHeadingLevel({ level: 1 }),
                    active: nodeTypeActive(schema.nodes.heading, { level: 1 }),
                },
                commonmark: null,
            },
            "h1-btn",
            ["fs-body3"]
        ),
        makeDropdownItem(
            _t("commands.heading.entry", { level: 2 }),
            {
                richText: {
                    command: toggleHeadingLevel({ level: 2 }),
                    active: nodeTypeActive(schema.nodes.heading, { level: 2 }),
                },
                commonmark: null,
            },
            "h2-btn",
            ["fs-body2"]
        ),
        makeDropdownItem(
            _t("commands.heading.entry", { level: 3 }),
            {
                richText: {
                    command: toggleHeadingLevel({ level: 3 }),
                    active: nodeTypeActive(schema.nodes.heading, { level: 3 }),
                },
                commonmark: null,
            },
            "h3-btn",
            ["fs-body1"]
        )
    );

/**
 * Creates a dropdown menu containing misc formatting tools
 * @param schema The finalized rich-text schema
 * @param options The options for the editor
 */
const moreFormattingDropdown = (schema: Schema, options: CommonViewOptions) =>
    makeMenuDropdown(
        "EllipsisHorizontal",
        _t("commands.moreFormatting"),
        "more-formatting-dropdown",
        () => true,
        () => false,
        makeDropdownItem(
            _t("commands.tagLink", { shortcut: getShortcut("Mod-[") }),
            {
                richText: {
                    command: toggleTagLinkCommand(
                        options.parserFeatures?.tagLinks,
                        false
                    ),
                    active: nodeTypeActive(schema.nodes.tagLink),
                },
                commonmark: insertTagLinkCommand(
                    options.parserFeatures?.tagLinks,
                    false
                ),
            },
            "tag-btn"
        ),
        addIf(
            makeDropdownItem(
                _t("commands.metaTagLink", { shortcut: getShortcut("Mod-]") }),
                {
                    richText: {
                        command: toggleTagLinkCommand(
                            options.parserFeatures?.tagLinks,
                            true
                        ),
                        active: nodeTypeActive(schema.nodes.tagLink),
                    },
                    commonmark: insertTagLinkCommand(
                        options.parserFeatures?.tagLinks,
                        true
                    ),
                },
                "meta-tag-btn"
            ),
            !options.parserFeatures?.tagLinks?.disableMetaTags
        ),
        makeDropdownItem(
            _t("commands.spoiler", { shortcut: getShortcut("Mod-/") }),
            {
                richText: {
                    command: toggleWrapIn(schema.nodes.spoiler),
                    active: nodeTypeActive(schema.nodes.spoiler),
                },
                commonmark: spoilerCommand,
            },
            "spoiler-btn"
        ),
        makeDropdownItem(
            _t("commands.sub", { shortcut: getShortcut("Mod-,") }),
            {
                richText: {
                    command: toggleMark(schema.marks.sub),
                    active: markActive(schema.marks.sub),
                },
                commonmark: subCommand,
            },
            "subscript-btn"
        ),
        makeDropdownItem(
            _t("commands.sup", { shortcut: getShortcut("Mod-.") }),
            {
                richText: {
                    command: toggleMark(schema.marks.sup),
                    active: markActive(schema.marks.sup),
                },
                commonmark: supCommand,
            },
            "superscript-btn"
        ),
        makeDropdownItem(
            _t("commands.kbd", { shortcut: getShortcut("Mod-'") }),
            {
                richText: {
                    command: toggleMark(schema.marks.kbd),
                    active: markActive(schema.marks.kbd),
                },
                commonmark: kbdCommand,
            },
            "kbd-btn"
        )
    );

/**
 * Creates all menu entries for both the rich-text and commonmark editors
 * @param schema The finalized schema for the current editor
 * @param options The options for the editor
 * @param editorType The current editor type
 * @internal
 */
export const createMenuEntries = (
    schema: Schema,
    options: CommonViewOptions,
    editorType: EditorType
): MenuBlock[] => [
    {
        name: "formatting1", // TODO better name?
        priority: 0,
        entries: [
            addIf(headingDropdown(schema), editorType === EditorType.RichText),
            addIf(
                {
                    key: "toggleHeading",
                    richText: null,
                    commonmark: headerCommand,
                    display: makeMenuButton(
                        "Header",
                        _t("commands.heading.dropdown", {
                            shortcut: getShortcut("Mod-H"),
                        }),
                        "heading-btn"
                    ),
                },
                editorType === EditorType.Commonmark
            ),
            {
                key: "toggleBold",
                richText: {
                    command: toggleMark(schema.marks.strong),
                    active: markActive(schema.marks.strong),
                },
                commonmark: boldCommand,
                display: makeMenuButton(
                    "Bold",
                    _t("commands.bold", { shortcut: getShortcut("Mod-B") }),
                    "bold-btn"
                ),
            },
            {
                key: "toggleEmphasis",
                richText: {
                    command: toggleMark(schema.marks.em),
                    active: markActive(schema.marks.em),
                },
                commonmark: emphasisCommand,
                display: makeMenuButton(
                    "Italic",
                    _t("commands.emphasis", { shortcut: getShortcut("Mod-I") }),
                    "italic-btn"
                ),
            },
            addIf(
                {
                    key: "toggleStrike",
                    richText: {
                        command: toggleMark(schema.marks.strike),
                        active: markActive(schema.marks.strike),
                    },
                    commonmark: strikethroughCommand,
                    display: makeMenuButton(
                        "Strikethrough",
                        _t("commands.strikethrough"),
                        "strike-btn"
                    ),
                },
                options.parserFeatures?.extraEmphasis
            ),
        ],
    },
    {
        name: "code-formatting",
        priority: 5,
        entries: [
            {
                key: "toggleCode",
                richText: {
                    command: toggleMark(schema.marks.code),
                    active: markActive(schema.marks.code),
                },
                commonmark: inlineCodeCommand,
                display: makeMenuButton(
                    "Code",
                    {
                        title: _t("commands.inline_code.title", {
                            shortcut: getShortcut("Mod-K"),
                        }),
                        description: _t("commands.inline_code.description"),
                    },
                    "code-btn"
                ),
            },
            {
                key: "toggleCodeblock",
                richText: {
                    // command: toggleBlockType(schema.nodes.code_block),
                    command: toggleCodeBlock(),
                    active: nodeTypeActive(schema.nodes.code_block),
                },
                commonmark: insertCodeblockCommand,
                display: makeMenuButton(
                    "CodeblockAlt",
                    {
                        title: _t("commands.code_block.title", {
                            shortcut: getShortcut("Mod-M"),
                        }),
                        description: _t("commands.code_block.description"),
                    },
                    "code-block-btn"
                ),
            },
        ],
    },
    {
        name: "formatting2", // TODO better name?
        priority: 10,
        entries: [
            {
                key: "toggleLink",
                richText: insertRichTextLinkCommand,
                commonmark: insertCommonmarkLinkCommand,
                display: makeMenuButton(
                    "Link",
                    _t("commands.link", { shortcut: getShortcut("Mod-L") }),
                    "insert-link-btn"
                ),
            },
            {
                key: "toggleBlockquote",
                richText: {
                    command: toggleWrapIn(schema.nodes.blockquote),
                    active: nodeTypeActive(schema.nodes.blockquote),
                },
                commonmark: blockquoteCommand,
                display: makeMenuButton(
                    "Quote",
                    _t("commands.blockquote", {
                        shortcut: getShortcut("Mod-Q"),
                    }),
                    "blockquote-btn"
                ),
            },
            addIf(
                {
                    key: "insertImage",
                    richText: insertRichTextImageCommand,
                    commonmark: insertCommonmarkImageCommand,
                    display: makeMenuButton(
                        "Image",
                        _t("commands.image", {
                            shortcut: getShortcut("Mod-G"),
                        }),
                        "insert-image-btn"
                    ),
                },
                !!options.imageUpload?.handler
            ),
            addIf(
                {
                    key: "insertTable",
                    richText: {
                        command: insertRichTextTableCommand,
                        visible: (state: EditorState) =>
                            !inTable(state.schema, state.selection),
                    },
                    commonmark: insertCommonmarkTableCommand,
                    display: makeMenuButton(
                        "Table",
                        _t("commands.table_insert", {
                            shortcut: getShortcut("Mod-E"),
                        }),
                        "insert-table-btn"
                    ),
                },
                options.parserFeatures?.tables
            ),
            addIf(
                editorType === EditorType.RichText && tableDropdown(),
                options.parserFeatures?.tables
            ),
        ],
    },
    {
        name: "formatting3", // TODO better name?
        priority: 20,
        entries: [
            {
                key: "toggleOrderedList",
                richText: {
                    command: toggleList(
                        schema.nodes.ordered_list,
                        schema.nodes.list_item
                    ),
                    active: nodeTypeActive(schema.nodes.ordered_list),
                },
                commonmark: orderedListCommand,
                display: makeMenuButton(
                    "OrderedList",
                    _t("commands.ordered_list", {
                        shortcut: getShortcut("Mod-O"),
                    }),
                    "numbered-list-btn"
                ),
            },
            {
                key: "toggleUnorderedList",
                richText: {
                    command: toggleList(
                        schema.nodes.bullet_list,
                        schema.nodes.list_item
                    ),
                    active: nodeTypeActive(schema.nodes.bullet_list),
                },
                commonmark: unorderedListCommand,
                display: makeMenuButton(
                    "UnorderedList",
                    _t("commands.unordered_list", {
                        shortcut: getShortcut("Mod-U"),
                    }),
                    "bullet-list-btn"
                ),
            },
            {
                key: "insertRule",
                richText: insertRichTextHorizontalRuleCommand,
                commonmark: insertCommonmarkHorizontalRuleCommand,
                display: makeMenuButton(
                    "HorizontalRule",
                    _t("commands.horizontal_rule", {
                        shortcut: getShortcut("Mod-R"),
                    }),
                    "horizontal-rule-btn"
                ),
            },
            moreFormattingDropdown(schema, options),
        ],
    },
    {
        name: "history",
        priority: 30,
        entries: [
            {
                key: "undo-btn",
                richText: undo,
                commonmark: undo,
                display: makeMenuButton(
                    "Undo",
                    _t("commands.undo", { shortcut: getShortcut("Mod-Z") }),
                    "undo-btn"
                ),
            },
            {
                key: "redo-btn",
                richText: redo,
                commonmark: redo,
                display: makeMenuButton(
                    "Refresh",
                    _t("commands.redo", { shortcut: getShortcut("Mod-Y") }),
                    "redo-btn"
                ),
            },
        ],
        classes: ["d-none sm:d-inline-flex vk:d-inline-flex"],
    },
    {
        name: "other",
        priority: 40,
        entries: [
            //TODO eventually this will mimic the "help" dropdown in the prod editor
            makeMenuLinkEntry(
                "Help",
                _t("commands.help"),
                options.editorHelpLink,
                "help-link"
            ),
        ],
    },
];
