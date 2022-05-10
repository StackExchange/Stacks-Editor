import { setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { Mark, MarkType, NodeType } from "prosemirror-model";
import {
    EditorState,
    Plugin,
    TextSelection,
    Transaction,
} from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import {
    addIf,
    createMenuPlugin,
    dropdownItem,
    dropdownSection,
    makeMenuDropdown,
    makeMenuIcon,
    makeMenuLinkEntry,
    makeMenuSpacerEntry,
} from "../../shared/menu";
import {
    imageUploaderEnabled,
    showImageUploader,
} from "../../shared/prosemirror-plugins/image-upload";
import { richTextSchema as schema } from "../schema";
import type { CommonViewOptions } from "../../shared/view";
import { LINK_TOOLTIP_KEY } from "../plugins/link-tooltip";
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

/** Command to set a block type to a paragraph (plain text) */
const setToTextCommand = setBlockType(schema.nodes.paragraph);

function toggleBlockType(
    nodeType: NodeType,
    attrs?: { [key: string]: unknown }
) {
    const nodeCheck = nodeTypeActive(nodeType);
    const setBlockTypeCommand = setBlockType(nodeType, attrs);

    return (state: EditorState, dispatch: (tr: Transaction) => void) => {
        // if the node is set, toggle it off
        if (nodeCheck(state)) {
            return setToTextCommand(state, dispatch);
        }

        return setBlockTypeCommand(state, (t) => {
            if (dispatch) {
                // when adding a block node, make sure the user can navigate past it
                t = insertParagraphIfAtDocEnd(t);
                dispatch(t);
            }
        });
    };
}

export function insertHorizontalRuleCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (inTable(state.selection)) {
        return false;
    }

    dispatch &&
        dispatch(
            state.tr.replaceSelectionWith(schema.nodes.horizontal_rule.create())
        );
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
    if (state.selection.empty) return false;

    let linkUrl = null;

    if (dispatch) {
        const selectedText =
            state.selection.content().content.firstChild?.textContent ?? null;
        const linkMatch = /^http(s)?:\/\/\S+$/.exec(selectedText);
        linkUrl = linkMatch?.length > 0 ? linkMatch[0] : "";

        // wrap the dispatch function so that we can add additional transactions after toggleMark
        const oldDispatch = dispatch;
        dispatch = (tr) => {
            oldDispatch(tr);
            view.dispatch(
                LINK_TOOLTIP_KEY.setEditMode(true, state, view.state.tr)
            );
        };
    }

    return toggleMark(schema.marks.link, { href: linkUrl })(state, dispatch);
}

