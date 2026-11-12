import { DOMSerializer, Fragment } from "prosemirror-model";
import { Plugin } from "prosemirror-state";

/** DOMSerializer that serializes each top-level node as a plain text node */
class TextOnlySerializer extends DOMSerializer {
    /** Serializes the fragment's top-level nodes as text nodes of their text content */
    serializeFragment(
        fragment: Fragment,
        options: { document?: Document } = {},
        target?: HTMLElement | DocumentFragment
    ): HTMLElement | DocumentFragment {
        const doc = options.document || window.document;
        target = target || doc.createDocumentFragment();
        fragment.forEach((node) => {
            target.appendChild(doc.createTextNode(node.textContent));
        });
        return target;
    }
}

/** Plugin that ensures that all commonmark editor contents are copied as plain text, not as code */
export const textCopyHandlerPlugin = new Plugin({
    props: {
        clipboardSerializer: new TextOnlySerializer({}, {}),
    },
});
