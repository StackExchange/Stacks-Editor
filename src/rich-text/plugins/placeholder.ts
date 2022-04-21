import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

// TODO write a test for this
// TODO cleanup to match common plugin code style
export const placeholderPlugin = (placeholderText = ""): Plugin => {
    const update = (view: EditorView) => {
        const { content, textContent } = view.state.doc;
        const firstChildType = content.firstChild.type.name;
        // TODO investigate a more dependable check for empty content
        // TODO check for image upload placeholder
        const showPlaceholder =
            placeholderText &&
            !textContent &&
            (firstChildType === "paragraph" || firstChildType === "heading") &&
            content.firstChild.childCount === 0;
        if (showPlaceholder) {
            view.dom.setAttribute("data-placeholder", placeholderText);
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
};
