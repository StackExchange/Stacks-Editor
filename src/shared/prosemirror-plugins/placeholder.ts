import { Node } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

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

// TODO write a test for this
/** Plugin that adds placeholder text to the editor when it's empty */
export function placeholderPlugin(placeholder: string): Plugin {
    return new Plugin<DecorationSet>({
        state: {
            init: (_, state) =>
                createPlaceholderDecoration(state.doc, placeholder),
            apply: (tr) => createPlaceholderDecoration(tr.doc, placeholder),
        },
        props: {
            decorations(state) {
                return this.getState(state);
            },
        },
        view(view) {
            view.dom.setAttribute("aria-placeholder", placeholder);

            return {};
        },
    });
}
