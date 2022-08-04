import { setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { Mark, MarkType, NodeType, Schema } from "prosemirror-model";
import {
    Command,
    EditorState,
    TextSelection,
    Transaction,
    Selection,
} from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import {
    addIf,
    dropdownItem,
    dropdownSection,
    makeMenuDropdown,
    makeMenuButton,
    makeMenuLinkEntry,
    MenuBlock,
} from "../../shared/menu";
import {
    imageUploaderEnabled,
    showImageUploader,
} from "../../shared/prosemirror-plugins/image-upload";
import { getCurrentTextNode, getShortcut } from "../../shared/utils";
import type { CommonViewOptions, TagLinkOptions } from "../../shared/view";
import { showLinkEditor } from "../plugins/link-editor";
import { insertParagraphIfAtDocEnd } from "./helpers";
import {
    insertTableColumnAfterCommand,
    insertTableColumnBeforeCommand,
    insertTableCommand,
    insertTableRowAfterCommand,
    insertTableRowBeforeCommand,
    inTable,
    removeColumnCommand,
    removeRowCommand,
} from "./tables";
import { _t } from "../../shared/localization";

export * from "./tables";

// indent code with four [SPACE] characters (hope you aren't a "tabs" person)
const CODE_INDENT_STR = "    ";

/**
 * Builds a command which wraps/unwraps the current selection with the passed in node type
 * @param nodeType the type of node to wrap the selection in
 * @returns A command to toggle the wrapper node
 * Commands are functions that take a state and an optional
 * transaction dispatch function and...
 *
 *  - determine whether they apply to this state
 *  - if not, return false
 *  - if `dispatch` was passed, perform their effect, possibly by
 *    passing a transaction to `dispatch`
 *  - return true
 */
export function toggleWrapIn(nodeType: NodeType): Command {
    const nodeCheck = nodeTypeActive(nodeType);
    const wrapInCommand = wrapIn(nodeType);

    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        // if the node is not wrapped, go ahead and wrap it
        if (!nodeCheck(state)) {
            return wrapInCommand(state, dispatch);
        }

        const { $from, $to } = state.selection;
        const range = $from.blockRange($to);

        // check if there is a valid target to lift to
        const target = range && liftTarget(range);

        // if we cannot unwrap, return false
        if (target == null) {
            return false;
        }

        if (dispatch) {
            dispatch(state.tr.lift(range, target));
        }

        return true;
    };
}

/**
 * Creates a command that toggles the NodeType of the current node to the passed type
 * @param nodeType The type to toggle to
 * @param attrs? A key-value map of attributes that must be present on this node for it to be toggled off
 */
export function toggleBlockType(
    nodeType: NodeType,
    attrs?: { [key: string]: unknown }
) {
    return (state: EditorState, dispatch: (tr: Transaction) => void) => {
        const nodeCheck = nodeTypeActive(nodeType, attrs);

        // if the node is set, toggle it off
        if (nodeCheck(state)) {
            return setBlockType(state.schema.nodes.paragraph)(state, dispatch);
        }

        const setBlockTypeCommand = setBlockType(nodeType, attrs);
        return setBlockTypeCommand(state, (t) => {
            if (dispatch) {
                // when adding a block node, make sure the user can navigate past it
                dispatch(insertParagraphIfAtDocEnd(t));
            }
        });
    };
}

/**
 * Creates a command that toggles heading and cycles through heading levels
 * @param attrs? A key-value map of attributes that must be present on this node for it to be toggled off
 * @internal
 */
