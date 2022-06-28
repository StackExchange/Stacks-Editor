import MarkdownIt from "markdown-it";
import { Plugin, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

class PreviewView implements PluginView {
    dom: HTMLDivElement;
    renderer: MarkdownIt;
    prevTextContent: string;

    constructor(view: EditorView, markdownIt?: MarkdownIt) {
        this.dom = document.createElement("div");
        this.renderer = markdownIt || new MarkdownIt();
        const { textContent } = view.state.doc;
        this.prevTextContent = textContent;
        // TODO do we need to sanitize this HTML or is that handled fine by the editor?
        // eslint-disable-next-line no-unsanitized/property
        this.dom.innerHTML = this.renderer.render(this.prevTextContent);
        this.update(view);
    }

    update(view: EditorView) {
        // if the doc/view hasn't changed, there's no work to do
        if (view.state.doc.textContent === this.prevTextContent) {
            return;
        }
        // eslint-disable-next-line no-unsanitized/property
        this.dom.innerHTML = this.renderer.render(view.state.doc.textContent);
    }

    destroy() {
        this.dom.remove();
    }
}

export function createPreviewPlugin(
    containerFn: (view: EditorView) => Node,
    markdownIt?: MarkdownIt
): Plugin {
    return new Plugin({
        view(editorView) {
            const previewView = new PreviewView(editorView, markdownIt);
            containerFn =
                containerFn ||
                function (v) {
                    return v.dom.parentNode;
                };

            const container = containerFn(editorView);

            if (!container.contains(editorView.dom)) {
                container.insertBefore(previewView.dom, container.firstChild);
            }

            return previewView;
        },
    });
}
