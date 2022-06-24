import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import type { IExternalPluginProvider } from "../../shared/editor-plugin";
import { getBlockLanguage } from "../../shared/highlighting/highlight-plugin";
import { _t } from "../../shared/localization";
import { escapeHTML, generateRandomId } from "../../shared/utils";

type getPosParam = boolean | (() => number);

/**
 * View with <code> wrapping/decorations for code_block nodes
 */
export class CodeBlockView implements NodeView {
    dom: HTMLElement | null;
    contentDOM?: HTMLElement | null;

    private language: string = null;

    constructor(
        node: ProsemirrorNode,
        view: EditorView,
        getPos: getPosParam,
        private additionalProcessors: IExternalPluginProvider["codeblockProcessors"]
    ) {
        this.dom = document.createElement("div");
        this.dom.classList.add("ps-relative", "p0", "ws-normal", "ow-normal");
        this.render(view, getPos);
        this.contentDOM = this.dom.querySelector(".content-dom");
        this.update(node);
    }

    update(node: ProsemirrorNode): boolean {
        // don't allow the node to be changed into anything other than a code_block
        if (node.type.name !== "code_block") {
            return false;
        }

        const rawLanguage = this.getLanguageFromBlock(node);

        const processorApplies = this.getValidProcessorResult(
            rawLanguage,
            node
        );

        if (processorApplies) {
            this.updateProcessor(node, processorApplies);
        } else {
            this.updateCodeBlock(rawLanguage);
        }

        this.toggleView(!!processorApplies, !!node.attrs.isEditingProcessor);

        return true;
    }

    private render(view: EditorView, getPos: getPosParam) {
        const randomId = generateRandomId();

        this.dom.innerHTML = escapeHTML`
        <div class="ps-absolute t2 r4 fs-fine pe-none us-none fc-black-300 js-language-indicator" contenteditable=false></div>
        <div class="d-flex ps-absolute t0 r0 js-processor-toggle">
            <label class="flex--item mr4" for="js-editor-toggle-${randomId}">
                Edit
            </label>
            <div class="flex--item s-toggle-switch">
                <input class="js-processor-is-editing" id="js-editor-toggle-${randomId}" type="checkbox">
                <div class="s-toggle-switch--indicator"></div>
            </div>
        </div>
        <div class="d-none js-processor-view"></div>
        <pre class="s-code-block js-code-view js-code-mode"><code class="content-dom"></code></pre>`;

        this.contentDOM = this.dom.querySelector(".content-dom");

        if (typeof getPos !== "function") {
            return;
        }

        this.dom
            .querySelector(".js-processor-is-editing")
            .addEventListener("change", (e) => {
                e.stopPropagation();
                const isEditing = !!(e.target as HTMLInputElement).checked;

                const pos = getPos();
                const nodeAttrs = view.state.doc.nodeAt(pos).attrs;
                view.dispatch(
                    view.state.tr.setNodeMarkup(getPos(), null, {
                        ...nodeAttrs,
                        isEditingProcessor: isEditing,
                    })
                );
            });
    }

    private toggleView(showProcessor: boolean, showProcessorEdit: boolean) {
        const toggle = (selector: string, show: boolean) =>
            this.dom.querySelector(selector).classList.toggle("d-none", !show);

        toggle(".js-code-view", !showProcessor || showProcessorEdit);
        toggle(".js-processor-toggle", showProcessor);
        toggle(".js-language-indicator", !showProcessor);
        toggle(".js-processor-view", showProcessor && !showProcessorEdit);
    }

    private getLanguageFromBlock(node: ProsemirrorNode) {
        let autodetectedLanguage = node.attrs
            .detectedHighlightLanguage as string;

        if (autodetectedLanguage) {
            autodetectedLanguage = _t("nodes.codeblock_lang_auto", {
                lang: autodetectedLanguage,
            });
        }

        return autodetectedLanguage || getBlockLanguage(node);
    }

    private updateCodeBlock(rawLanguage: string) {
        if (this.language !== rawLanguage) {
            this.dom.querySelector(".js-language-indicator").textContent =
                rawLanguage;
            this.language = rawLanguage;
        }
    }

    private updateProcessor(node: ProsemirrorNode, content: Element) {
        const renderContainer = this.dom.querySelector(".js-processor-view");
        const isEditing = !!node.attrs.isEditingProcessor;

        this.dom
            .querySelector(".js-code-view")
            .classList.toggle("d-none", !isEditing);
        renderContainer.classList.toggle("d-none", isEditing);
        renderContainer.innerHTML = "";
        renderContainer.append(...content.children);

        return true;
    }

    private getValidProcessorResult(
        rawLanguage: string,
        node: ProsemirrorNode
    ): Element | null {
        const renderContainer = document.createElement("div");
        const processors = this.getProcessors(rawLanguage);
        if (!processors.length) {
            return null;
        }

        let appliedProcessor = false;

        for (const processor of processors) {
            appliedProcessor = processor(node.textContent, renderContainer);

            if (appliedProcessor) {
                break;
            }
        }

        return appliedProcessor ? renderContainer : null;
    }

    private getProcessors(rawLanguage: string) {
        const processors = [];

        // add in the language specific processors first
        if (rawLanguage in this.additionalProcessors) {
            processors.push(...this.additionalProcessors[rawLanguage]);
        }

        // followed by the generic processors
        if ("*" in this.additionalProcessors) {
            processors.push(...this.additionalProcessors["*"]);
        }

        return processors;
    }
}