export function toggleHeadingLevel(attrs?: { [key: string]: unknown }) {
    return (state: EditorState, dispatch: (tr: Transaction) => void) => {
        const nodeType = state.schema.nodes.heading;
        const nodeCheck = nodeTypeActive(nodeType, attrs);
        const headingLevel = getHeadingLevel(state);

        // if the node is a heading and is either level 6 or matches the current level, toggle it off
        if (
            nodeCheck(state) &&
            (headingLevel === 6 || headingLevel === attrs?.level)
        ) {
            return setBlockType(state.schema.nodes.paragraph)(state, dispatch);
        }

        const updatedAttrs = !attrs?.level
            ? { ...attrs, level: headingLevel + 1 }
            : attrs;
        const setBlockTypeCommand = setBlockType(nodeType, updatedAttrs);
        return setBlockTypeCommand(state, (t) => {
            if (dispatch) {
                // when adding a block node, make sure the user can navigate past it
                dispatch(insertParagraphIfAtDocEnd(t));
            }
        });
    };
}

/**
 * Gets the start position of all lines inside code_block nodes in the current selection
 * @param state The current EditorState
 */
function getCodeBlockLinesWithinSelection(state: EditorState): number[] {
    const { from, to } = state.selection;
    const lineStartIndentPos: number[] = [];

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === "code_block") {
            let lineStartPos = pos + 1;
            let lineEndPos;

            node.textContent.split("\n").forEach((line) => {
                lineEndPos = lineStartPos + line.length;
                // Selection overlaps with line
                const selectionIsWithinLine =
                    // Selection is contained entirely within line
                    (from >= lineStartPos && to <= lineEndPos) ||
                    // Line is contained entirely within selection
                    (lineStartPos >= from && lineEndPos <= to) ||
                    // Selection start is within line
                    (from >= lineStartPos && from <= lineEndPos) ||
                    // Selection end is within line
                    (to >= lineStartPos && to <= lineEndPos);

                if (selectionIsWithinLine) {
                    lineStartIndentPos.push(lineStartPos);
                }

                lineStartPos = lineEndPos + 1;
            });
        }
    });

    return lineStartIndentPos;
}

/**
 * Indents selected line(s) within a code block
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 * @internal
 */
export function indentCodeBlockLinesCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    const linesToIndent = getCodeBlockLinesWithinSelection(state);
    const lineCount = linesToIndent.length;

    if (lineCount <= 0 || !dispatch) {
        return lineCount > 0;
    }

    let tr = state.tr;
    const { from, to } = state.selection;

    const indentStr = CODE_INDENT_STR;
    const fromIsCodeBlock =
        state.selection.$from.node().type.name === "code_block";

    // indent each line in reverse order so that we don't alter the lines' start positions
    linesToIndent.reverse().forEach((pos) => {
        tr = tr.insertText(indentStr, pos);
    });

    tr.setSelection(
        TextSelection.create(
            state.apply(tr).doc,
            fromIsCodeBlock ? from + indentStr.length : from,
            to + lineCount * indentStr.length
        )
    );

    dispatch(tr);

    return true;
}

/**
 * Unindents selected line(s) within a code block if able
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 * @internal
 */
export function unindentCodeBlockLinesCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    const linesToIndent = getCodeBlockLinesWithinSelection(state);
    const lineCount = linesToIndent.length;

    if (lineCount <= 0 || !dispatch) {
        return lineCount > 0;
    }

    let t = state.tr;
    const { from, to } = state.selection;
    let unindentedLinesCount = 0;
    const indentStr = CODE_INDENT_STR;
    const fromIsCodeBlock =
        state.selection.$from.node().type.name === "code_block";

    linesToIndent.reverse().forEach((pos) => {
        const canUnindent =
            state.doc.textBetween(pos, pos + indentStr.length) === indentStr;

        if (canUnindent) {
            t = t.insertText("", pos, pos + indentStr.length);
            unindentedLinesCount++;
        }
    });

    t.setSelection(
        TextSelection.create(
            state.apply(t).doc,
            fromIsCodeBlock && unindentedLinesCount
                ? from - indentStr.length
                : from,
            to - unindentedLinesCount * indentStr.length
        )
    );

    dispatch(t);

    return true;
}

/**
 * Returns the first heading level of the current selection
 * @param state The current editor state
 */
