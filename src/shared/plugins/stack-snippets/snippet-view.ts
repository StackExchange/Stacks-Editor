import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import {
    getSnippetMetadata,
    SnippetMetadata,
    StackSnippetOptions,
} from "./common";

export class StackSnippetView implements NodeView {
    constructor(
        node: ProsemirrorNode,
        view: EditorView,
        getPos: () => number,
        opts: StackSnippetOptions
    ) {
        this.opts = opts;
        this.view = view;
        this.getPos = getPos;

        //We want to render the language blocks in the middle of some content,
        // so we need to custom-render stuff here ("holes" must be last)
        const snippetContainer = document.createElement("div");
        this.dom = snippetContainer;
        snippetContainer.className = "snippet";

        //This is the div where we're going to render any language blocks
        const snippetCode = document.createElement("div");
        snippetCode.className = "snippet-code";
        snippetContainer.appendChild(snippetCode);
        this.contentDOM = snippetCode;

        //And this is where we stash our CTAs and results, which are statically rendered.
        const snippetResult = document.createElement("div");
        snippetResult.className = "snippet-result";
        snippetContainer.appendChild(snippetResult);

        const ctas = document.createElement("div");
        ctas.className = "snippet-ctas";
        const runCodeButton = document.createElement("button");
        runCodeButton.type = "button";
        runCodeButton.className = "s-btn s-btn__filled";
        runCodeButton.title = "Run code snippet";
        runCodeButton.setAttribute("aria-label", "Run code snippet");
        // create the svg svg-icon-bg element
        const runIcon = document.createElement("span");
        runIcon.className = "svg-icon-bg iconPlay";
        runCodeButton.append(runIcon);
        const runText = document.createElement("span");
        runText.textContent = "Run code snippet";
        runCodeButton.appendChild(runText);
        const id: unknown = node.attrs["id"];
        if (opts.renderer && id && typeof id == "string") {
            runCodeButton.addEventListener("click", () => {
                const [js] = this.snippetMetadata.langNodes.filter(
                    (l) => l.metaData.language == "js"
                );
                const [css] = this.snippetMetadata.langNodes.filter(
                    (l) => l.metaData.language == "css"
                );
                const [html] = this.snippetMetadata.langNodes.filter(
                    (l) => l.metaData.language == "html"
                );
                this.opts
                    .renderer(
                        this.snippetMetadata,
                        js?.content,
                        css?.content,
                        html?.content
                    )
                    .then((r) => {
                        if (r) {
                            this.view.dispatch(
                                this.view.state.tr.setNodeMarkup(
                                    this.getPos(),
                                    null,
                                    {
                                        ...node.attrs,
                                        content: r,
                                    }
                                )
                            );
                        } else {
                            console.log(r);
                        }
                    })
                    .catch((r) => {
                        console.log(r);
                    });
            });
        }

        ctas.appendChild(runCodeButton);

        snippetResult.appendChild(ctas);

        this.resultContainer = document.createElement("div");
        this.resultContainer.className = "snippet-result-code";
        snippetResult.appendChild(this.resultContainer);

        //Rendered children will be handled by Prosemirror, but we want a handle on their content:
        this.snippetMetadata = getSnippetMetadata(node);
    }

    update(node: ProsemirrorNode): boolean {
        if (node.type.name !== "stack_snippet") return false;

        this.snippetMetadata = getSnippetMetadata(node);
        const content = node.attrs["content"] as Node;
        if (content) {
            //Clear the node
            this.resultContainer.textContent = "";
            this.resultContainer.appendChild(content);
        }
        return true;
    }

    private opts: StackSnippetOptions;
    private view: EditorView;
    private snippetMetadata: SnippetMetadata;
    private getPos: () => number;
    resultContainer: HTMLDivElement;
    dom: Node;
    contentDOM: HTMLElement;
}