/**
 * Creates an `active` method that returns true of the current selection is/contained in the current block type
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
        "Edit table",
        "table-dropdown",
        (state: EditorState) => inTable(state.selection),
        () => false,

        dropdownSection("Column", "columnSection"),
        dropdownItem("Remove column", removeColumnCommand, "remove-column-btn"),
        dropdownItem(
            "Insert column before",
            insertTableColumnBeforeCommand,
            "insert-column-before-btn"
        ),
        dropdownItem(
            "Insert column after",
            insertTableColumnAfterCommand,
            "insert-column-after-btn"
        ),

        dropdownSection("Row", "rowSection"),
        dropdownItem("Remove row", removeRowCommand, "remove-row-btn"),
        dropdownItem(
            "Insert row before",
            insertTableRowBeforeCommand,
            "insert-row-before-btn"
        ),
        dropdownItem(
            "Insert row after",
            insertTableRowAfterCommand,
            "insert-row-after-btn"
        )
    );

const headingDropdown = () =>
    makeMenuDropdown(
        "Header",
        "Header",
        "heading-dropdown",
        () => true,
        nodeTypeActive(schema.nodes.heading),

        dropdownItem(
            "Heading 1",
            toggleBlockType(schema.nodes.heading, { level: 1 }),
            "h1-btn",
            nodeTypeActive(schema.nodes.heading, { level: 1 }),
            ["fs-body3", "mt8"]
        ),
        dropdownItem(
            "Heading 2",
            toggleBlockType(schema.nodes.heading, { level: 2 }),
            "h2-btn",
            nodeTypeActive(schema.nodes.heading, { level: 2 }),
            ["fs-body2"]
        ),
        dropdownItem(
            "Heading 3",
            toggleBlockType(schema.nodes.heading, { level: 3 }),
            "h3-btn",
            nodeTypeActive(schema.nodes.heading, { level: 3 }),
            ["fs-body1"]
        )
    );

export const createMenu = (options: CommonViewOptions): Plugin =>
    createMenuPlugin(
        [
            headingDropdown(),
            {
                key: "toggleBold",
                command: toggleMark(schema.marks.strong),
                dom: makeMenuIcon("Bold", "Bold", "bold-btn"),
                active: markActive(schema.marks.strong),
            },
            {
                key: "toggleEmphasis",
                command: toggleMark(schema.marks.em),
                dom: makeMenuIcon("Italic", "Italic", "italic-btn"),
                active: markActive(schema.marks.em),
            },
            {
                key: "toggleCode",
                command: toggleMark(schema.marks.code),
                dom: makeMenuIcon("Code", "Inline code", "code-btn"),
                active: markActive(schema.marks.code),
            },
            addIf(
                {
                    key: "toggleStrike",
                    command: toggleMark(schema.marks.strike),
                    dom: makeMenuIcon(
                        "Strikethrough",
                        "Strikethrough",
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
                dom: makeMenuIcon("Link", "Link selection", "insert-link-btn"),
            },
            {
                key: "toggleBlockquote",
                command: toggleWrapIn(schema.nodes.blockquote),
                dom: makeMenuIcon("Quote", "Blockquote", "blockquote-btn"),
                active: nodeTypeActive(schema.nodes.blockquote),
            },
            {
                key: "toggleCodeblock",
                command: toggleBlockType(schema.nodes.code_block),
                dom: makeMenuIcon("Codeblock", "Code block", "code-block-btn"),
                active: nodeTypeActive(schema.nodes.code_block),
            },
            addIf(
                {
                    key: "insertImage",
                    command: insertImageCommand,
                    dom: makeMenuIcon("Image", "Image", "insert-image-btn"),
                },
                !!options.imageUpload?.handler
            ),
            addIf(
                {
                    key: "insertTable",
                    command: insertTableCommand,
                    dom: makeMenuIcon("Table", "Table", "insert-table-btn"),
                    visible: (state: EditorState) => !inTable(state.selection),
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
                    "Numbered list",
                    "numbered-list-btn"
                ),
                active: nodeTypeActive(schema.nodes.ordered_list),
            },
            {
                key: "toggleUnorderedList",
                command: toggleWrapIn(schema.nodes.bullet_list),
                dom: makeMenuIcon(
                    "UnorderedList",
                    "Bulleted list",
                    "bullet-list-btn"
                ),
                active: nodeTypeActive(schema.nodes.bullet_list),
            },
            {
                key: "insertRule",
                command: insertHorizontalRuleCommand,
                dom: makeMenuIcon(
                    "HorizontalRule",
                    "Horizontal rule",
                    "horizontal-rule-btn"
                ),
            },
            makeMenuSpacerEntry(() => false, ["sm:d-inline-block"]),
            {
                key: "undo",
                command: undo,
                dom: makeMenuIcon("Undo", "Undo", "undo-btn", [
                    "sm:d-inline-block",
                ]),
                visible: () => false,
            },
            {
                key: "redo",
                command: redo,
                dom: makeMenuIcon("Refresh", "Redo", "redo-btn", [
                    "sm:d-inline-block",
                ]),
                visible: () => false,
            },
            makeMenuSpacerEntry(),
            //TODO eventually this will mimic the "help" dropdown in the prod editor
            makeMenuLinkEntry("Help", "Help", options.editorHelpLink),
        ],
        options.menuParentContainer
    );
