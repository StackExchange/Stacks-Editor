import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

// TODO cleanup to match common plugin code style
export const placeholderPlugin = (text = ""): Plugin => {
    const update = (view: EditorView) => {
        // TODO add empty check that accounts for added blocks like blockquote
        if (view.state.doc.textContent || text === "") {
            view.dom.removeAttribute("data-placeholder");
        } else {
            view.dom.setAttribute("data-placeholder", text);
        }
    };

    return new Plugin({
        view(view) {
            update(view);

            return { update };
        },
    });
};
