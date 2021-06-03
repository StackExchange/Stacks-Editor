import { Plugin, EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node, Schema } from "prosemirror-model";
import { validateLink } from "../../shared/utils";

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
            const link = event.clipboardData.getData("text/plain");

            if (!link || !validateLink(link)) {
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
