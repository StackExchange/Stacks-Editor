import { EditorState, Plugin, Transaction } from "prosemirror-state";
import { docChanged } from "../../shared/utils";

/**
 * Updates all spoiler nodes within the state's selection
 * @param tr The transaction to modify
 * @param state The state whose selection to check for spoiler nodes (does not have to be the current state!)
 * @param shouldReveal Whether to force the spoiler to be revealed or not
 * @param transactions The array of transactions to map node positions through (if the state is not current)
 */
function updateSpoilers(
    tr: Transaction,
    state: EditorState,
    shouldReveal: boolean,
    transactions?: Transaction[]
) {
    const { from, to } = state.selection;
    state.doc.nodesBetween(from, to, (node, pos) => {
        // if spoiler node, set revealed attribute
        if (node.type.name === "spoiler") {
            // inherit whatever attributes are already on the node,
            // but do NOT update the node directly (or else the view will not register as changed)
            const attrs = { ...node.attrs };
            attrs.revealed = shouldReveal;

            let wasDeleted = false;

            if (transactions?.length) {
                // map the position through each transaction to make sure the node we're altering still exists
                transactions.forEach((t) => {
                    const result = t.mapping.mapResult(pos);

                    // if the node was outright deleted, skip it!
                    if (result.deleted) {
                        wasDeleted = true;
                        return false;
                    }

                    // set pos to the current position of the node
                    pos = result.pos;
                });
            }

            // if the node was deleted, then there's nothing to do
            if (wasDeleted) {
                return false;
            }

            tr = tr.setNodeMarkup(pos, null, attrs);

            // don't recurse into this node's children
            return false;
        }
    });

    return tr;
}

/** Plugin that forces the `revealed` attr on "spoiler" nodes on selection and removes it on de-selection */
export const spoilerToggle = new Plugin({
    appendTransaction(transactions, oldState, newState) {
        // if the doc / selection has not changed, nothing to do
        if (!docChanged(oldState, newState)) {
            return null;
        }

        let tr = newState.tr;

        // un-reveal all spoilers from the old state/selection
        tr = updateSpoilers(tr, oldState, false, transactions);

        // reveal all spoilers in the new selection
        tr = updateSpoilers(tr, newState, true);

        // no nodes changed, just return
        if (!tr.steps.length) {
            return null;
        }

        // make sure this doesn't get added to the history
        tr = tr.setMeta("addToHistory", false);

        return tr;
    },
});
