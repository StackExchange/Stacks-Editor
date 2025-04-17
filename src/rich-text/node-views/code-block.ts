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
    private availableLanguages: string[];
    private maxSuggestions: number;
    private ignoreBlur: boolean = false;
    private selectedSuggestionIndex: number = -1;

    constructor(
        node: ProsemirrorNode,
        view: EditorView,
        getPos: () => number,
        availableLanguages: string[],
        maxSuggestions: number = 5
    ) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.availableLanguages = availableLanguages;
        this.maxSuggestions = maxSuggestions;
        this.render();
    }

    private render() {
        this.dom = document.createElement("div");
        this.dom.classList.add("ps-relative", "p0", "ws-normal", "ow-normal");
        this.dom.innerHTML = escapeHTML`
        <button class="js-language-selector ps-absolute t2 r4 fs-caption fc-black-500 c-pointer baw0 bg-transparent" contenteditable="false">
            <span class="js-language-indicator"></span>
            <span class="svg-icon-bg iconArrowDownSm"></span>
        </button>
        <div class="ps-absolute t24 r4 js-language-input">
            <div class="ps-relative mb8">
                <label class="v-visible-sr" for="example-search">Search</label>
                <input type="text" class="s-input s-input__search fs-caption js-language-input-textbox" placeholder="Search for a language" contenteditable="false" />
                <span class="s-input-icon s-input-icon__search svg-icon-bg iconSearchSm"></span>
            </div>
            <div class="s-card fs-caption c-pointer py4 px4 js-language-dropdown-container">
                <ul class="s-menu js-language-dropdown"></ul>
            </div>
        </div>
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

        const textbox = this.dom.querySelector(".js-language-input-textbox");
        textbox.addEventListener("blur", this.onLanguageInputBlur.bind(this));
        textbox.addEventListener(
            "keydown",
            this.onLanguageInputKeyDown.bind(this)
        );
        textbox.addEventListener(
            "mousedown",
            this.onLanguageInputMouseDown.bind(this)
        );
        textbox.addEventListener(
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
        const textbox = this.dom.querySelector(".js-language-input-textbox");
        if (
            input instanceof HTMLDivElement &&
            textbox instanceof HTMLInputElement
        ) {
            input.style.display = node.attrs.isEditingLanguage
                ? "block"
                : "none";

            if (node.attrs.isEditingLanguage) {
                textbox.focus();
            }
        }

        const dropdownContainer = this.dom.querySelector(
            ".js-language-dropdown-container"
        );
        if (dropdownContainer instanceof HTMLDivElement) {
            if (node.attrs.suggestions) {
                this.renderDropdown(node.attrs.suggestions as string[]);
            } else {
                dropdownContainer.style.display = "none";
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
    }

    private onLanguageSelectorMouseDown(event: MouseEvent) {
        event.stopPropagation();
    }

    private onLanguageInputBlur(event: FocusEvent) {
        // If the user pressed Escape, don't update the language.
        if (this.ignoreBlur) {
            this.ignoreBlur = false;
            return;
        }

        // If the newly focused element is inside the language input container, then the user just tabbed on to
        // the suggestions list. In this case, we don't want to close the dropdown.
        const container = this.dom.querySelector(".js-language-input");
        if (
            event.relatedTarget &&
            container &&
            container.contains(event.relatedTarget as Node)
        ) {
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
        const dropdown = this.dom.querySelector(".js-language-dropdown");
        if (!(dropdown instanceof HTMLUListElement)) {
            return;
        }
        if (event.key === "Enter") {
            // If an item is focused in the dropdown, select it.
            const activeItem = dropdown.querySelector("li:focus");
            if (activeItem) {
                event.preventDefault();
                (activeItem as HTMLElement).click();
                return;
            }
            // Otherwise, blur and refocus the editor. This will trigger onLanguageInputBlur to update the language.
            this.view.focus();
        } else if (event.key === "Escape") {
            this.onEscape();
        } else if (event.key === "ArrowDown") {
            this.onArrowDown(event);
        } else if (event.key === "ArrowUp") {
            this.onArrowUp(event);
        } else if (event.key === " ") {
            event.preventDefault();
        }

        // Prevent event propagating to the underlying ProseMirror editor (we don't want keypresses turning up there).
        event.stopPropagation();
    }

    private onEscape() {
        this.ignoreBlur = true;
        this.updateNodeAttrs({
            isEditingLanguage: false,
            suggestions: null,
        });
        this.view.focus();
    }

    private onArrowUp(event: KeyboardEvent) {
        this.updateSelectedSuggestionIndex(-1);
        event.preventDefault();
        event.stopPropagation();
    }

    private onArrowDown(event: KeyboardEvent) {
        this.updateSelectedSuggestionIndex(1);
        event.preventDefault();
        event.stopPropagation();
    }

    // Move up or down the list of suggestions when the user presses the arrow keys.
    private updateSelectedSuggestionIndex(delta: number) {
        const dropdown = this.dom.querySelector(".js-language-dropdown");
        if (!(dropdown instanceof HTMLUListElement)) {
            return;
        }

        const liElements = dropdown.querySelectorAll("li");
        if (liElements.length == 0) {
            return;
        }

        this.selectedSuggestionIndex += delta;

        // Wrap around the suggestions list. Note that -1 means the textbox is selected.
        if (this.selectedSuggestionIndex < -1) {
            this.selectedSuggestionIndex = liElements.length - 1;
        } else if (this.selectedSuggestionIndex >= liElements.length) {
            this.selectedSuggestionIndex = -1;
        }

        if (this.selectedSuggestionIndex == -1) {
            const textbox = this.dom.querySelector(
                ".js-language-input-textbox"
            );
            if (textbox instanceof HTMLInputElement) {
                textbox.focus();
                this.selectedSuggestionIndex = -1;
            }
        } else {
            (liElements[this.selectedSuggestionIndex] as HTMLElement).focus();
        }
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
        // Reset the selected suggestion index when the suggestions update.
        this.selectedSuggestionIndex = -1;
        this.updateNodeAttrs({
            suggestions: suggestions,
        });
    }

    private renderDropdown(suggestions: string[]) {
        const dropdownContainer = this.dom.querySelector(
            ".js-language-dropdown-container"
        );
        const dropdown = this.dom.querySelector(".js-language-dropdown");

        if (
            !(dropdown instanceof HTMLUListElement) ||
            !(dropdownContainer instanceof HTMLDivElement)
        ) {
            return;
        }

        dropdown.innerHTML = "";

        if (suggestions.length === 0) {
            dropdownContainer.style.display = "none";
            this.selectedSuggestionIndex = -1;
            return;
        }

        // Reset the current selection.
        this.selectedSuggestionIndex = -1;

        suggestions.forEach((lang) => {
            const li = document.createElement("li");
            li.textContent = lang;
            li.classList.add("h:bg-black-150", "px4");
            li.tabIndex = 0; // Make it focusable

            // Prevent the textbox's blur event from closing the dropdown too early when the user clicks on a suggestion.
            li.addEventListener("mousedown", (event: MouseEvent) => {
                event.preventDefault();
            });

            // When a list item is clicked, update the language.
            li.addEventListener("click", () => {
                const textbox = this.dom.querySelector(
                    ".js-language-input-textbox"
                );
                if (!(textbox instanceof HTMLInputElement)) {
                    return;
                }
                textbox.value = lang;
                this.updateNodeAttrs({
                    params: lang,
                    isEditingLanguage: false,
                    suggestions: null,
                });
                dropdownContainer.style.display = "none";
                this.view.focus();
            });

            li.addEventListener("keydown", (event: KeyboardEvent) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    li.click();
                } else if (event.key === "Escape") {
                    this.onEscape();
                } else if (event.key === "ArrowDown") {
                    this.onArrowDown(event);
                } else if (event.key === "ArrowUp") {
                    this.onArrowUp(event);
                } else if (event.key === "Tab") {
                    // We don't want the Tab keypress making new tabs appear in the editor.
                    event.stopPropagation();
                }
            });
            dropdown.appendChild(li);
        });

        dropdownContainer.style.display = "block";
    }
}
