import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import {
    getSnippetMetadata,
    SnippetMetadata,
    StackSnippetOptions,
} from "./common";
import { error } from "../../../../src";

export class StackSnippetView implements NodeView {
    constructor(
        node: ProseMirrorNode,
        view: EditorView,
        getPos: () => number,
        opts?: StackSnippetOptions
    ) {
        this.opts = opts;
        this.view = view;
        this.getPos = getPos;

        this.snippetMetadata = getSnippetMetadata(node);
        const codeIsShown: boolean = typeof node.attrs.showCode === "boolean"
            ? node.attrs.showCode
            : true;

        //We want to render the language blocks in the middle of some content,
        // so we need to custom-render stuff here ("holes" must be last)
        const snippetContainer = document.createElement("div");
        this.dom = snippetContainer;
        snippetContainer.className = "snippet";

        let toggleContainer: HTMLDivElement;

        if (this.snippetMetadata.hide === "true") {
            // Create the show/hide link container
            toggleContainer = document.createElement("div");
            toggleContainer.className = "snippet-toggle-container";

            // Create the arrow span
            const arrowSpan = document.createElement("span");
            arrowSpan.className = codeIsShown
                ? "svg-icon-bg iconArrowDownSm va-middle"
                : "svg-icon-bg iconArrowRightSm va-middle";
            toggleContainer.appendChild(arrowSpan);

            // Create the show/hide link
            const toggleLink = document.createElement("a");
            toggleLink.href = "#";
            toggleLink.className = "snippet-toggle fs-body1";
            toggleLink.textContent = codeIsShown ? "Hide Code" : "Show Code";
            toggleContainer.appendChild(toggleLink);

            snippetContainer.appendChild(toggleContainer);
        }

        //This is the div where we're going to render any language blocks
        const snippetCode = document.createElement("div");
        snippetCode.className = "snippet-code";
        snippetCode.style.display = codeIsShown ? "" : "none"; 
        snippetContainer.appendChild(snippetCode);
        this.contentDOM = snippetCode;

        if (this.snippetMetadata.hide === "true") {
            toggleContainer.addEventListener("click", (e) => {
                e.preventDefault();
                const isVisible = snippetCode.style.display !== "none";
e
                this.view.dispatch(
                    this.view.state.tr.setNodeMarkup(this.getPos(), null, {
                        ...node.attrs,
                        showCode: !isVisible,
                    })
                );
            });
        }

        //And this is where we stash our CTAs and results, which are statically rendered.
        const snippetResult = document.createElement("div");
        snippetResult.className = "snippet-result";
        snippetContainer.appendChild(snippetResult);

        const ctas = document.createElement("div");
        ctas.className = "snippet-ctas";
        if (opts && opts.renderer) {
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
                            this.contentNode = r;
                            //Trigger an update on the ProseMirror node
                            this.view.dispatch(
                                this.view.state.tr.setNodeMarkup(
                                    this.getPos(),
                                    null,
                                    {
                                        ...node.attrs,
                                        content: this.snippetMetadata,
                                    }
                                )
                            );
                        } else {
                            error(
                                "StackSnippetView - Run Code",
                                "No content to be displayed"
                            );
                        }
                    })
                    .catch((r) => {
                        error(
                            "StackSnippetView - Run Code",
                            "Error rendering snippet - %O",
                            r
                        );
                    });
            });

            ctas.appendChild(runCodeButton);
        }

        snippetResult.appendChild(ctas);

        this.resultContainer = document.createElement("div");
        this.resultContainer.className = "snippet-result-code";
        snippetResult.appendChild(this.resultContainer);

        //Rendered children will be handled by Prosemirror, but we want a handle on their content:
        this.snippetMetadata = getSnippetMetadata(node);
    }

    update(node: ProseMirrorNode): boolean {
        if (node.type.name !== "stack_snippet") return false;

        //Check to see if the metadata has changed
        const updatedMeta = getSnippetMetadata(node);
        const metaChanged =
            JSON.stringify(updatedMeta) ===
            JSON.stringify(this.snippetMetadata);
        this.snippetMetadata = updatedMeta;

        // Update the visibility of the snippet-code div and toggle link
        const snippetCode = this.contentDOM;
        const toggleLink = this.dom.querySelector(".snippet-toggle");
        const arrowSpan = this.dom.querySelector(".svg-icon-bg");

        const isVisible = node.attrs.showCode as boolean;
        snippetCode.style.display = isVisible ? "" : "none";
        toggleLink.textContent = isVisible ? "Hide Code" : "Show Code";
        arrowSpan.className = isVisible
            ? "svg-icon-bg iconArrowDownSm va-middle"
            : "svg-icon-bg iconArrowRightSm va-middle";

        // Update the result container if metadata has changed
        const content = this.contentNode;
        if (metaChanged && content) {
            //Clear the node
            this.resultContainer.innerHTML = "";
            const iframe = document.createElement("iframe");
            iframe.className =
                "snippet-box-edit snippet-box-result ps-relative w100 hmn0 baw0";
            iframe.setAttribute(
                "sandbox",
                "allow-forms allow-modals allow-scripts"
            );
            if (content.nodeType === Node.DOCUMENT_NODE) {
                const document = content as Document;
                iframe.srcdoc = document.documentElement.innerHTML;
            }
            this.resultContainer.appendChild(iframe);
        }
        return true;
    }

    private opts: StackSnippetOptions;
    private view: EditorView;
    private snippetMetadata: SnippetMetadata;
    private contentNode: Node;
    private getPos: () => number;
    resultContainer: HTMLDivElement;
    dom: HTMLElement;
    contentDOM: HTMLElement;
}
