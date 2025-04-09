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

    private currentLanguageDisplayName: string = null;

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

        const newLanguageDisplayName = this.getLanguageDisplayName(node);

        // If the language has changed, update the language indicator
        if (newLanguageDisplayName !== this.currentLanguageDisplayName) {
            this.currentLanguageDisplayName = newLanguageDisplayName;
            this.dom.querySelector(".js-language-indicator").textContent =
                newLanguageDisplayName;
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
    private getLanguageDisplayName(node: ProsemirrorNode) {
        const language = getBlockLanguage(node);

        // for a user-specified language, just return the language name
        if (!language.IsAutoDetected) {
            return language.Language;
        }

        // if the language was auto-detected, return it with "(auto)" appended
        return _t("nodes.codeblock_lang_auto", {
            lang: language.Language,
        });
    }
}
