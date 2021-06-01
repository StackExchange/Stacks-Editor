import { Plugin, EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node, Schema } from "prosemirror-model";

/**
 * Detects if pasted text is a URL (and nothing else)
 * @param clipboardData The clipboardData from ClipboardEvent
 * @returns The pasted text if it matches the URL pattern; null otherwise
 */
function getDetectedLink(clipboardData: DataTransfer): string | null {
    const content = clipboardData.getData("text/plain");
    if (!content) {
        return null;
    }

    // We may need to beef this up over time, but it should be a decent starting point for
    // detecting URL pastes.
    // Credit goes to Keng over at https://stackoverflow.com/a/163684.
    const urlRegex = /^(https?|ftp):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]*[-A-Za-z0-9+&@#/%=~_|]$/;

    if (urlRegex.test(content)) {
        return content;
    }

    return null;
}

function isInlineCode(state: EditorState): boolean {
    const { from, $from, to, empty } = state.selection;
    const schema = state.schema as Schema;
    if (!empty) {
        return state.doc.rangeHasMark(from, to, schema.marks.code);
    }

    return (
        schema.marks.code.isInSet(state.storedMarks || $from.marks()) !==
        undefined
    );
}

/** Plugin that detects if a URL is being pasted in and automatically formats it as a link */
export const linkPasteHandler = new Plugin({
    props: {
        handlePaste(view: EditorView, event: ClipboardEvent) {
            const link = getDetectedLink(event.clipboardData);

            if (!link) {
                return false;
            }

            if (isInlineCode(view.state)) {
                view.dispatch(view.state.tr.insertText(link));
            } else {
                const schema = view.state.schema as Schema;
                const linkAttrs = { href: link, markup: "linkify" };
                const node: Node = schema.text(link, [
                    schema.marks.link.create(linkAttrs),
                ]);

                view.dispatch(view.state.tr.replaceSelectionWith(node, false));
            }

            return true;
        },
    },
});
