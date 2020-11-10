import {
    setBlockType,
    toggleMark,
    wrapIn,
    chainCommands,
    exitCode,
} from "prosemirror-commands";
import {
    MarkType,
    NodeType,
    Node as ProsemirrorNode,
    ResolvedPos,
} from "prosemirror-model";
import { EditorState, Transaction, Plugin, Selection } from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import {
    imageUploaderEnabled,
    showImageUploader,
} from "../shared/prosemirror-plugins/image-upload";
import {
    createMenuPlugin,
    makeMenuIcon,
    makeMenuLinkEntry,
    makeMenuSpacerEntry,
    addIf,
    makeMenuDropdown,
    dropdownItem,
    dropdownSection,
} from "../shared/menu";
import { richTextSchema as schema, tableNodes } from "../shared/schema";
import type { CommonViewOptions } from "../shared/view";
import { LINK_TOOLTIP_KEY } from "./plugins/link-tooltip";
import { undo, redo } from "prosemirror-history";

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
        // if the node is not set, go ahead and set it
        if (!nodeCheck(state)) {
            return setBlockTypeCommand(state, dispatch);
        }

        return setToTextCommand(state, dispatch);
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

export function inTable(selection: Selection): boolean {
    return tableNodes.includes(selection.$head.parent.type);
}

function inTableHead(selection: Selection): boolean {
    return selection.$head.parent.type === schema.nodes.table_header;
}

export const exitBlockCommand = chainCommands(exitCode, (state, dispatch) => {
    dispatch(
        state.tr
            .replaceSelectionWith(schema.nodes.hard_break.create())
            .scrollIntoView()
    );
    return true;
});

export function moveSelectionAfterTableCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    return exitTableCommand(state, dispatch, false);
}

export function moveSelectionBeforeTableCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    return exitTableCommand(state, dispatch, true);
}

function exitTableCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    before = false
): boolean {
    if (!inTable(state.selection)) {
        return false;
    }

    if (dispatch) {
        // our hierarchy is table > table_head | table_body > table_row > table_cell
        // and we're relying on that to be always true.
        // That's why .after(-3) selects the parent _table_ node from a table_cell node
        const type = schema.nodes.paragraph;
        const newPosition = before
            ? state.selection.$head.before(-3) - 1
            : state.selection.$head.after(-3) + 1;
        const tr = state.tr;

        // if the position before/after the table doesn't exist, let's insert a paragraph there
        try {
            tr.doc.resolve(newPosition);
        } catch (e) {
            const insertionPosition = before
                ? newPosition + 1
                : newPosition - 1;
            tr.insert(insertionPosition, type.create());
        }

        tr.setSelection(
            Selection.near(tr.doc.resolve(Math.max(0, newPosition)), 1)
        );
        dispatch(tr.scrollIntoView());
    }
    return true;
}

export function insertTableRowBeforeCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    return insertTableRowCommand(true, state, dispatch);
}

export function insertTableRowAfterCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    return insertTableRowCommand(false, state, dispatch);
}

function insertTableRowCommand(
    before: boolean,
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (!inTable(state.selection) || inTableHead(state.selection)) {
        return false;
    }

    if (dispatch) {
        const { $head } = state.selection;
        const tableRowNode = $head.node(-1);

        const newTableCells: ProsemirrorNode[] = [];
        tableRowNode.forEach((cell) => {
            newTableCells.push(schema.nodes.table_cell.create(cell.attrs));
        });
        const newTableRow = schema.nodes.table_row.create(null, newTableCells);
        const positionToInsert = before ? $head.before(-1) : $head.after(-1);
        const tr = state.tr.insert(positionToInsert, newTableRow);

        dispatch(tr.scrollIntoView());
    }

    return true;
}

export function insertTableColumnAfterCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    return insertTableColumnCommand(false, state, dispatch);
}

export function insertTableColumnBeforeCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    return insertTableColumnCommand(true, state, dispatch);
}

/**
 *  Insert a new table column in this table
 * 1. find the index of the selected table cell in the current table row
 * 2. walk through the entire document to traverse all rows in our selected table
 * 3. for each table row, find the table cell at the desired index and get its position
 * 4. insert a new table_cell or table_header node before/after the found position
 */