function getHeadingLevel(state: EditorState): number {
    const { from, to } = state.selection;
    let level = 0;
    state.doc.nodesBetween(from, to, (node) => {
        if (node.type.name === "heading") {
            level = node.attrs.level as number;
            return true;
        }
    });

    return level;
}

/**
 * Creates a command that toggles tagLink formatting for a node
 * @param validate The function to validate the tagName with
 * @param isMetaTag Whether the tag to be created is a meta tag or not
 */
export function toggleTagLinkCommand(
    validate: TagLinkOptions["validate"],
    isMetaTag: boolean
) {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        if (state.selection.empty) {
            return false;
        }

        if (!isValidTagLinkTarget(state.schema, state.selection)) {
            return false;
        }

        if (!dispatch) {
            return true;
        }

        let tr = state.tr;
        const nodeCheck = nodeTypeActive(state.schema.nodes.tagLink);
        if (nodeCheck(state)) {
            const selectedText = state.selection.content().content.firstChild
                .attrs["tagName"] as string;

            tr = state.tr.replaceSelectionWith(state.schema.text(selectedText));
        } else {
            const selectedText =
                state.selection.content().content.firstChild?.textContent;

            // If we have a trailing space, update the selection to not include it.
            if (selectedText.endsWith(" ")) {
                const { from, to } = state.selection;
                state.selection = TextSelection.create(state.doc, from, to - 1);
            }

            if (!validate(selectedText.trim(), isMetaTag)) {
                return false;
            }

            const newTagNode = state.schema.nodes.tagLink.create({
                tagName: selectedText.trim(),
                tagType: isMetaTag ? "meta-tag" : "tag",
            });

            tr = state.tr.replaceSelectionWith(newTagNode);
        }

        dispatch(tr);

        return true;
    };
}

/**
 * Validates whether the target of our selection is within a valid context. e.g. not in a link
 * @param schema Current editor schema
 * @param selection Current selection handle
 */
function isValidTagLinkTarget(schema: Schema, selection: Selection): boolean {
    const invalidNodeTypes = [
        schema.nodes.horizontal_rule,
        schema.nodes.code_block,
        schema.nodes.image,
    ];

    const invalidNodeMarks = [schema.marks.link, schema.marks.code];

    const hasInvalidMark =
        selection.$head.marks().filter((f) => invalidNodeMarks.includes(f.type))
            .length != 0;

    return (
        !invalidNodeTypes.includes(selection.$head.parent.type) &&
        !hasInvalidMark
    );
}

/**
 * Creates a command that inserts a horizontal rule node
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 */
export function insertHorizontalRuleCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (inTable(state.schema, state.selection)) {
        return false;
    }

    if (!dispatch) {
        return true;
    }

    const isAtEnd =
        state.doc.content.size - 1 ===
        Math.max(state.selection.from, state.selection.to);
    const isAtBeginning = state.tr.selection.from === 1;

    let tr = state.tr.replaceSelectionWith(
        state.schema.nodes.horizontal_rule.create()
    );

    if (isAtBeginning) {
        tr = tr.insert(0, state.schema.nodes.paragraph.create());
    }

    if (isAtEnd) {
        tr = tr.insert(tr.selection.to, state.schema.nodes.paragraph.create());
    }

    dispatch(tr);
    return true;
}

/**
 * Opens the image uploader pane
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 * @param view The current editor view
 */
export function insertImageCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView
): boolean {
    if (!imageUploaderEnabled(view.state)) {
        return false;
    }

    if (!dispatch) return true;

    showImageUploader(view);
    return true;
}

/**
 * Inserts a link into the document and opens the link edit tooltip at the cursor
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 * @param view The current editor view
 */
