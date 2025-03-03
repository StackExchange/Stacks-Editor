import {
    Selection,
    NodeSelection,
    TextSelection,
    Transaction,
} from "prosemirror-state";

/**
 * Returns a transaction that inserts a new paragraph if there is no node after the cursor.
 * This is useful for when inserting block nodes, since the cursor cannot be placed after those blocks at the end of a document.
 * This makes document navigation much more intuitive for end users.
 * @param tr The most recent transaction to the document
 * @param cursorOffset TODO HACK The offset of where the cursor is vs where the inserted node is
 */
export function insertParagraphIfAtDocEnd(
    tr: Transaction,
    cursorOffset = 0
): Transaction {
    if (!tr.docChanged) {
        return tr;
    }

    // check the (parent-most) node the cursor is in is the final node in the document
    const currNodePos = tr.doc
        .resolve(tr.selection.to - cursorOffset)
        .before(1);
    const lastChidPos = tr.doc.content.size - tr.doc.lastChild.nodeSize;
    const shouldInsertPara = currNodePos === lastChidPos;

    if (shouldInsertPara) {
        const p = tr.doc.type.schema.nodes.paragraph.create(null);
        tr = tr.insert(tr.doc.content.size, p);
    }

    return tr;
}

/**
 * Attempts to create a TextSelection at `newPos`. If that position does not lie
 * in an inline (text) context (i.e., if the parent node is not a textblock),
 * this function falls back to a NodeSelection on the block at `blockStart`.
 *
 * This is useful in commands (e.g. toggling a code block) where you might end up
 * with an empty block or a position outside a valid text context. Using this
 * helper avoids console warnings and ensures we have a valid selection in the doc.
 *
 * @param tr         The current Transaction to update.
 * @param blockStart The start position of the block node (e.g., paragraph/code_block).
 * @param newPos     The desired position for the text cursor.
 * @returns          The updated Transaction with a valid selection set.
 */
export function safeSetSelection(
    tr: Transaction,
    blockPos: number,
    newPos: number
): Transaction {
    const doc = tr.doc;
    const $pos = doc.resolve(newPos);

    // 1) If the position’s parent is a textblock, we can safely place a text cursor there.
    if ($pos.parent.isTextblock) {
        return tr.setSelection(TextSelection.create(doc, newPos));
    }

    // 2) Otherwise, try a NodeSelection at blockPos, if there's actually a node there.
    if (doc.nodeAt(blockPos)) {
        return tr.setSelection(NodeSelection.create(doc, blockPos));
    }

    // 3) Final fallback: place the selection at the very start of the document.
    return tr.setSelection(Selection.atStart(doc));
}
