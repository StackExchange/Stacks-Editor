import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Slice, Node } from "prosemirror-model";

/**
 * Detects if code was pasted into the document and returns the text if true
 * @param clipboardData The clipboardData from the ClipboardEvent
 */
export function getDetectedCode(clipboardData: DataTransfer): string | null {
    // if we're loading a whole document, don't false positive if there's more than just code
    const htmlContent = clipboardData.getData("text/html");
    if (htmlContent && htmlContent.includes("<code>")) {
        const allContent = new DOMParser().parseFromString(
            htmlContent,
            "text/html"
        );
        const codeBlock = allContent.querySelector("code");

        return allContent.body.textContent.trim() !== codeBlock.textContent
            ? null
            : codeBlock.textContent;
    }

    const textContent = clipboardData.getData("text/plain");

    if (!textContent) {
        return null;
    }

    // TODO how to reliably detect if a string is code?

    // TODO add more support?
    // check if there's ide specific paste data present
    if (clipboardData.getData("vscode-editor-data")) {
        // TODO parse data for language?
        return textContent;
    }

    // no ide detected, try detecting leading indentation
    // true if any line starts with: 2+ space characters, 1 tab character
    if (/^([ ]{2,}|\t)/m.test(textContent)) {
        return textContent;
    }

    return null;
}

/** Plugin that auto-detects if code was pasted and handles it specifically */
export const codePasteHandler = new Plugin({
    props: {
        handlePaste(view: EditorView, event: ClipboardEvent, slice: Slice) {
            let codeData: string;

            // if the schema parser already detected a code block, just use that
            if (
                slice.content.childCount === 1 &&
                slice.content.child(0).type.name === "code_block"
            ) {
                codeData = slice.content.child(0).textContent;
            } else {
                codeData = getDetectedCode(event.clipboardData);
            }

            if (!codeData) {
                return false;
            }

            // TODO can we do some basic formatting?

            const selectedNode = view.state.selection.$from.node();

            // if we're pasting into a code_block, just paste the text
            // otherwise, create a code_block and paste into that instead
            if (selectedNode.type.name === "code_block") {
                codeData = `\n\`\`\`\n${codeData}\n\`\`\``;
                view.dispatch(view.state.tr.insertText(codeData));
            } else {
                const schema = view.state.schema;
                const node: Node = schema.node(
                    "code_block",
                    {},
                    schema.text(codeData)
                );

                view.dispatch(view.state.tr.replaceSelectionWith(node));
            }

            return true;
        },
    },
});
