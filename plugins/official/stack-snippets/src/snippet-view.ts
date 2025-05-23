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
        this.node = node;
        this.isFullscreen = false; //Never start fullscreened

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
            snippetButtonContainer.className = "snippet-buttons mb0 gs4";
            ctas.appendChild(snippetButtonContainer);
            this.buildRunButton(snippetButtonContainer);
            this.buildEditButton(snippetButtonContainer);

            const snippetResultButtonContainer = document.createElement("div");
            snippetResultButtonContainer.className =
                "snippet-result-buttons d-flex mb0 ml-auto gs4";
            ctas.appendChild(snippetResultButtonContainer);
            this.showButton = this.buildShowButton(
                snippetResultButtonContainer
            );
            this.showButton.classList.add("d-none");
            this.hideButton = this.buildHideButton(
                snippetResultButtonContainer
            );
            this.hideButton.classList.add("d-none");
            this.fullscreenButton = this.buildFullscreenExpandButton(
                snippetResultButtonContainer
            );
            this.fullscreenReturnButton = this.buildFullscreenCollapseButton(
                snippetResultButtonContainer
            );
            this.fullscreenReturnButton.classList.add("d-none");
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
        //Update the reference used by buttons, etc. for the most up-to-date node reference
        this.node = node;

        //Check to see if the metadata has changed
        const updatedMeta = getSnippetMetadata(node);
        const metaChanged =
            JSON.stringify(updatedMeta) !==
            JSON.stringify(this.snippetMetadata);
        this.snippetMetadata = updatedMeta;

        if (this.snippetMetadata.hide === "true") {
            // Update the visibility of the snippet-code div and toggle link
            const snippetCode = this.contentDOM;
            const toggleLink = this.dom.querySelector(".snippet-toggle");
            const arrowSpan = this.dom.querySelector(".svg-icon-bg");

            const isVisible = node.attrs.showCode as boolean;
            snippetCode.style.display = isVisible ? "" : "none";
            if (isVisible && snippetCode.classList.contains("d-none")) {
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
            if (!this.showButton.classList.contains("d-none")) {
                this.showButton.classList.add("d-none");
            }
            if (this.hideButton.classList.contains("d-none")) {
                this.hideButton.classList.remove("d-none");
            }
            if (this.resultContainer.classList.contains("d-none")) {
                this.resultContainer.classList.remove("d-none");
            }
        } else if (content && !node.attrs.showResult) {
            if (this.showButton.classList.contains("d-none")) {
                this.showButton.classList.remove("d-none");
            }
            if (!this.hideButton.classList.contains("d-none")) {
                this.hideButton.classList.add("d-none");
            }
            if (!this.resultContainer.classList.contains("d-none")) {
                this.resultContainer.classList.add("d-none");
            }
        }

        //Fullscreen the results, if the node meta needs it
        if (node.attrs.fullscreen) {
            //Verify the styles are correct - this is idempotent
            if (!this.dom.classList.contains("snippet-fullscreen")) {
                //We use `.snippet-fullscreen` as a marker for the rest of the styling
                this.dom.classList.add("snippet-fullscreen");
                this.dom.classList.add(...this.fullscreenClassList);
                this.dom.style.setProperty("background-color", "var(--white)");
            }
            if (!this.fullscreenButton?.classList.contains("d-none")) {
                this.fullscreenButton?.classList.add("d-none");
            }
            if (this.fullscreenReturnButton?.classList.contains("d-none")) {
                this.fullscreenReturnButton.classList.remove("d-none");
            }
            //If we weren't in fullscreen, trigger the fullscreen callback
            if (this.isFullscreen == false) {
                if (this.opts.onFullscreenExpand) {
                    this.opts.onFullscreenExpand();
                }
                this.isFullscreen = true;
            }
        } else {
            //Verify the styles are correct - this is idempotent
            if (this.dom.classList.contains("snippet-fullscreen")) {
                //We use `.snippet-fullscreen` as a marker for the rest of the styling
                this.dom.classList.remove("snippet-fullscreen");
                this.dom.classList.remove(...this.fullscreenClassList);
            }
            if (this.fullscreenButton?.classList.contains("d-none")) {
                this.fullscreenButton.classList.remove("d-none");
            }
            if (!this.fullscreenReturnButton?.classList.contains("d-none")) {
                this.fullscreenReturnButton?.classList.add("d-none");
            }

            //If we were in fullscreen, trigger the return
            if (this.isFullscreen == true) {
                if (this.opts.onFullscreenReturn) {
                    this.opts.onFullscreenReturn();
                }
                this.isFullscreen = false;
            }
        }

        //Re-run execution the snippet if something has changed, or we don't yet have a result
        if (content && (metaChanged || this.resultContainer.innerHTML === "")) {
            this.hideButton.classList.remove("d-none");
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
    private showButton: HTMLButtonElement;
    private hideButton: HTMLButtonElement;
    private fullscreenButton: HTMLButtonElement;
    private fullscreenReturnButton: HTMLButtonElement;
    private node: ProseMirrorNode;
    private isFullscreen: boolean;
    resultContainer: HTMLDivElement;
    dom: HTMLElement;
    contentDOM: HTMLElement;

    private readonly fullscreenClassList = [
        "ps-fixed",
        "t6",
        "l6",
        "z-modal",
        "w-screen",
        "h-screen",
    ];

    private buildRunButton(container: HTMLDivElement): void {
        const runCodeButton = document.createElement("button");
        runCodeButton.type = "button";
        runCodeButton.className = "s-btn s-btn__filled flex--item";
        runCodeButton.title = "Run code snippet";
        runCodeButton.setAttribute("aria-label", "Run code snippet");
        // create the svg svg-icon-bg element
        const runIcon = document.createElement("span");
        runIcon.className = "svg-icon-bg mr4 iconPlay";
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
                                    ...this.node.attrs,
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

    private buildEditButton(container: HTMLDivElement): HTMLButtonElement {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "s-btn s-btn__outlined flex--item";
        editButton.title = "Edit code snippet";
        editButton.setAttribute("aria-label", "Edit code snippet");
        editButton.textContent = "Edit code snippet";
        editButton.addEventListener("click", () => {
            openSnippetModal(this.node, this.view, this.opts);
        });

        container.appendChild(editButton);
        return editButton;
    }

    private buildHideButton(container: HTMLDivElement): HTMLButtonElement {
        const hideButton = document.createElement("button");
        hideButton.type = "button";
        hideButton.className = "s-btn flex--item";
        hideButton.title = "Hide results";
        hideButton.setAttribute("aria-label", "Hide results");
        const hideIcon = document.createElement("span");
        hideIcon.className = "svg-icon-bg mr4 iconEyeOff";
        hideButton.append(hideIcon);
        const hideText = document.createElement("span");
        hideText.textContent = "Hide results";
        hideButton.appendChild(hideText);
        hideButton.addEventListener("click", () => {
            //Trigger an update on the ProseMirror node
            this.view.dispatch(
                this.view.state.tr.setNodeMarkup(this.getPos(), null, {
                    ...this.node.attrs,
                    showResult: false,
                })
            );
        });

        container.appendChild(hideButton);
        return hideButton;
    }

    private buildShowButton(container: HTMLDivElement): HTMLButtonElement {
        const showButton = document.createElement("button");
        showButton.type = "button";
        showButton.className = "s-btn flex--item d-none";
        showButton.title = "Show results";
        showButton.setAttribute("aria-label", "Show results");
        const hideIcon = document.createElement("span");
        hideIcon.className = "svg-icon-bg mr4 iconEye";
        showButton.append(hideIcon);
        const showText = document.createElement("span");
        showText.textContent = "Show results";
        showButton.appendChild(showText);
        showButton.addEventListener("click", () => {
            //Trigger an update on the ProseMirror node
            this.view.dispatch(
                this.view.state.tr.setNodeMarkup(this.getPos(), null, {
                    ...this.node.attrs,
                    showResult: true,
                })
            );
        });

        container.appendChild(showButton);

        return showButton;
    }

    private buildFullscreenExpandButton(
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
                    ...this.node.attrs,
                    fullscreen: true,
                })
            );
        });
        const expandIcon = document.createElement("span");
        expandIcon.className = "svg-icon-bg mr4 iconShareSm";
        expandButton.append(expandIcon);
        const expandText = document.createElement("span");
        expandText.textContent = "Expand Snippet";
        expandButton.appendChild(expandText);

        container.appendChild(expandButton);
        return expandButton;
    }

    private buildFullscreenCollapseButton(
        container: HTMLDivElement
    ): HTMLButtonElement {
        const collapseButton = document.createElement("button");
        collapseButton.type = "button";
        collapseButton.className = "s-btn flex--item td-underline ml-auto";
        collapseButton.title = "Return to post";
        collapseButton.setAttribute("aria-label", "Return to post");
        collapseButton.addEventListener("click", () => {
            //Trigger an update on the ProseMirror node
            this.view.dispatch(
                this.view.state.tr.setNodeMarkup(this.getPos(), null, {
                    ...this.node.attrs,
                    fullscreen: false,
                })
            );
        });
        const collapseIcon = document.createElement("span");
        collapseIcon.className = "svg-icon-bg mr4 iconShareSm";
        collapseButton.append(collapseIcon);
        const expandText = document.createElement("span");
        expandText.textContent = "Return to post";
        collapseButton.appendChild(expandText);

        container.appendChild(collapseButton);
        return collapseButton;
    }
}