export function insertLinkCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView
): boolean {
    // never actually toggle the mark, as that is done in the link editor
    // we do want to *pretend* to, as toggleMark checks for validity
    const valid = toggleMark(state.schema.marks.link, { href: null })(
        state,
        null
    );

    if (dispatch && valid) {
        let selectedText: string;
        let linkUrl: string;

        const $anchor = state.selection.$anchor;
        // if selection is empty, but inside link mark, use the link url/text from it
        if (state.selection.empty && $anchor.textOffset) {
            const currentTextNode = getCurrentTextNode(state);
            const mark = currentTextNode.marks.find(
                (m) => m.type === state.schema.marks.link
            );
            if (mark) {
                selectedText = currentTextNode.text;
                linkUrl = mark.attrs.href as string;

                // expand the selection so we're editing the entire link
                const pos = $anchor.pos;
                dispatch(
                    state.tr.setSelection(
                        TextSelection.create(
                            state.doc,
                            pos - $anchor.textOffset,
                            pos - $anchor.textOffset + selectedText.length
                        )
                    )
                );
            }
        } else {
            selectedText =
                state.selection.content().content.firstChild?.textContent ??
                null;
            const linkMatch = /^http(s)?:\/\/\S+$/.exec(selectedText);
            linkUrl = linkMatch?.length > 0 ? linkMatch[0] : "";
        }

        showLinkEditor(view, linkUrl, selectedText);
    }

    return valid;
}

/**
 * Creates an `active` method that returns true if the current selection is/contained in the current block type
 * @param nodeType The type of the node to check for
 * @param attrs? A key-value map of attributes that must be present on this node
 */
function nodeTypeActive(
    nodeType: NodeType,
    attrs?: { [key: string]: unknown }
) {
    return function (state: EditorState) {
        const { from, to } = state.selection;
        let isNodeType = false;
        let passesAttrsCheck = !attrs;

        // check all nodes in the selection for the right type
        state.doc.nodesBetween(from, to, (node) => {
            isNodeType = node.type.name === nodeType.name;
            for (const attr in attrs) {
                passesAttrsCheck = node.attrs[attr] === attrs[attr];
            }

            // stop recursing if the current node is the right type
            return !(isNodeType && passesAttrsCheck);
        });

        return isNodeType && passesAttrsCheck;
    };
}

/**
 * Creates an `active` method that returns true of the current selection has the passed mark
 * @param mark The mark to check for
 */
function markActive(mark: MarkType) {
    return function (state: EditorState) {
        const { from, $from, to, empty } = state.selection;
        if (empty) {
            return !!mark.isInSet(state.storedMarks || $from.marks());
        } else {
            return state.doc.rangeHasMark(from, to, mark);
        }
    };
}

/**
 * Exits an inclusive mark that has been marked as exitable by toggling the mark type
 * and optionally adding a trailing space if the mark is at the end of the document
 * @param state The current editor state
 * @param dispatch The dispatch function to use
 */
