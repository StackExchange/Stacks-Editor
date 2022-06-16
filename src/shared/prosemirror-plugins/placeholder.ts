import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Creates a placeholder decoration on the document's first child
 * @param doc The root document node
 * @param placeholder The placeholder text
 */
function createPlaceholderDecoration(doc: Node, placeholder: string) {
    // TODO check for image upload placeholder
    const showPlaceholder =
        !doc.textContent &&
        doc.childCount === 1 &&
        doc.firstChild.childCount === 0;

    if (!showPlaceholder) {
        return DecorationSet.empty;
    }

    const $pos = doc.resolve(1);
    return DecorationSet.create(doc, [
        Decoration.node($pos.before(), $pos.after(), {
            "data-placeholder": placeholder,
        }),
    ]);
}

/** Plugin that adds placeholder text to the editor when it's empty */
export function placeholderPlugin(placeholder: string): Plugin {
    if (!placeholder?.trim()) {
        return new Plugin({});
    }

    return new Plugin<DecorationSet>({
        key: new PluginKey("placeholder"),
        state: {
            init: (_, state) =>
                createPlaceholderDecoration(state.doc, placeholder),
            apply: (tr, value) => {
                if (!tr.docChanged) {
                    return value.map(tr.mapping, tr.doc);
                }

                return createPlaceholderDecoration(tr.doc, placeholder);
            },
        },
        props: {
            decorations(this: Plugin<DecorationSet>, state) {
                return this.getState(state);
            },
        },
        view(view) {
            view.dom.setAttribute("aria-placeholder", placeholder);

            return {
                destroy() {
                    view.dom.removeAttribute("aria-placeholder");
                },
            };
        },
    });
}
