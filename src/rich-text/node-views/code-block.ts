import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import {
    getBlockLanguage,
    getLoadedLanguages,
} from "../../shared/highlighting/highlight-plugin";
import { _t } from "../../shared/localization";
import { escapeHTML } from "../../shared/utils";

type getPosParam = boolean | (() => number);

/**
 * View with <code> wrapping/decorations for code_block nodes
 */
export class CodeBlockView implements NodeView {
    dom?: HTMLElement | null;
    contentDOM?: HTMLElement | null;

    private language: ReturnType<CodeBlockView["getLanguageFromBlock"]> = null;

    constructor(node: ProsemirrorNode, view: EditorView, getPos: getPosParam) {
        this.dom = document.createElement("div");
        this.dom.classList.add("ps-relative", "p0", "ws-normal", "ow-normal");

        const rawLanguage = this.getLanguageFromBlock(node);
        this.language = rawLanguage;

        this.dom.innerHTML = escapeHTML`
<pre class="s-code-block"><code class="content-dom"></code></pre>
<div class="s-select s-select__sm ps-absolute t6 r6"><select class="js-lang-select"></select></div>
        `;

        this.contentDOM = this.dom.querySelector(".content-dom");

        this.initializeLanguageSelect(view, getPos);
        this.updateDisplayedLanguage();
    }

    update(node: ProsemirrorNode): boolean {
        // don't allow the node to be changed into anything other than a code_block
        if (node.type.name !== "code_block") {
            return false;
        }

        const rawLanguage = this.getLanguageFromBlock(node);

        if (this.language.raw !== rawLanguage.raw) {
            this.language = rawLanguage;
            this.updateDisplayedLanguage();
        }

        return true;
    }

    private initializeLanguageSelect(view: EditorView, getPos: getPosParam) {
        const $sel =
            this.dom.querySelector<HTMLSelectElement>(".js-lang-select");

        // add an "auto" dropdown that we can target via JS
        const autoOpt = document.createElement("option");
        autoOpt.textContent = "auto";
        autoOpt.value = "auto";
        autoOpt.className = "js-auto-option";
        $sel.appendChild(autoOpt);

        getLoadedLanguages().forEach((lang) => {
            const opt = document.createElement("option");
            opt.value = lang;
            opt.textContent = lang;
            opt.defaultSelected = lang === this.language.raw;
            $sel.appendChild(opt);
        });

        if (typeof getPos !== "function") {
            return;
        }

        // when the dropdown is changed, update the language on the node
        $sel.addEventListener("change", (e) => {
            e.stopPropagation();

            const newLang = $sel.value;

            view.dispatch(
                view.state.tr.setNodeMarkup(getPos(), null, {
                    params: newLang === "auto" ? null : newLang,
                    detectedHighlightLanguage: null,
                })
            );
        });
    }

    private updateDisplayedLanguage() {
        const lang = this.language.raw;
        const $sel =
            this.dom.querySelector<HTMLSelectElement>(".js-lang-select");
        const $auto = $sel.querySelector(".js-auto-option");

        if (this.language.autodetected) {
            $sel.value = "auto";
            $auto.textContent = _t("nodes.codeblock_lang_auto", {
                lang,
            });
        } else {
            $sel.value = lang;
            $auto.textContent = _t("nodes.codeblock_auto");
        }
    }

    private getLanguageFromBlock(node: ProsemirrorNode) {
        const autodetectedLanguage = node.attrs
            .detectedHighlightLanguage as string;

        return {
            raw: autodetectedLanguage || getBlockLanguage(node, "auto"),
            autodetected: !!autodetectedLanguage,
        };
    }
}
