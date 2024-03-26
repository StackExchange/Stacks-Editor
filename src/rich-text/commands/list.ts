import { NodeType, Node } from "prosemirror-model";
import { Command, EditorState, Transaction } from "prosemirror-state";
import { canJoin } from "prosemirror-transform";
import { findParentNode } from "prosemirror-utils";
import { wrapInList, liftListItem } from "prosemirror-schema-list";

/**
 * Toggles a list.
 * When the provided list type wrapper (e.g. bullet_list) is inactive then wrap the list with
 * this type. When it is active then remove the selected line from the list.
 *
 * @param listType - the list node type
 * @param itemType - the list item node type
 */
export function toggleList(listType: NodeType, itemType: NodeType): Command {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const { $from, $to } = state.tr.selection;
        const range = $from.blockRange($to);

        if (!range) {
            return false;
        }

        const parentList = findParentNode((node) => isListType(node.type))(
            state.tr.selection
        );

        if (parentList) {
            return liftListItem(itemType)(state, dispatch);
        }

        return wrapAndMaybeJoinList(listType)(state, dispatch);
    };
}

/**
 * Wraps the selected content in a list and attempts to join the newly wrapped list
 * with exisiting list(s) of the same type.
 *
 * @param nodeType - the list node type
 */
export function wrapAndMaybeJoinList(nodeType: NodeType) {
    return function (state: EditorState, dispatch: (tr: Transaction) => void) {
        return wrapInList(nodeType)(state, (tr) => {
            dispatch?.(tr);
            const { tr: newTr } = state.apply(tr);
            maybeJoinList(newTr);
            dispatch?.(newTr);
        });
    };
}

/**
 * Joins lists when they are of the same type.
 *
 * @param tr - the transaction
 */
export function maybeJoinList(tr: Transaction): boolean {
    const $from = tr.selection.$from;

    let joinable: number[] = [];
    let index: number;
    let parent: Node;
    let before: Node | null | undefined;
    let after: Node | null | undefined;

    for (let depth = $from.depth; depth >= 0; depth--) {
        parent = $from.node(depth);

        // join backward
        index = $from.index(depth);
        before = parent.maybeChild(index - 1);
        after = parent.maybeChild(index);

        if (
            before &&
            after &&
            before.type.name === after.type.name &&
            isListType(before.type)
        ) {
            const pos = $from.before(depth + 1);
            joinable.push(pos);
        }

        // join forward
        index = $from.indexAfter(depth);
        before = parent.maybeChild(index - 1);
        after = parent.maybeChild(index);

        if (
            before &&
            after &&
            before.type.name === after.type.name &&
            isListType(before.type)
        ) {
            const pos = $from.after(depth + 1);
            joinable.push(pos);
        }
    }

    // sort `joinable` reversely
    joinable = [...new Set(joinable)].sort((a, b) => b - a);
    let updated = false;

    for (const pos of joinable) {
        if (canJoin(tr.doc, pos)) {
            tr.join(pos);
            updated = true;
        }
    }

    return updated;
}

/**
 * Checks if the node type is a list type (e.g. "bullet_list", "ordered_list", etc...).
 *
 * @param type - the node type
 */
export function isListType(type: NodeType) {
    return !!type.name.includes("_list");
}
