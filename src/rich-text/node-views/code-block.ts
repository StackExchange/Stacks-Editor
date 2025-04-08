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
    private node: ProsemirrorNode;
    private view: EditorView;
    private getPos: () => number;
    private ignoreBlur: boolean = false;

    // Temporarily hardcoding this for now
    private availableLanguages = [
        "javascript",
        "java",
        "python",
        "ruby",
        "csharp",
        "go",
    ];

    private maxSuggestions = 5;

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
        <ul class="js-language-dropdown" style="display: none; position: absolute; top: 100%; right: 4px; z-index: 10; list-style: none; padding: 0; margin: 0; background: white; border: 1px solid #ccc;"></ul>
        <pre class="s-code-block js-code-view js-code-mode"><code class="content-dom"></code></pre>`;

        this.contentDOM = this.dom.querySelector(".content-dom");

        const languageSelectorButton = this.dom.querySelector(
            "button.js-language-selector"
        );
        languageSelectorButton.addEventListener(
            "click",
            this.onLanguageSelectorClick.bind(this)
        );
        languageSelectorButton.addEventListener(
            "mousedown",
            this.onLanguageSelectorMouseDown.bind(this)
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
        languageInput.addEventListener(
            "mousedown",
            this.onLanguageInputMouseDown.bind(this)
        );
        languageInput.addEventListener(
            "input",
            this.onLanguageInputTextInput.bind(this)
        );

        this.update(this.node);
    }

    update(node: ProsemirrorNode): boolean {
        // don't allow the node to be changed into anything other than a code_block
        if (node.type.name !== "code_block") {
            return false;
        }

        this.node = node;

        this.dom.querySelector(".js-language-indicator").textContent =
            this.getLanguageDisplayName();

        const input = this.dom.querySelector(".js-language-input");

        if (input instanceof HTMLInputElement) {
            if (node.attrs.isEditingLanguage) {
                input.style.display = "block";
            } else {
                input.style.display = "none";
            }
        }

        const dropdown = this.dom.querySelector(".js-language-dropdown");

        if (dropdown instanceof HTMLUListElement) {
            if (node.attrs.suggestions) {
                this.renderDropdown(node.attrs.suggestions as string[]);
            } else {
                dropdown.style.display = "none";
            }
        }

        return true;
    }

    /** Gets the codeblock language from the node */
    private getLanguageDisplayName() {
        const language = getBlockLanguage(this.node);

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
        const nodeAttrs = this.node.attrs;
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
            const language = getBlockLanguage(this.node);
            input.value = !language.IsAutoDetected ? language.Language : "";
            input.style.display = "block";
            input.focus();
        }
    }

    private onLanguageSelectorMouseDown(event: MouseEvent) {
        event.stopPropagation();
    }

    private onLanguageInputBlur(event: FocusEvent) {
        // If editing was cancelled via Escape, then skip updating.
        if (this.ignoreBlur) {
            // Reset the flag for future blur events.
            this.ignoreBlur = false;
            return;
        }

        const target = event.target as HTMLInputElement;

        this.updateNodeAttrs({
            params: target.value,
            isEditingLanguage: false,
            suggestions: null,
        });
    }

    private onLanguageInputKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            this.view.focus();
        } else if (event.key === "Escape") {
            this.ignoreBlur = true;
            this.updateNodeAttrs({
                isEditingLanguage: false,
                suggestions: null,
            });
            this.view.focus();
        } else if (event.key === " ") {
            event.preventDefault();
        }
        event.stopPropagation();
    }

    private onLanguageInputMouseDown(event: MouseEvent) {
        event.stopPropagation();
    }

    private onLanguageInputTextInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const query = input.value.toLowerCase();
        const suggestions =
            query.length > 0
                ? this.availableLanguages
                      .filter((lang) => lang.toLowerCase().startsWith(query))
                      .slice(0, this.maxSuggestions)
                : [];

        this.updateNodeAttrs({
            suggestions: suggestions,
        });
    }

    private renderDropdown(suggestions: string[]) {
        const dropdown = this.dom.querySelector(".js-language-dropdown");

        if (!(dropdown instanceof HTMLUListElement)) {
            return;
        }

        dropdown.innerHTML = ""; // Clear previous suggestions

        if (suggestions.length === 0) {
            dropdown.style.display = "none";
            return;
        }

        for (const lang of suggestions) {
            const li = document.createElement("li");
            li.textContent = lang;
            li.style.padding = "4px 8px";
            li.style.cursor = "pointer";

            li.addEventListener("mousedown", (event: MouseEvent) => {
                // Prevent blur event from closing the dropdown too early.
                event.preventDefault();
            });

            li.addEventListener("click", () => {
                const input = this.dom.querySelector(".js-language-input");

                if (!(input instanceof HTMLInputElement)) {
                    return;
                }

                input.value = lang;
                this.updateNodeAttrs({
                    params: lang,
                    isEditingLanguage: false,
                });
                dropdown.style.display = "none";
                this.view.focus();
            });

            dropdown.appendChild(li);
        }

        dropdown.style.display = "block";
    }
}
