import { Plugin, PluginKey } from "prosemirror-state";
import { Fragment, Slice, Node as ProsemirrorNode } from "prosemirror-model";
import { richTextSchema } from "../schema";
import { EditorView } from "prosemirror-view";
import { inTable } from "../commands";

export const tables = new Plugin({
    key: new PluginKey("tablesPlugin"),
    props: {
        /**
         * Users can copy & paste tables that originate from anywhere and
         * that use a structure we're not supporting (colspans, rowspans, etc).
         * Our markdown-based table format is pretty limited and trying to deal
         * with all those extravagant tables users might paste is a major pain
         * in the rear and can lead to countless ways of breaking the rich-text
         * document structure.
         *
         * This is why we're intercepting the paste event for tables,
         * find table nodes and replace them with a plain representation of their
         * text content only.
         * This way we avoid major headache at the expense of not allowing to copy
         * and paste table structures.
         *
         * Currently this only goes two levels deep, so this problem persists if
         * someone's pasting a table in e.g. deeply nested blockquotes.
         * A recursive approach would be able to tackle this but prosemirror's `forEach`
         * based implementation makes this awkward to pull off.
         */
        transformPasted(slice: Slice): Slice {
            return new Slice(tablesToPlainText(slice.content), 1, 1);
        },
        /**
         * Handles pasting content into rich-text tables and makes sure
         * that every pasted content is pasted as plain text.
         *
         * Users could paste arbitrary stuff into table cells, including
         * nasty stuff like other (partial) table structures. If we don't
         * prevent this, there's a high chance that users can break our
         * quite strict concept of a table layout as prescribed by markdown
         * (each row must have the same amount of cells, etc).
         *
         * To prevent dealing with all edge cases that arise from pasting
         * weird rich-text nodes into a table, this plugin will intercept
         * every paste action that's supposed to insert content _into_ a
         * rich-text table and paste the copied contents as plain text.
         */
        handlePaste(
            view: EditorView,
            event: ClipboardEvent,
            slice: Slice
        ): boolean {
            if (inTable(view.state.selection)) {
                view.dispatch(view.state.tr.insertText(findCellContent(slice)));
                return true;
            }

            return false;
        },
    },
});

function tablesToPlainText(fragment: Fragment): Fragment {
    const sanitized: ProsemirrorNode[] = [];

    fragment.forEach((node: ProsemirrorNode) => {
        if (node.type === richTextSchema.nodes.table) {
            sanitized.push(
                richTextSchema.nodes.paragraph.createAndFill(
                    {},
                    richTextSchema.text(node.textContent)
                )
            );
        } else {
            sanitized.push(node.copy(tablesToPlainText(node.content)));
        }
    });

    return Fragment.fromArray(sanitized);
}

function findCellContent(slice: Slice): string | null {
    if (!slice.size) {
        return null;
    }

    if (slice.content && slice.content.firstChild) {
        return slice.content.firstChild.textContent;
    }

    return null;
}