export function exitInclusiveMarkCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
) {
    const $cursor = (<TextSelection>state.selection).$cursor;
    const marks = state.storedMarks || $cursor.marks();

    if (!marks?.length) {
        return false;
    }

    // check if the current mark is exitable
    const exitables = marks.filter((mark) => mark.type.spec.exitable);

    if (!exitables?.length) {
        return false;
    }

    // check if we're at the end of the exitable mark
    const nextNode = $cursor.nodeAfter;
    let endExitables: Mark[];

    let tr = state.tr;

    if (nextNode && nextNode.marks?.length) {
        // marks might be nested, so check each mark
        endExitables = exitables.filter(
            (mark) => !mark.type.isInSet(nextNode.marks)
        );
    } else {
        // no next node, so *all* marks are exitable
        endExitables = exitables;
    }

    if (!endExitables.length) {
        return false;
    }

    if (dispatch) {
        // remove the exitable marks from the cursor
        endExitables.forEach((e) => {
            tr = tr.removeStoredMark(e);
        });

        // if there's no characters to the right of the cursor, add a space
        if (!nextNode) {
            tr = tr.insertText(" ");
        }

        dispatch(tr);
    }

    return true;
}

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

        dropdownSection("Column", "columnSection"),
        dropdownItem(
            _t("commands.table_column.remove"),
            removeColumnCommand,
            "remove-column-btn"
        ),
        dropdownItem(
            _t("commands.table_column.insert_before"),
            insertTableColumnBeforeCommand,
            "insert-column-before-btn"
        ),
        dropdownItem(
            _t("commands.table_column.insert_after"),
            insertTableColumnAfterCommand,
            "insert-column-after-btn"
        ),

        dropdownSection("Row", "rowSection"),
        dropdownItem(
            _t("commands.table_row.remove"),
            removeRowCommand,
            "remove-row-btn"
        ),
        dropdownItem(
            _t("commands.table_row.insert_before"),
            insertTableRowBeforeCommand,
            "insert-row-before-btn"
        ),
        dropdownItem(
            _t("commands.table_row.insert_after"),
            insertTableRowAfterCommand,
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
        dropdownItem(
            _t("commands.heading.entry", { level: 1 }),
            toggleHeadingLevel({ level: 1 }),
            "h1-btn",
            nodeTypeActive(schema.nodes.heading, { level: 1 }),
            ["fs-body3", "mt8"]
        ),
        dropdownItem(
            _t("commands.heading.entry", { level: 2 }),
            toggleHeadingLevel({ level: 2 }),
            "h2-btn",
            nodeTypeActive(schema.nodes.heading, { level: 2 }),
            ["fs-body2"]
        ),
        dropdownItem(
            _t("commands.heading.entry", { level: 3 }),
            toggleHeadingLevel({ level: 3 }),
            "h3-btn",
            nodeTypeActive(schema.nodes.heading, { level: 3 }),
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
        dropdownItem(
            _t("commands.tagLink", { shortcut: getShortcut("Mod-[") }),
            toggleTagLinkCommand(
                options.parserFeatures.tagLinks.validate,
                false
            ),
            "tag-btn",
            nodeTypeActive(schema.nodes.tagLink)
        ),
        dropdownItem(
            _t("commands.metaTagLink", { shortcut: getShortcut("Mod-]") }),
            toggleTagLinkCommand(
                options.parserFeatures.tagLinks.validate,
                true
            ),
            "meta-tag-btn",
            nodeTypeActive(schema.nodes.tagLink)
        ),
        dropdownItem(
            _t("commands.spoiler", { shortcut: getShortcut("Mod-/") }),
            toggleWrapIn(schema.nodes.spoiler),
            "spoiler-btn",
            nodeTypeActive(schema.nodes.spoiler)
        ),
        dropdownItem(
            _t("commands.sub", { shortcut: getShortcut("Mod-,") }),
            toggleMark(schema.marks.sub),
            "subscript-btn",
            markActive(schema.marks.sub)
        ),
        dropdownItem(
            _t("commands.sup", { shortcut: getShortcut("Mod-.") }),
            toggleMark(schema.marks.sup),
            "superscript-btn",
            markActive(schema.marks.sup)
        ),
        dropdownItem(
            _t("commands.kbd", { shortcut: getShortcut("Mod-'") }),
            toggleMark(schema.marks.kbd),
            "kbd-btn",
            markActive(schema.marks.kbd)
        )
    );

// TODO ensure that all names and priorities match those found in the rich-text editor
/**
 * Creates all menu entries for the commonmark editor
 * @param schema The finalized rich-text schema
 * @param options The options for the editor
 * @internal
 */
export const createMenuEntries = (
    schema: Schema,
    options: CommonViewOptions
): MenuBlock[] => [
    {
        name: "formatting1", // TODO better name?
        priority: 0,
        entries: [
            headingDropdown(schema),
            {
                key: "toggleBold",
                command: toggleMark(schema.marks.strong),
                dom: makeMenuButton(
                    "Bold",
                    _t("commands.bold", { shortcut: getShortcut("Mod-B") }),
                    "bold-btn"
                ),
                active: markActive(schema.marks.strong),
            },
            {
                key: "toggleEmphasis",
                command: toggleMark(schema.marks.em),
                dom: makeMenuButton(
                    "Italic",
                    _t("commands.emphasis", { shortcut: getShortcut("Mod-I") }),
                    "italic-btn"
                ),
                active: markActive(schema.marks.em),
            },
            {
                key: "toggleCode",
                command: toggleMark(schema.marks.code),
                dom: makeMenuButton(
                    "Code",
                    _t("commands.inline_code", {
                        shortcut: getShortcut("Mod-K"),
                    }),
                    "code-btn"
                ),
                active: markActive(schema.marks.code),
            },
            addIf(
                {
                    key: "toggleStrike",
                    command: toggleMark(schema.marks.strike),
                    dom: makeMenuButton(
                        "Strikethrough",
                        _t("commands.strikethrough"),
                        "strike-btn"
                    ),
                    active: markActive(schema.marks.strike),
                },
                options.parserFeatures.extraEmphasis
            ),
        ],
    },
    {
        name: "formatting2", // TODO better name?
        priority: 10,
        entries: [
            {
                key: "toggleLink",
                command: insertLinkCommand,
                dom: makeMenuButton(
                    "Link",
                    _t("commands.link", { shortcut: getShortcut("Mod-L") }),
                    "insert-link-btn"
                ),
            },
            {
                key: "toggleBlockquote",
                command: toggleWrapIn(schema.nodes.blockquote),
                dom: makeMenuButton(
                    "Quote",
                    _t("commands.blockquote", {
                        shortcut: getShortcut("Mod-Q"),
                    }),
                    "blockquote-btn"
                ),
                active: nodeTypeActive(schema.nodes.blockquote),
            },
            {
                key: "toggleCodeblock",
                command: toggleBlockType(schema.nodes.code_block),
                dom: makeMenuButton(
                    "Codeblock",
                    _t("commands.code_block", {
                        shortcut: getShortcut("Mod-M"),
                    }),
                    "code-block-btn"
                ),
                active: nodeTypeActive(schema.nodes.code_block),
            },
            addIf(
                {
                    key: "insertImage",
                    command: insertImageCommand,
                    dom: makeMenuButton(
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
                    command: insertTableCommand,
                    dom: makeMenuButton(
                        "Table",
                        _t("commands.table_insert", {
                            shortcut: getShortcut("Mod-E"),
                        }),
                        "insert-table-btn"
                    ),
                    visible: (state: EditorState) =>
                        !inTable(state.schema, state.selection),
                },
                options.parserFeatures.tables
            ),
            addIf(tableDropdown(), options.parserFeatures.tables),
        ],
    },
    {
        name: "formatting3", // TODO better name?
        priority: 20,
        entries: [
            {
                key: "toggleOrderedList",
                command: toggleWrapIn(schema.nodes.ordered_list),
                dom: makeMenuButton(
                    "OrderedList",
                    _t("commands.ordered_list", {
                        shortcut: getShortcut("Mod-O"),
                    }),
                    "numbered-list-btn"
                ),
                active: nodeTypeActive(schema.nodes.ordered_list),
            },
            {
                key: "toggleUnorderedList",
                command: toggleWrapIn(schema.nodes.bullet_list),
                dom: makeMenuButton(
                    "UnorderedList",
                    _t("commands.unordered_list", {
                        shortcut: getShortcut("Mod-U"),
                    }),
                    "bullet-list-btn"
                ),
                active: nodeTypeActive(schema.nodes.bullet_list),
            },
            {
                key: "insertRule",
                command: insertHorizontalRuleCommand,
                dom: makeMenuButton(
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
                key: "undo",
                command: undo,
                dom: makeMenuButton(
                    "Undo",
                    _t("commands.undo", { shortcut: getShortcut("Mod-Z") }),
                    "undo-btn"
                ),
            },
            {
                key: "redo",
                command: redo,
                dom: makeMenuButton(
                    "Refresh",
                    _t("commands.redo", { shortcut: getShortcut("Mod-Y") }),
                    "redo-btn"
                ),
            },
        ],
        visible: () => false,
        classes: ["sm:d-inline-flex"],
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
