import { Node as ProsemirrorNode } from "prosemirror-model";
import { NodeView } from "prosemirror-view";
import { getBlockLanguage } from "../../shared/highlighting/highlight-plugin";
import { _t } from "../../shared/localization";
import { escapeHTML } from "../../shared/utils";

/**
 * View with <code> wrapping/decorations for code_block nodes
 */
export class CodeBlockView implements NodeView {
    dom: HTMLElement | null;
    contentDOM?: HTMLElement | null;

    private currentLanguage: string = null;

    constructor(node: ProsemirrorNode) {
        this.dom = document.createElement("div");
        this.dom.classList.add("ps-relative", "p0", "ws-normal", "ow-normal");
        this.render();
        this.contentDOM = this.dom.querySelector(".content-dom");
        this.update(node);
    }

    update(node: ProsemirrorNode): boolean {
        // don't allow the node to be changed into anything other than a code_block
        if (node.type.name !== "code_block") {
            return false;
        }

        const newLanguage = this.getLanguageFromBlock(node);
        if (newLanguage !== this.currentLanguage) {
            this.currentLanguage = newLanguage;
            this.dom.querySelector(".js-language-indicator").textContent =
                newLanguage;
        }

        return true;
    }

    private render() {
        this.dom.innerHTML = escapeHTML`
        <div class="ps-absolute t2 r4 fs-fine pe-none us-none fc-black-350 js-language-indicator" contenteditable=false></div>
        <pre class="s-code-block js-code-view js-code-mode"><code class="content-dom"></code></pre>`;

        this.contentDOM = this.dom.querySelector(".content-dom");
    }

    /** Gets the codeblock language from the node */
    private getLanguageFromBlock(node: ProsemirrorNode) {
        const specifiedLanguage = getBlockLanguage(node);
        if (specifiedLanguage) return specifiedLanguage;

        let autodetectedLanguage = node.attrs.autodetectedLanguage as string;

        if (autodetectedLanguage) {
            return _t("nodes.codeblock_lang_auto", {
                lang: autodetectedLanguage,
            });
        }

        return null;
    }
}
