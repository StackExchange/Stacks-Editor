import { Plugin } from "prosemirror-state";

export const plainTextPasteHandler = new Plugin({
    props: {
        handlePaste(view, event, slice) {
            // user is only pasting plain text, so don't process
            if (!event.clipboardData?.getData("text/html")) {
                return false;
            }

            let textNode = slice.content.firstChild;

            // content might be a paragraph with a single text node
            if (
                textNode?.type?.name === "paragraph" &&
                textNode.childCount === 1
            ) {
                textNode = textNode.firstChild;
            }

            // if the pasted content is not plain text, don't process
            if (
                !textNode ||
                textNode.type.name !== "text" ||
                textNode.marks.length
            ) {
                return false;
            }

            // check if we're pasting into a node with marks to avoid unnecessary capturing
            const { selection } = view.state;
            const insertLocation = selection.$from.nodeBefore;
            if (!insertLocation?.marks.length) {
                return false;
            }

            // finally, insert the text with *marks inherited*
            view.dispatch(view.state.tr.replaceSelectionWith(textNode, true));

            return true;
        },
    },
});
