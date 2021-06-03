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
            const selectedNode = view.state.selection.$from.node();
            if (selectedNode.type.name === "code_block") {
                // We don't need to do anything special to handle pasting into code blocks
                // except to avoid overriding that default behavior.
                return false;
            }

            const link = event.clipboardData.getData("text/plain");
            if (!link || !validateLink(link)) {
                return false;
            }

            if (isInlineCode(view.state)) {
                // TODO: Would be nice to support smarter pasting into inline code in general.
                // This supports the bare minimum (not breaking the inline block if we're pasting a link in)
                // But any other pasting into inline code ends up breaking its styling.
                view.dispatch(view.state.tr.insertText(link));
            } else {
                let linkText = link;

                if (!view.state.tr.selection.empty) {
                    const selection = view.state.tr.selection;
                    let selectedText = "";
                    view.state.doc.nodesBetween(
                        selection.from,
                        selection.to,
                        (node, position) => {
                            if (!node.isText) {
                                return;
                            }

                            const start = Math.max(0, selection.from - position);
                            const end = Math.max(0, selection.to - position);
                            selectedText += node.textBetween(start, end);
                        }
                    );

                    if (selectedText) {
                        linkText = selectedText;
                    }
                }

                const schema = view.state.schema as Schema;
                const linkAttrs = { href: link, markup: linkText === link ? "linkify" : null };

                const node: Node = schema.text(linkText, [
                    schema.marks.link.create(linkAttrs),
                ]);

                view.dispatch(view.state.tr.replaceSelectionWith(node, false));
            }

            return true;
        },
    },
});
