import { setBlockType, wrapIn } from "prosemirror-commands";
import { NodeType } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";
import { nodeTypeActive } from "../rich-text/commands";

/**
 * Returns a transaction that inserts a new paragraph if there is no node after the cursor.
 * This is useful for when inserting block nodes, since the cursor cannot be placed after those blocks at the end of a document.
 * This makes document navigation much more intuitive for end users.
 * @param tr The most recent transaction to the document
 * @param cursorOffset TODO HACK The offset of where the cursor is vs where the inserted node is
 */
export function insertParagraphIfAtDocEnd(
    paraNodeType: NodeType,
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
        const p = paraNodeType.create(null);
        tr = tr.insert(tr.doc.content.size, p);
    }

    return tr;
}

//TODO
export function toggleWrapIn(nodeType: NodeType) {
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

export function toggleBlockType(
    nodeType: NodeType,
    textNodeType: NodeType,
    attrs?: { [key: string]: unknown }
) {
    /** Command to set a block type to a paragraph (plain text) */
    const setToTextCommand = setBlockType(textNodeType);
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
                t = insertParagraphIfAtDocEnd(textNodeType, t);
                dispatch(t);
            }
        });
    };
}
