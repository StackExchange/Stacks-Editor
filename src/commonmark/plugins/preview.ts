import MarkdownIt from "markdown-it";
import { EditorState, Plugin, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { log } from "../../shared/logger";
import { createDefaultMarkdownItInstance } from "../../shared/markdown-parser";
import { docNodeChanged } from "../../shared/utils";
import { CommonmarkParserFeatures } from "../../shared/view";
import type { CommonmarkOptions } from "../editor";

class PreviewView implements PluginView {
    dom: HTMLDivElement;
    renderer: MarkdownIt;

    constructor(
        view: EditorView,
        parserFeatures: CommonmarkParserFeatures,
        markdownIt?: MarkdownIt
    ) {
        this.dom = document.createElement("div");
        this.dom.classList.add("s-prose", "js-md-preview");
        // TODO pass down the ExternalPluginProvider as well
        this.renderer =
            markdownIt ||
            createDefaultMarkdownItInstance({
                ...parserFeatures,
                // TODO until we handle proper html sanitizing in the renderer,
                // we need to disable html entirely...
                html: false,
            });

        this.update(view);
    }

    update(view: EditorView, prevState?: EditorState) {
        // if the doc/view hasn't changed, there's no work to do
        if (!docNodeChanged(prevState, view.state)) {
            return;
        }

        // NOTE: This assumes that the renderer is properly sanitizing html;
        // this is specified in the option docs @see CommonmarkOptions["preview"]
        // eslint-disable-next-line no-unsanitized/property
        this.dom.innerHTML = this.renderer.render(view.state.doc.textContent);
        log("PreviewView.update", "Updated preview");
    }

    destroy() {
        this.dom.remove();
    }
}

/**
 * Plugin that renders the editor's markdown content directly and displays it in a preview element
 * @param previewOptions The preview options passed to the commonmark editor
 * @param parserFeatures The features to enable/disable on the commonmark parser
 */
export function createPreviewPlugin(
    previewOptions: CommonmarkOptions["preview"],
    parserFeatures: CommonmarkParserFeatures
): Plugin {
    if (!previewOptions?.enabled) {
        return new Plugin({});
    }

    return new Plugin({
        view(editorView) {
            const previewView = new PreviewView(
                editorView,
                parserFeatures,
                previewOptions?.renderer
            );
            const containerFn =
                previewOptions?.parentContainer ||
                function (v) {
                    return v.dom.parentNode;
                };

            const container = containerFn(editorView);

            if (!container.contains(editorView.dom)) {
                container.insertBefore(previewView.dom, container.firstChild);
            } else {
                throw "Preview parentContainer must not contain the editor view";
            }

            return previewView;
        },
    });
}
