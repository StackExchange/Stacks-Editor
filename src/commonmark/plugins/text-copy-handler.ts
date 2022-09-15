import { DOMSerializer } from "prosemirror-model";
import { Plugin } from "prosemirror-state";

/** Plugin that ensures that all commonmark editor contents are copied as plain text, not as code */
export const textCopyHandlerPlugin = new Plugin({
    props: {
        clipboardSerializer: new DOMSerializer(
            {
                code_block: (node) => node.textContent,
            },
            {}
        ),
    },
});
