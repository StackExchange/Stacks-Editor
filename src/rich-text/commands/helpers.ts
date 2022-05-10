import { Transaction } from "prosemirror-state";
import { richTextSchema as schema } from "../schema";

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
        const p = schema.nodes.paragraph.create(null);
        tr = tr.insert(tr.doc.content.size, p);
    }

    return tr;
}
