import { MarkdownParser } from "prosemirror-markdown";
import { Node as ProseMirrorNode, Schema } from "prosemirror-model";
import { EditorState, Plugin, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { CodeBlockHighlightPlugin } from "../../shared/highlighting/highlight-plugin";
import { interfaceManagerPlugin } from "../../shared/prosemirror-plugins/interface-manager";
import { readonlyPlugin } from "../../shared/prosemirror-plugins/readonly";
import { IExternalPluginProvider } from "../../shared/editor-plugin";
import { docChanged } from "../../shared/utils";
import { defaultParserFeatures } from "../../shared/view";
import { CodeBlockView } from "../../rich-text/node-views/code-block";
import {
    HtmlBlock,
    HtmlBlockContainer,
} from "../../rich-text/node-views/html-block";
import { ImageView } from "../../rich-text/node-views/image";
import { richTextSchemaSpec } from "../../rich-text/schema";
import { TagLink } from "../../rich-text/node-views/tag-link";
import { spoilerToggle } from "../../rich-text/plugins/spoiler-toggle";
import { buildMarkdownParser } from "../../shared/markdown-parser";

class PreviewView implements PluginView {
    dom: HTMLDivElement;
    protected view: EditorView;
    protected editorView: EditorView;
    protected finalizedSchema: Schema;
    protected markdownParser: MarkdownParser;

    constructor(
        view: EditorView,
        externalPluginProvider: IExternalPluginProvider
    ) {
        this.dom = document.createElement("div");
        this.finalizedSchema = new Schema(
            externalPluginProvider.getFinalizedSchema(richTextSchemaSpec)
        );
        this.markdownParser = buildMarkdownParser(
            defaultParserFeatures,
            this.finalizedSchema,
            externalPluginProvider
        );

        const doc: ProseMirrorNode = this.markdownParser.parse(
            view.state.doc.textContent
        );

        this.editorView = new EditorView(
            (node: HTMLElement) => {
                node.classList.add("s-prose", "s-markdown-preview");
                this.dom.appendChild(node);
            },
            {
                editable: () => false,
                state: EditorState.create({
                    doc: doc,
                    plugins: [
                        // TODO do we need richTextInputRules?
                        // TODO include sensible options on preview plugins, consider have options pass from main editor
                        CodeBlockHighlightPlugin(null),
                        interfaceManagerPlugin(null),
                        readonlyPlugin(),
                        spoilerToggle,
                    ],
                }),
                nodeViews: {
                    code_block(node: ProseMirrorNode) {
                        return new CodeBlockView(node);
                    },
                    image(
                        node: ProseMirrorNode,
                        view: EditorView,
                        getPos: () => number
                    ) {
                        return new ImageView(node, view, getPos);
                    },
                    tagLink(node: ProseMirrorNode) {
                        return new TagLink(node, null);
                    },
                    html_block: function (node: ProseMirrorNode) {
                        return new HtmlBlock(node);
                    },
                    html_block_container: function (node: ProseMirrorNode) {
                        return new HtmlBlockContainer(node);
                    },
                    // TODO do we need externalPluginProvider?
                    // ...this.externalPluginProvider.nodeViews,
                },
                plugins: [],
            }
        );

        this.update(view, null);
    }

    // TODO implement sensible update on change
    update(view: EditorView, prevState: EditorState) {
        // if the doc/view hasn't changed, there's no work to do
        if (!docChanged(prevState, view.state)) {
            return;
        }
    }

    destroy() {
        this.dom.remove();
    }
}

export function createPreviewPlugin(
    containerFn: (view: EditorView) => Node,
    externalPluginProvider: IExternalPluginProvider
): Plugin {
    return new Plugin({
        view(editorView) {
            const previewView = new PreviewView(
                editorView,
                externalPluginProvider
            );
            containerFn =
                containerFn ||
                function (v) {
                    return v.dom.parentNode;
                };

            const container = containerFn(editorView);

            if (container.contains(editorView.dom)) {
                container.insertBefore(previewView.dom, editorView.dom);
            } else {
                container.insertBefore(previewView.dom, container.firstChild);
            }

            return previewView;
        },
    });
}