function insertTableColumnCommand(
    before: boolean,
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (!inTable(state.selection)) {
        return false;
    }
    if (dispatch) {
        const $head = state.selection.$head;
        const selectedTable = $head.node(-3);
        const selectedCellIndex = $head.index(-1);

        // find and store all positions where we need to insert new cells
        const newCells: [NodeType, number][] = [];
        const tableOffset = $head.start(-3);
        let targetCell: ProsemirrorNode;
        // traverse the current table to find the absolute positions of our cells to be inserted
        selectedTable.descendants((node: ProsemirrorNode, pos: number) => {
            if (!tableNodes.includes(node.type)) {
                return false; // don't descend into non-table nodes
            }

            if (node.type === schema.nodes.table_row) {
                targetCell = node.child(selectedCellIndex);
            }

            if (targetCell && node == targetCell) {
                const position = before
                    ? selectedTable.resolve(pos + 1).before()
                    : selectedTable.resolve(pos + 1).after();
                // position is relative to the start of the table, so we need
                // to add the table offset (distance to start of document)
                newCells.push([node.type, tableOffset + position]);
            }
        });

        // insert new cells from bottom to top (reverse order)
        // to avoid inserted cells making our found positions obsolete
        let tr = state.tr;
        for (const newCell of newCells.reverse()) {
            tr = tr.insert(newCell[1], newCell[0].create());
        }

        dispatch(tr.scrollIntoView());
    }
    return true;
}

export function removeRowCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (!inTable(state.selection) || inTableHead(state.selection)) {
        return false;
    }

    if (dispatch) {
        const tr = state.tr;
        const $head = state.selection.$head;

        // delete entire table if we're deleting the last row in the table body
        if ($head.node(-2).childCount === 1) {
            return removeTableCommand(state, dispatch);
        }
        // delete from start to end of this row (node at -1 position from the table cell)
        tr.delete($head.start(-1) - 1, $head.end(-1) + 1);
        dispatch(tr.scrollIntoView());
    }

    return true;
}

export function removeColumnCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (!inTable(state.selection)) {
        return false;
    }

    if (dispatch) {
        const $head = state.selection.$head;
        const table = $head.node(-3);

        // remove entire table if this is the last remaining column
        if ($head.node(-1).childCount === 1) {
            return removeTableCommand(state, dispatch);
        }

        const cellIndex = $head.index(-1);
        let targetCell: ProsemirrorNode;
        const resolvedPositions: ResolvedPos[] = [];
        const tableOffset = $head.start(-3);
        table.descendants((node: ProsemirrorNode, pos: number) => {
            if (!tableNodes.includes(node.type)) {
                return false; // don't descend into non-table nodes
            }

            if (node.type === schema.nodes.table_row) {
                targetCell =
                    node.childCount >= cellIndex + 1
                        ? node.child(cellIndex)
                        : null;
            }

            if (targetCell && node == targetCell) {
                resolvedPositions.push(table.resolve(pos + 1));
            }
        });

        let tr = state.tr;
        for (const cellPosition of resolvedPositions.reverse()) {
            tr = tr.delete(
                tableOffset + cellPosition.start() - 1,
                tableOffset + cellPosition.end() + 1
            );
        }

        dispatch(tr.scrollIntoView());
    }

    return true;
}

export function removeTableContentCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (!inTable(state.selection)) {
        return false;
    }

    const { $from, $to } = state.selection;

    // selection includes entire table
    if ($from.start(-3) >= $from.pos - 3 && $from.end(-3) <= $to.pos + 3) {
        return removeTableCommand(state, dispatch);
    }

    // selection includes entire row
    if ($from.start(-1) >= $from.pos - 1 && $from.end(-1) <= $to.pos + 1) {
        return removeRowCommand(state, dispatch);
    }

    // selection contains two arbitrary cells?
    // prevent delete operation to prevent deleting the cell nodes
    // themselves and breaking the table structure
    if (!$from.sameParent($to)) {
        return true;
    }

    return false;
}

function moveToCellCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    direction: number
): boolean {
    if (direction !== -1 && direction !== 1) {
        return false;
    }

    if (!inTable(state.selection)) return false;

    const $head = state.selection.$head;

    for (let level = -1; level > -4; level--) {
        const parentIndex = $head.index(level);
        const parent = $head.node(level);

        if (!parent) continue;

        // every time we want to skip the boundaries of a node (a cell, a row, ...)
        // we have to consider the node's opening and closing positions, too. For
        // each level, this will add an additional offset of 2 that we need to skip
        const nodeOffset = 2;

        const target = parent.maybeChild(parentIndex + direction);

        if (!target) continue;

        const newPos =
            direction === -1
                ? $head.start() - nodeOffset * (level * -1)
                : $head.end() + nodeOffset * (level * -1);

        dispatch(
            state.tr
                .setSelection(Selection.near(state.tr.doc.resolve(newPos), 1))
                .scrollIntoView()
        );

        return true;
    }

    // we're at the end of the table and still want to move forward?
    // let's move the cursor below the table!
    if (direction === 1) {
        return moveSelectionAfterTableCommand(state, dispatch);
    } else {
        return moveSelectionBeforeTableCommand(state, dispatch);
    }
}

