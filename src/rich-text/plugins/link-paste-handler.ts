import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node, Schema } from "prosemirror-model";

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

export const linkPasteHandler = new Plugin({
    props: {
        handlePaste(view: EditorView, event: ClipboardEvent) {
            const link = getDetectedLink(event.clipboardData);

            if (!link) {
                return false;
            }

            const schema = view.state.schema as Schema;
            const linkAttrs = { href: link, markup: "linkify" };
            const node: Node = schema.text(link, [
                schema.marks.link.create(linkAttrs),
            ]);

            view.dispatch(view.state.tr.replaceSelectionWith(node, false));

            return true;
        },
    },
});

// FIXME: ignore pasting into inline code
