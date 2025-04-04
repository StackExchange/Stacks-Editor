import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
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
    private node: ProsemirrorNode;
    private view: EditorView;
    private getPos: () => number;

    constructor(node: ProsemirrorNode, view: EditorView, getPos: () => number) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.render();
    }

    private render() {
        this.dom = document.createElement("div");
        this.dom.classList.add("ps-relative", "p0", "ws-normal", "ow-normal");
        this.dom.innerHTML = escapeHTML`
        <button class="js-language-selector ps-absolute t2 r4 fs-fine fc-black-350 c-pointer" style="border: none; background: none" contenteditable="false">
            <span class="js-language-indicator"></span>
            <span class="svg-icon-bg iconArrowDownSm"></span>
        </button>
        <input type="text" class="ps-absolute t16 r4 js-language-input" style="display: none" contenteditable="false" />
        <pre class="s-code-block js-code-view js-code-mode"><code class="content-dom"></code></pre>`;

        this.contentDOM = this.dom.querySelector(".content-dom");

        const languageSelectorButton = this.dom.querySelector(
            "button.js-language-selector"
        );
        languageSelectorButton.addEventListener(
            "click",
            this.onLanguageSelectorClick.bind(this)
        );

        const languageInput = this.dom.querySelector(".js-language-input");
        languageInput.addEventListener(
            "blur",
            this.onLanguageInputBlur.bind(this)
        );
        languageInput.addEventListener(
            "keydown",
            this.onLanguageInputKeyDown.bind(this)
        );

        this.update(this.node);
    }

    update(node: ProsemirrorNode): boolean {
        // don't allow the node to be changed into anything other than a code_block
        if (node.type.name !== "code_block") {
            return false;
        }

        this.node = node;

        const newLanguageDisplayName = this.getLanguageDisplayName(node);

        // If the language has changed, update the language indicator
        if (newLanguageDisplayName !== this.currentLanguageDisplayName) {
            this.currentLanguageDisplayName = newLanguageDisplayName;
            this.dom.querySelector(".js-language-indicator").textContent =
                newLanguageDisplayName;
        }

        const input = this.dom.querySelector(".js-language-input");

        if (input instanceof HTMLInputElement) {
            if (node.attrs.isEditingLanguage) {
                input.style.display = "block";
            } else {
                input.style.display = "none";
            }
        }

        return true;
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

    private updateNodeAttrs(newAttrs: object) {
        const pos = this.getPos();
        const nodeAttrs = this.view.state.doc.nodeAt(pos).attrs;
        this.view.dispatch(
            this.view.state.tr.setNodeMarkup(pos, null, {
                ...nodeAttrs,
                ...newAttrs,
            })
        );
    }

    private onLanguageSelectorClick(event: MouseEvent) {
        event.stopPropagation();

        this.updateNodeAttrs({
            isEditingLanguage: true,
        });

        const input = this.dom.querySelector(".js-language-input");

        if (input instanceof HTMLInputElement) {
            input.style.display = "block";
            input.focus();
        }
    }

    private onLanguageInputBlur(event: FocusEvent) {
        const target = event.target as HTMLInputElement;

        this.updateNodeAttrs({
            params: target.value,
            isEditingLanguage: false,
        });
    }

    private onLanguageInputKeyDown(event: KeyboardEvent) {
        const target = event.target as HTMLInputElement;
        if (event.key === "Enter") {
            this.view.focus();
            event.preventDefault();
            event.stopPropagation();
        }
    }
}
