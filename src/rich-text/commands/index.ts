import { setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { Mark, MarkType, NodeType, Schema } from "prosemirror-model";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import {
    addIf,
    dropdownItem,
    dropdownSection,
    makeMenuDropdown,
    makeMenuIcon,
    makeMenuLinkEntry,
    makeMenuSpacerEntry,
    MenuCommandEntry,
} from "../../shared/menu";
import {
    imageUploaderEnabled,
    showImageUploader,
} from "../../shared/prosemirror-plugins/image-upload";
import { getCurrentTextNode, getShortcut } from "../../shared/utils";
import type { CommonViewOptions } from "../../shared/view";
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

//TODO
function toggleWrapIn(nodeType: NodeType) {
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

export function insertImageCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView
): boolean {
    if (!imageUploaderEnabled(view)) {
        return false;
    }

    if (!dispatch) return true;

    showImageUploader(view);
    return true;
}

/**
 * Inserts a link into the document and opens the link edit tooltip at the cursor
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

const headingDropdown = (schema: Schema) =>
    makeMenuDropdown(
        "Header",
        _t("commands.heading.dropdown", { shortcut: getShortcut("Mod-h") }),
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

export const createMenuEntries = (
    schema: Schema,
    options: CommonViewOptions
): MenuCommandEntry[] => [
    headingDropdown(schema),
    {
        key: "toggleBold",
        command: toggleMark(schema.marks.strong),
        dom: makeMenuIcon(
            "Bold",
            _t("commands.bold", { shortcut: getShortcut("Mod-b") }),
            "bold-btn"
        ),
        active: markActive(schema.marks.strong),
    },
    {
        key: "toggleEmphasis",
        command: toggleMark(schema.marks.em),
        dom: makeMenuIcon(
            "Italic",
            _t("commands.emphasis", { shortcut: getShortcut("Mod-i") }),
            "italic-btn"
        ),
        active: markActive(schema.marks.em),
    },
    {
        key: "toggleCode",
        command: toggleMark(schema.marks.code),
        dom: makeMenuIcon(
            "Code",
            _t("commands.inline_code", { shortcut: getShortcut("Mod-k") }),
            "code-btn"
        ),
        active: markActive(schema.marks.code),
    },
    addIf(
        {
            key: "toggleStrike",
            command: toggleMark(schema.marks.strike),
            dom: makeMenuIcon(
                "Strikethrough",
                _t("commands.strikethrough"),
                "strike-btn"
            ),
            active: markActive(schema.marks.strike),
        },
        options.parserFeatures.extraEmphasis
    ),
    makeMenuSpacerEntry(),
    {
        key: "toggleLink",
        command: insertLinkCommand,
        dom: makeMenuIcon(
            "Link",
            _t("commands.link", { shortcut: getShortcut("Mod-l") }),
            "insert-link-btn"
        ),
    },
    {
        key: "toggleBlockquote",
        command: toggleWrapIn(schema.nodes.blockquote),
        dom: makeMenuIcon(
            "Quote",
            _t("commands.blockquote", { shortcut: getShortcut("Mod-q") }),
            "blockquote-btn"
        ),
        active: nodeTypeActive(schema.nodes.blockquote),
    },
    {
        key: "toggleCodeblock",
        command: toggleBlockType(schema.nodes.code_block),
        dom: makeMenuIcon(
            "Codeblock",
            _t("commands.code_block", { shortcut: getShortcut("Mod-m") }),
            "code-block-btn"
        ),
        active: nodeTypeActive(schema.nodes.code_block),
    },
    addIf(
        {
            key: "insertImage",
            command: insertImageCommand,
            dom: makeMenuIcon(
                "Image",
                _t("commands.image", { shortcut: getShortcut("Mod-g") }),
                "insert-image-btn"
            ),
        },
        !!options.imageUpload?.handler
    ),
    addIf(
        {
            key: "insertTable",
            command: insertTableCommand,
            dom: makeMenuIcon(
                "Table",
                _t("commands.table_insert", { shortcut: getShortcut("Mod-e") }),
                "insert-table-btn"
            ),
            visible: (state: EditorState) =>
                !inTable(state.schema, state.selection),
        },
        options.parserFeatures.tables
    ),
    addIf(tableDropdown(), options.parserFeatures.tables),
    makeMenuSpacerEntry(),
    {
        key: "toggleOrderedList",
        command: toggleWrapIn(schema.nodes.ordered_list),
        dom: makeMenuIcon(
            "OrderedList",
            _t("commands.ordered_list", { shortcut: getShortcut("Mod-o") }),
            "numbered-list-btn"
        ),
        active: nodeTypeActive(schema.nodes.ordered_list),
    },
    {
        key: "toggleUnorderedList",
        command: toggleWrapIn(schema.nodes.bullet_list),
        dom: makeMenuIcon(
            "UnorderedList",
            _t("commands.unordered_list", { shortcut: getShortcut("Mod-u") }),
            "bullet-list-btn"
        ),
        active: nodeTypeActive(schema.nodes.bullet_list),
    },
    {
        key: "insertRule",
        command: insertHorizontalRuleCommand,
        dom: makeMenuIcon(
            "HorizontalRule",
            _t("commands.horizontal_rule", { shortcut: getShortcut("Mod-r") }),
            "horizontal-rule-btn"
        ),
    },
    makeMenuSpacerEntry(() => false, ["sm:d-inline-block"]),
    {
        key: "undo",
        command: undo,
        dom: makeMenuIcon(
            "Undo",
            _t("commands.undo", { shortcut: getShortcut("Mod-z") }),
            "undo-btn",
            ["sm:d-inline-block"]
        ),
        visible: () => false,
    },
    {
        key: "redo",
        command: redo,
        dom: makeMenuIcon(
            "Refresh",
            _t("commands.redo", { shortcut: getShortcut("Mod-y") }),
            "redo-btn",
            ["sm:d-inline-block"]
        ),
        visible: () => false,
    },
    makeMenuSpacerEntry(),
    //TODO eventually this will mimic the "help" dropdown in the prod editor
    makeMenuLinkEntry("Help", _t("commands.help"), options.editorHelpLink),
];
