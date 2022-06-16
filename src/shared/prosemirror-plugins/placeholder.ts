import { Node } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Whether to show the placeholder, given the contents of the document
 * @param content The root document node
 */
function showPlaceholder(content: Node) {
    const { firstChild } = content;
    const { name } = firstChild.type;
    const allowPlaceholder =
        name === "paragraph" ||
        name === "heading" ||
        (firstChild.attrs.params === "markdown" && !firstChild.attrs.markup);
    // TODO check for image upload placeholder
    return (
        !content.textContent && allowPlaceholder && firstChild.childCount === 0
    );
}

/**
 * Creates a placeholder decoration on the document's first child
 * @param doc The root document node
 * @param placeholder The placeholder text
 */
function createPlaceholderDecoration(doc: Node, placeholder: string) {
    if (showPlaceholder(doc)) {
        const $pos = doc.resolve(1);
        return DecorationSet.create(doc, [
            Decoration.node($pos.before(), $pos.after(), {
                "data-placeholder": placeholder,
            }),
        ]);
    }

    return null;
}

/** Plugin that adds placeholder text to the editor when it's empty */
export function placeholderPlugin(placeholder: string): Plugin {
    return new Plugin<DecorationSet>({
        state: {
            init: (_, state) =>
                createPlaceholderDecoration(state.doc, placeholder),
            apply: (tr) => createPlaceholderDecoration(tr.doc, placeholder),
        },
        props: {
            decorations(this: Plugin<DecorationSet>, state) {
                return this.getState(state);
            },
        },
        view(view) {
            view.dom.setAttribute("aria-placeholder", placeholder);

            return {};
        },
    });
}
