import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { getBlockLanguage } from "../../shared/highlighting/highlight-plugin";
import { _t } from "../../shared/localization";
import { error } from "../../shared/logger";
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
        private additionalProcessors: {
            [key: string]: (
                content: string,
                container: Element
            ) => void | Promise<void>;
        }
    ) {
        this.dom = document.createElement("div");
        this.dom.classList.add("ps-relative", "p0", "ws-normal", "ow-normal");

        const rawLanguage = this.getLanguageFromBlock(node);
        this.language = rawLanguage;

        if (!this.renderProcessor(rawLanguage, node, view, getPos)) {
            this.renderCodeBlock(rawLanguage);
        }
    }

    update(node: ProsemirrorNode): boolean {
        // don't allow the node to be changed into anything other than a code_block
        if (node.type.name !== "code_block") {
            return false;
        }

        const rawLanguage = this.getLanguageFromBlock(node);

        if (!this.updateProcessor(rawLanguage, node)) {
            this.updateCodeBlock(rawLanguage);
        }

        return true;
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

    private renderCodeBlock(rawLanguage: string) {
        this.dom.innerHTML = escapeHTML`
        <div class="ps-absolute t2 r4 fs-fine pe-none us-none fc-black-300 js-language-indicator" contenteditable=false>${rawLanguage}</div>
        <pre class="s-code-block"><code class="content-dom"></code></pre>
                `;

        this.contentDOM = this.dom.querySelector(".content-dom");
    }

    private updateCodeBlock(rawLanguage: string) {
        if (this.language !== rawLanguage) {
            this.dom.querySelector(".js-language-indicator").textContent =
                rawLanguage;
            this.language = rawLanguage;
        }
    }

    private renderProcessor(
        rawLanguage: string,
        node: ProsemirrorNode,
        view: EditorView,
        getPos: getPosParam
    ) {
        if (!this.getProcessor(rawLanguage)) {
            return false;
        }

        const randomId = generateRandomId();

        this.dom.innerHTML = escapeHTML`
        <div class="d-flex ps-absolute t0 r0">
            <label class="flex--item mr4" for="js-editor-toggle-${randomId}">
                Edit
            </label>
            <div class="flex--item s-toggle-switch">
                <input class="js-processor-is-editing" id="js-editor-toggle-${randomId}" type="checkbox">
                <div class="s-toggle-switch--indicator"></div>
            </div>
        </div>
        <div class="js-processor-rendered-container"></div>
        <pre class="s-code-block d-none js-processor-code"><code class="content-dom"></code></pre>
        `;

        this.contentDOM = this.dom.querySelector(".content-dom");

        // TODO necessary?
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

        this.updateProcessor(rawLanguage, node);

        return true;
    }

    private updateProcessor(rawLanguage: string, node: ProsemirrorNode) {
        const processor = this.getProcessor(rawLanguage);
        if (!processor) {
            return false;
        }

        const isEditing = !!node.attrs.isEditingProcessor;
        const renderContainer = this.dom.querySelector(
            ".js-processor-rendered-container"
        );

        this.dom
            .querySelector(".js-processor-code")
            .classList.toggle("d-none", !isEditing);
        renderContainer.classList.toggle("d-none", isEditing);

        if (!isEditing) {
            const resp = processor(node.textContent, renderContainer);

            if (resp instanceof Promise) {
                resp.catch((err) => {
                    // TODO show error to user?
                    error("CodeBlockView.update", err);
                });
            }
        }

        return true;
    }

    private getProcessor(rawLanguage: string) {
        if (rawLanguage in this.additionalProcessors) {
            return this.additionalProcessors[rawLanguage];
        } else if ("*" in this.additionalProcessors) {
            return this.additionalProcessors["*"];
        }

        return null;
    }
}