export function moveToPreviousCellCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    return moveToCellCommand(state, dispatch, -1);
}

export function moveToNextCellCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    return moveToCellCommand(state, dispatch, +1);
}

function removeTableCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    const $head = state.selection.$head;
    if (dispatch) {
        dispatch(state.tr.deleteRange($head.start(-3) - 1, $head.end(-3) + 1));
    }

    return true;
}

export function insertTableCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void
): boolean {
    if (!setBlockType(schema.nodes.table)(state)) {
        return false;
    }

    if (!dispatch) return true;

    let headerIndex = 1;
    let cellIndex = 1;
    const cell = () =>
        schema.nodes.table_cell.create(
            null,
            schema.text(`cell ${cellIndex++}`)
        );
    const header = () =>
        schema.nodes.table_header.create(
            null,
            schema.text(`header ${headerIndex++}`)
        );
    const row = (...cells: ProsemirrorNode[]) =>
        schema.nodes.table_row.create(null, cells);
    const head = (row: ProsemirrorNode) =>
        schema.nodes.table_head.create(null, row);
    const body = (...rows: ProsemirrorNode[]) =>
        schema.nodes.table_body.create(null, rows);
    const table = (head: ProsemirrorNode, body: ProsemirrorNode) =>
        schema.nodes.table.createChecked(null, [head, body]);
    const paragraph = () => schema.nodes.paragraph.create(null);

    const t = table(
        head(row(header(), header(), header())),
        body(
            row(cell(), cell(), cell()),
            row(cell(), cell(), cell()),
            row(cell(), cell(), cell())
        )
    );
    let tr = state.tr.replaceSelectionWith(t);
    dispatch(tr.scrollIntoView());

    // if there's no selectable node after the inserted table, insert an empty paragraph
    // because it makes selecting, navigating much more intuitive
    const newState = state.apply(tr);
    const nodeAfterTable = newState.doc.nodeAt(newState.tr.selection.to - 1);
    if (nodeAfterTable && nodeAfterTable.type === schema.nodes.text) {
        tr = newState.tr.insert(newState.tr.selection.to, paragraph());
        dispatch(tr.scrollIntoView());
    }

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

export function insertLinkCommand(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView
): boolean {
    if (state.selection.empty) return false;
    if (dispatch) {
        const selectedText =
            state.selection.content().content.firstChild?.textContent ?? null;
        const linkMatch = /^http(s)?:\/\/\S+$/.exec(selectedText);
        const linkUrl = linkMatch?.length > 0 ? linkMatch[0] : "";
        const isInserting = toggleMark(schema.marks.link, { href: linkUrl })(
            state,
            dispatch
        );

        if (isInserting) {
            const tr = LINK_TOOLTIP_KEY.setEditMode(true, state, view.state.tr);
            view.dispatch(tr);
        }
    }
    return true;
}

/**
 * Creates an `active` method that returns true of the current selection is/contained in the current block type
 * @param nodeType The type of the node to check for
 */
function nodeTypeActive(nodeType: NodeType) {
    return function (state: EditorState) {
        const { from, to } = state.selection;
        let isNodeType = false;

        // check all nodes in the selection for the right type
        state.doc.nodesBetween(from, to, (node) => {
            isNodeType = node.type.name === nodeType.name;

            // stop recursing if the current node is the right type
            return !isNodeType;
        });

        return isNodeType;
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

export const createMenu = (options: CommonViewOptions): Plugin =>
    createMenuPlugin(
        [
            {
                key: "toggleHeading",
                command: toggleBlockType(schema.nodes.heading, { level: 1 }),
                dom: makeMenuIcon("Header", "Heading", "heading-btn"),
                active: nodeTypeActive(schema.nodes.heading),
            },
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
                    dom: makeMenuIcon(
                        "Image",
                        "Image",
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
                        "Table",
                        "insert-table-btn"
                    ),
                    visible: (state: EditorState) => !inTable(state.selection),
                },
                options.parserFeatures.tables
            ),
            addIf(tableDropdown, options.parserFeatures.tables),
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

const tableDropdown = makeMenuDropdown(
    "Table",
    "Edit table",
    "table-dropdown",
    (state: EditorState) => inTable(state.selection),

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
