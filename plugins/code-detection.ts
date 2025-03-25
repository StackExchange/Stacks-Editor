import { Plugin, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { EditorType, type EditorPlugin } from "../src";

type InterceptImageUploadEvent = CustomEvent<{
    file: File;
    resume: (resume: boolean) => void;
}>;

const insertRichTextCodeBlock = (view: EditorView, code: string) => {
    let tr = view.state.tr;
    tr = tr.replaceSelectionWith(
        view.state.schema.nodes.code_block.create(
            {},
            view.state.schema.text(code)
        )
    );
    view.dispatch(tr);
};

const insertCommonmarkCodeBlock = (view: EditorView, code: string) => {
    const mdString = "```\n" + code + "\n```\n";
    let tr = view.state.tr;
    tr = tr.insertText(mdString, tr.selection.from, tr.selection.to);
    view.dispatch(tr);
};

class InterceptImageUploadView implements PluginView {
    private listener: (e: InterceptImageUploadEvent) => void;

    constructor(
        private view: EditorView,
        insertCodeBlock: (view: EditorView, code: string) => void
    ) {
        this.listener = (e: InterceptImageUploadEvent) =>
            void (async () => {
                // pause the regular flow so that the image is not uploaded
                // we can resume it by calling e.detail.resume(true) later on
                e.preventDefault();

                // simulation of a call to code detection API
                const code: string = await new Promise((resolve) =>
                    setTimeout(
                        () => resolve(`console.log('Hello World!')`),
                        1000
                    )
                );

                // no code detected, resume the regular image upload
                if (!code) {
                    e.detail.resume(true);
                    return;
                }

                // code is detected in the image, ask the user if they want to insert the code instead
                // eslint-disable-next-line no-alert
                const insertCode = window.confirm(
                    "We have detected code in this image. Would you like to extract it?"
                );

                // user chose not to insert the code - resume the regular image upload
                if (!insertCode) {
                    e.detail.resume(true);
                    return;
                }

                // user chose to insert the code - don't resume image upload
                e.detail.resume(false);

                // insert the code in a code block
                insertCodeBlock(view, code);
            })();

        view.dom.addEventListener("StacksEditor:image-upload", this.listener);
    }

    destroy() {
        this.view.dom.removeEventListener(
            "StacksEditor:image-upload",
            this.listener
        );
    }
}

const createCodeDetectionPlugin = (mode: EditorType) => {
    const insertCodeBlock = {
        [EditorType.RichText]: insertRichTextCodeBlock,
        [EditorType.Commonmark]: insertCommonmarkCodeBlock,
    };
    return new Plugin({
        view(view) {
            return new InterceptImageUploadView(view, insertCodeBlock[mode]);
        },
    });
};

export const codeDetectionPlugin: EditorPlugin = () => ({
    richText: {
        plugins: [createCodeDetectionPlugin(EditorType.RichText)],
    },
    commonmark: {
        plugins: [createCodeDetectionPlugin(EditorType.Commonmark)],
    },
});
