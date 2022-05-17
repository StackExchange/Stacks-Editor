import { Fragment } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

function showPlaceholder(content: Fragment, textContent: string) {
    const { firstChild } = content;
    const { name } = firstChild.type;
    const allowPlaceholder =
        name === "paragraph" ||
        name === "heading" ||
        firstChild.attrs.params === "markdown";
    // TODO check for image upload placeholder
    return !textContent && allowPlaceholder && firstChild.childCount === 0;
}

// TODO write a test for this
/** Plugin that add placeholder text to the editor when it's empty */
export function placeholderPlugin(placeholder: string): Plugin {
    const update = (view: EditorView) => {
        const { content, textContent } = view.state.doc;

        if (placeholder && showPlaceholder(content, textContent)) {
            view.dom.setAttribute("data-placeholder", placeholder);
        } else {
            view.dom.removeAttribute("data-placeholder");
        }
    };

    return new Plugin({
        view(view) {
            update(view);

            return { update };
        },
    });
}