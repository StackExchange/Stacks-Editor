import { Node as ProsemirrorNode } from "prosemirror-model";
import { NodeView } from "prosemirror-view";
import { getBlockLanguage } from "../../shared/highlighting/highlight-plugin";
import { escapeHTML } from "../../shared/utils";

/**
 * View with <code> wrapping/decorations for code_block nodes
 */
export class CodeBlockView implements NodeView {
    dom?: HTMLElement | null;
    contentDOM?: HTMLElement | null;

    private language: string = null;

    constructor(node: ProsemirrorNode) {
        this.dom = document.createElement("div");
        this.dom.classList.add("ps-relative", "p0", "ws-normal", "ow-normal");

        const rawLanguage = this.getLanguageFromBlock(node);
        this.language = rawLanguage;

        this.dom.innerHTML = escapeHTML`
<div class="ps-absolute t2 r4 fs-fine pe-none us-none fc-black-300 js-language-indicator" contenteditable=false>${rawLanguage}</div>
<pre class="s-code-block"><code class="content-dom"></code></pre>
        `;

        this.contentDOM = this.dom.querySelector(".content-dom");
    }

    update(node: ProsemirrorNode): boolean {
        // don't allow the node to be changed into anything other than a code_block
        if (node.type.name !== "code_block") {
            return false;
        }

        const rawLanguage = this.getLanguageFromBlock(node);

        if (this.language !== rawLanguage) {
            this.dom.querySelector(".js-language-indicator").textContent =
                rawLanguage;
            this.language = rawLanguage;
        }

        return true;
    }

    private getLanguageFromBlock(node: ProsemirrorNode) {
        let autodetectedLanguage = node.attrs
            .detectedHighlightLanguage as string;

        if (autodetectedLanguage) {
            // TODO localization
            autodetectedLanguage += " (auto)";
        }

        return autodetectedLanguage || getBlockLanguage(node);
    }
}
