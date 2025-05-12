import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import {
    getSnippetMetadata,
    SnippetMetadata,
    StackSnippetOptions,
} from "./common";
import { error } from "../../../../src";
import { openSnippetModal } from "./commands";

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
        const codeIsShown: boolean =
            typeof node.attrs.showCode === "boolean"
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
            toggleContainer.className =
                "snippet-toggle-container d-inline-flex ai-center g2";

            // Create the arrow span
            const arrowSpan = document.createElement("span");
            arrowSpan.className = codeIsShown
                ? "svg-icon-bg iconArrowDownSm"
                : "svg-icon-bg iconArrowRightSm";
            toggleContainer.appendChild(arrowSpan);

            // Create the show/hide link
            const toggleLink = document.createElement("a");
            toggleLink.href = "#";
            toggleLink.className = "snippet-toggle fs-body1";
            toggleLink.textContent = codeIsShown
                ? "Hide code snippet"
                : "Show code snippet";
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
        ctas.className = "snippet-ctas d-flex ai-center";
        if (opts && opts.renderer) {
            const snippetButtonContainer = document.createElement("div");
            snippetButtonContainer.className = "snippet-buttons gs4";
            ctas.appendChild(snippetButtonContainer);
            this.buildRunButton(node, snippetButtonContainer);
            this.buildEditButton(node, snippetButtonContainer);

            const snippetResultButtonContainer = document.createElement("div");
            snippetResultButtonContainer.className =
                "snippet-result-buttons d-none ml-auto gs4";
            ctas.appendChild(snippetResultButtonContainer);
            this.showButton = this.buildShowButton(
                node,
                snippetResultButtonContainer
            );
            this.hideButton = this.buildHideButton(
                node,
                snippetResultButtonContainer
            );
            this.buildFullscreenExpandButton(
                node,
                snippetResultButtonContainer
            );
            this.snippetResultButtonContainer = snippetResultButtonContainer;
        }

        snippetResult.appendChild(ctas);

        this.resultContainer = document.createElement("div");
        this.resultContainer.className = "snippet-result-code";
        this.resultControlsContainer = document.createElement("div");
        this.resultControlsContainer.className =
            "snippet-result-controls d-none";
        this.fullscreenControls = document.createElement("div");
        this.fullscreenControls.className =
            "snippet-fullscreen-controls d-none";
        this.buildFullscreenCollapseButton(node, this.fullscreenControls);
        this.resultControlsContainer.appendChild(this.fullscreenControls);
        this.resultControlsContainer.appendChild(this.resultContainer);
        snippetResult.appendChild(this.resultControlsContainer);

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

        if (this.snippetMetadata.hide === "true") {
            // Update the visibility of the snippet-code div and toggle link
            const snippetCode = this.contentDOM;
            const toggleLink = this.dom.querySelector(".snippet-toggle");
            const arrowSpan = this.dom.querySelector(".svg-icon-bg");

            const isVisible = node.attrs.showCode as boolean;
            snippetCode.style.display = isVisible ? "" : "none";
            if(isVisible && snippetCode.classList.contains("d-none")) {
                snippetCode.classList.remove("d-none");
            } else {
                snippetCode.classList.add("d-none");
            }
            toggleLink.textContent = isVisible
                ? "Hide code snippet"
                : "Show code snippet";
            arrowSpan.className = isVisible
                ? "svg-icon-bg iconArrowDownSm"
                : "svg-icon-bg iconArrowRightSm";
        }

        // Update the result container if metadata has changed
        const content = this.contentNode;

        //Show the results, if the node meta allows it
        if (content && node.attrs.showResult) {
            if (this.resultControlsContainer.classList.contains("d-none")) {
                this.resultControlsContainer.classList.remove("d-none");
            }
            if (!this.showButton.classList.contains("d-none")) {
                this.showButton.classList.add("d-none");
            }
            if (this.hideButton.classList.contains("d-none")) {
                this.hideButton.classList.remove("d-none");
            }
        } else if (content && !node.attrs.showResult) {
            if (!this.resultControlsContainer.classList.contains("d-none")) {
                this.resultControlsContainer.classList.add("d-none");
            }
            if (this.showButton.classList.contains("d-none")) {
                this.showButton.classList.remove("d-none");
            }
            if (!this.hideButton.classList.contains("d-none")) {
                this.hideButton.classList.add("d-none");
            }
        }

        //Fullscreen the results, if the node meta needs it
        if (content && node.attrs.fullscreen) {
            if (
                !this.resultControlsContainer.classList.contains(
                    "snippet-fullscreen"
                )
            ) {
                this.resultControlsContainer.classList.add(
                    "snippet-fullscreen"
                );
            }
            if (this.fullscreenControls.classList.contains("d-none")) {
                this.fullscreenControls.classList.remove("d-none");
            }
        } else {
            if (
                this.resultControlsContainer.classList.contains(
                    "snippet-fullscreen"
                )
            ) {
                this.resultControlsContainer.classList.remove(
                    "snippet-fullscreen"
                );
            }
            if (!this.fullscreenControls.classList.contains("d-none")) {
                this.fullscreenControls.classList.add("d-none");
            }
        }

        if (metaChanged && content) {
            this.snippetResultButtonContainer.classList.remove("d-none");
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

    private readonly opts: StackSnippetOptions;
    private readonly view: EditorView;
    private readonly getPos: () => number;
    private snippetMetadata: SnippetMetadata;
    private contentNode: Node;
    private snippetResultButtonContainer: HTMLDivElement;
    private showButton: HTMLButtonElement;
    private hideButton: HTMLButtonElement;
    private resultControlsContainer: HTMLDivElement;
    private fullscreenControls: HTMLDivElement;
    resultContainer: HTMLDivElement;
    dom: HTMLElement;
    contentDOM: HTMLElement;

    private buildRunButton(
        node: ProseMirrorNode,
        container: HTMLDivElement
    ): void {
        const runCodeButton = document.createElement("button");
        runCodeButton.type = "button";
        runCodeButton.className = "s-btn s-btn__filled flex--item";
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

        container.appendChild(runCodeButton);
    }

    private buildEditButton(
        node: ProseMirrorNode,
        container: HTMLDivElement
    ): HTMLButtonElement {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "s-btn s-btn__outlined flex--item";
        editButton.title = "Edit code snippet";
        editButton.setAttribute("aria-label", "Edit code snippet");
        editButton.textContent = "Edit code snippet";
        editButton.addEventListener("click", () => {
            openSnippetModal(node, this.view, this.opts);
        });

        container.appendChild(editButton);
        return editButton;
    }

    private buildHideButton(
        node: ProseMirrorNode,
        container: HTMLDivElement
    ): HTMLButtonElement {
        const hideButton = document.createElement("button");
        hideButton.type = "button";
        hideButton.className = "s-btn flex--item";
        hideButton.title = "Hide results";
        hideButton.setAttribute("aria-label", "Hide results");
        const hideIcon = document.createElement("span");
        hideIcon.className = "svg-icon-bg iconEyeOff";
        hideButton.append(hideIcon);
        const hideText = document.createElement("span");
        hideText.textContent = "Hide results";
        hideButton.appendChild(hideText);
        hideButton.addEventListener("click", () => {
            //Trigger an update on the ProseMirror node
            this.view.dispatch(
                this.view.state.tr.setNodeMarkup(this.getPos(), null, {
                    ...node.attrs,
                    showResult: false,
                })
            );
        });

        container.appendChild(hideButton);
        return hideButton;
    }

    private buildShowButton(
        node: ProseMirrorNode,
        container: HTMLDivElement
    ): HTMLButtonElement {
        const showButton = document.createElement("button");
        showButton.type = "button";
        showButton.className = "s-btn flex--item d-none";
        showButton.title = "Show results";
        showButton.setAttribute("aria-label", "Show results");
        const hideIcon = document.createElement("span");
        hideIcon.className = "svg-icon-bg iconEye";
        showButton.append(hideIcon);
        const showText = document.createElement("span");
        showText.textContent = "Show results";
        showButton.appendChild(showText);
        showButton.addEventListener("click", () => {
            //Trigger an update on the ProseMirror node
            this.view.dispatch(
                this.view.state.tr.setNodeMarkup(this.getPos(), null, {
                    ...node.attrs,
                    showResult: true,
                })
            );
        });

        container.appendChild(showButton);

        return showButton;
    }

    private buildFullscreenExpandButton(
        node: ProseMirrorNode,
        container: HTMLDivElement
    ): HTMLButtonElement {
        const expandButton = document.createElement("button");
        expandButton.type = "button";
        expandButton.className = "s-btn flex--item";
        expandButton.title = "Expand Snippet";
        expandButton.setAttribute("aria-label", "Expand Snippet");
        expandButton.addEventListener("click", () => {
            //Trigger an update on the ProseMirror node
            this.view.dispatch(
                this.view.state.tr.setNodeMarkup(this.getPos(), null, {
                    ...node.attrs,
                    fullscreen: true,
                })
            );
        });
        const expandIcon = document.createElement("span");
        expandIcon.className = "svg-icon-bg iconShareSm";
        expandButton.append(expandIcon);
        const expandText = document.createElement("span");
        expandText.textContent = "Expand Snippet";
        expandButton.appendChild(expandText);

        container.appendChild(expandButton);
        return expandButton;
    }

    private buildFullscreenCollapseButton(
        node: ProseMirrorNode,
        container: HTMLDivElement
    ): HTMLButtonElement {
        const collapseButton = document.createElement("button");
        collapseButton.type = "button";
        collapseButton.className = "s-btn flex--item td-underline ml-auto";
        collapseButton.title = "Close Snippet";
        collapseButton.textContent = "Close";
        collapseButton.setAttribute("aria-label", "Close Snippet");
        collapseButton.addEventListener("click", () => {
            //Trigger an update on the ProseMirror node
            this.view.dispatch(
                this.view.state.tr.setNodeMarkup(this.getPos(), null, {
                    ...node.attrs,
                    fullscreen: false,
                })
            );
        });
        container.appendChild(collapseButton);
        return collapseButton;
    }
}
