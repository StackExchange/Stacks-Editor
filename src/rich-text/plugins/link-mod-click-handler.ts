import { Plugin, EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Mark } from "prosemirror-model";

/**
 * Returns the mark at cursor if it is of type `link`
 * @param state The current editor state
 */
function findLinkAtCursor(state: EditorState): Mark {
    const { $from, empty } = state.selection;
    return (
        empty &&
        $from.marks().find((mark) => mark.type === mark.type.schema.marks.link)
    );
}

/** Plugin that opens link in new window/tab on Mod-click */
export const linkModClickHandler = () =>
    new Plugin({
        props: {
            handleClick(
                this,
                view: EditorView,
                pos: number,
                event: MouseEvent
            ) {
                const selectedLink = findLinkAtCursor(view.state);
                const modPressed = event.getModifierState(
                    /Mac|iP(hone|[oa]d)/.test(navigator.platform)
                        ? "Meta"
                        : "Control"
                );

                if (selectedLink && modPressed) {
                    window.open(selectedLink.attrs.href, "_blank");
                }

                return true;
            },
        },
    });
