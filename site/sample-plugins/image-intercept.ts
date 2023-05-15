import { Plugin, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import type { EditorPlugin } from "../../src";

const plugin = new Plugin({
    view(view) {
        return new InterceptView(view);
    },
});

class InterceptView implements PluginView {
    private listener: (
        this: InterceptView,
        e: CustomEvent<{ file: File }>
    ) => void;

    constructor(private view: EditorView) {
        this.listener = function (
            this: InterceptView,
            e: CustomEvent<{ file: File }>
        ) {
            // eslint-disable-next-line no-alert
            const intercept = window.confirm(
                "We have detected code in this image. Would you like to extract it?"
            );

            // user chose not to intercept, just return
            if (!intercept) {
                return;
            }

            // cancel the event so the image is not uploaded - we'll handle it
            e.preventDefault();

            let tr = view.state.tr;

            // insert a code block
            tr = tr.insert(
                tr.selection.from,
                view.state.schema.nodes.code_block.create(
                    {},
                    view.state.schema.text(`console.log('Hello World!')`)
                )
            );

            view.dispatch(tr);
        }.bind(this);

        view.dom.addEventListener("StacksEditor:image-upload", this.listener);
    }
    destroy() {
        this.view.dom.removeEventListener("", this.listener);
    }
}

export const imageInterceptPlugin: EditorPlugin = () => ({
    richText: {
        plugins: [plugin],
    },
});
