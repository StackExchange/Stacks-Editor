import { CommonmarkEditor, CommonmarkOptions } from "../commonmark/editor";
import { RichTextEditor, RichTextOptions } from "../rich-text/editor";
import {
    deepMerge,
    startStickyObservers,
    STICKY_OBSERVER_CLASS,
    StickyChangeDetails,
    escapeHTML,
    dispatchEditorEvent,
    generateRandomId,
} from "../shared/utils";
import { View, CommonViewOptions, BaseView, EditorType } from "../shared/view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { toggleReadonly } from "../shared/prosemirror-plugins/readonly";
import { _t } from "../shared/localization";
import {
    ExternalPluginProvider,
    IExternalPluginProvider,
} from "../shared/editor-plugin";
import { util } from "prettier";

//NOTE relies on Stacks classes. Should we separate out so the editor is more agnostic?

/**
 * StacksEditor options that are passed to both editors
 * Any value set on the respective child options objects will override the values set on this object
 */
export interface StacksEditorOptions extends CommonViewOptions {
    /** The editor to show on instantiation */
    defaultView?: EditorType;
    /** The list of classes to add to the backing editor's target */
    targetClassList?: string[];
    /** The specific options to pass to the CommonmarkEditor; overrides any values on the parent options */
    commonmarkOptions?: CommonmarkOptions;
    /** The specific options to pass to the RichTextEditor; overrides any values on the parent options */
    richTextOptions?: RichTextOptions;
}

/**
 * A full editor that wraps and manages the state of both RichText and Commonmark editors
 */
export class StacksEditor implements View {
    /** The element to render this view into */
    private target: HTMLElement;
    /** The element to render the backing view into */
    private innerTarget: HTMLElement;
    /** The element to render the menu into */
    private pluginContainer: HTMLElement;
    /** The current backing view instance */
    private backingView: BaseView;
    /** The fully filled out (passed merged with default) options */
    private options: StacksEditorOptions;
    /** An internal-only, randomly generated id for selector targeting */
    private internalId: string;
    /** Singleton instance of a plugin provider that is passed to backing views */
    private pluginProvider: IExternalPluginProvider;

    private static readonly READONLY_CLASSES = ["s-input__readonly"];

    constructor(
        target: HTMLElement,
        content: string,
        options: StacksEditorOptions = {}
    ) {
        // do a deep merge of the passed options with our default options
        this.options = deepMerge(StacksEditor.defaultOptions, options);
        this.target = target;

        // naively generate a random internalId for this editor instance
        this.internalId = generateRandomId();

        this.innerTarget = document.createElement("div");
        this.target.appendChild(this.innerTarget);

        this.setupPluginContainer();

        this.pluginProvider = new ExternalPluginProvider(
            this.options.editorPlugins,
            this.options
        );

        this.setBackingView(this.options.defaultView, content);
    }

    get editorView(): EditorView {
        return this.backingView?.editorView;
    }

    get content(): string {
        return this.backingView?.content || "";
    }

    set content(value: string) {
        this.backingView.content = value;
    }

    get document(): ProseMirrorNode {
        return this.editorView.state.doc;
    }

    get dom(): Element {
        return this.editorView.dom;
    }

    get readonly(): boolean {
        if (!this.editorView) {
            return false;
        }

        return !this.editorView.editable;
    }

    get currentViewType(): EditorType {
        return this.backingView instanceof RichTextEditor
            ? EditorType.RichText
            : EditorType.Commonmark;
    }

    static get defaultOptions(): StacksEditorOptions {
        const commonClasses = [
            "fl-grow1",
            "outline-none",
            "p12",
            "pt6",
            "w100",
            "s-prose",
            //"s-prose", //TODO re-add once s-prose is the default in Core and we can hardcode here
            // in case this needs to be reference by outside code or e2e tests
            "js-editor",
            // added automatically, but let's be explicit for code clarity
            "ProseMirror",
        ];
        return {
            defaultView: EditorType.RichText,
            targetClassList: [
                "ps-relative",
                "z-base",
                "s-textarea",
                "overflow-auto",
                "hmn2",
                "w100",
                "p0",
                "d-flex",
                "fd-column",
                "s-editor-resizable",
            ],
            parserFeatures: RichTextEditor.defaultOptions.parserFeatures,
            commonmarkOptions: {
                classList: commonClasses,
                preview: {
                    enabled: false,
                },
            },
            richTextOptions: {
                classList: commonClasses,
            },
        };
    }

    focus(): void {
        this.backingView.focus();
    }

    destroy(): void {
        this.backingView.destroy();
    }

    /**
     * Sets the editor view the the passed type
     * @param type The type of editor to set the view to
     */
    setView(type: EditorType): void {
        this.setBackingView(type, null);
    }

    /**
     * Enables the editor view
     */
    enable(): void {
        toggleReadonly(
            false,
            this.editorView.state,
            this.editorView.dispatch.bind(null)
        );
        this.innerTarget.classList.remove(...StacksEditor.READONLY_CLASSES);
    }

    /**
     * Disables the editor view
     */
    disable(): void {
        toggleReadonly(
            true,
            this.editorView.state,
            this.editorView.dispatch.bind(null)
        );

        this.innerTarget.classList.add(...StacksEditor.READONLY_CLASSES);
    }

    /**
     * Reinitializes the editor with a subset of options that are merged into the current options
     * @param options The options that are changing between initializations
     */
    reinitialize(options: StacksEditorOptions = {}): void {
        this.options = deepMerge(this.options, options);
        this.setBackingView(this.currentViewType, this.content);
    }

    /**
     * Sets up the plugin and menu containers at the top of the editor. These are areas set aside for
     * plugins to render their content in a reliable manner. This area cancels mousedown events to keep the editor
     * from blurring and also handles sticking the content to the top of the editor on scroll.
     */
    private setupPluginContainer() {
        // create an area where plugins can be placed
        this.pluginContainer = document.createElement("div");
        this.pluginContainer.className = `py6 bg-inherit btr-sm w100 ps-sticky t0 l0 z-nav s-editor-shadow js-plugin-container ${STICKY_OBSERVER_CLASS}`;

        // create specific area for the editor menu
        const menuTarget = document.createElement("div");
        menuTarget.className = "d-flex overflow-x-auto ai-center px12 py4 pb0";
        this.pluginContainer.appendChild(menuTarget);

        // set the editors' menu containers to be the combo container
        const menuContainerFn = () => menuTarget;
        this.options.menuParentContainer = menuContainerFn;

        // create specific area for the editor menu
        const previewTarget = document.createElement("div");
        previewTarget.className = "py16";
        this.target.appendChild(previewTarget);

        // set the editors' preview containers to be the combo container
        const previewContainerFn = () => previewTarget;
        this.options.commonmarkOptions.preview.parentContainer =
            previewContainerFn;

        // create a specific area for the editor plugins
        const pluginTarget = document.createElement("div");
        this.pluginContainer.appendChild(pluginTarget);

        const pluginContainerFn = () => pluginTarget;
        this.options.pluginParentContainer = pluginContainerFn;

        this.innerTarget.appendChild(this.pluginContainer);

        this.createEditorSwitcher(this.options.defaultView, menuTarget);

        // watch the sticky header and add additional styling when it becomes unstuck
        startStickyObservers(this.innerTarget);
        document.addEventListener(
            "sticky-change",
            (e: CustomEvent<StickyChangeDetails>) => {
                const target = e.detail.target;
                if (!target.classList.contains("js-plugin-container")) {
                    return;
                }

                target.classList.toggle("is-stuck", e.detail.stuck);
            }
        );
    }

    /**
     * Sets the backing editor view to the passed type filled with the passed content
     * @param type The type to set the backing view to
     * @param content The markdown content to fill the editor with
     */
    private setBackingView(type: EditorType, content: string) {
        // save the readonly value and reinstate after swapping the views
        const readonly = this.readonly;

        if (this.backingView) {
            content = content || this.backingView.content;
            this.backingView.destroy();
        }

        // inner editor destroy does not clear the added classes, so reset them here
        this.innerTarget.classList.add(...this.options.targetClassList);

        if (type === EditorType.RichText) {
            this.backingView = new RichTextEditor(
                this.innerTarget,
                content,
                this.pluginProvider,
                deepMerge(this.options, this.options.richTextOptions)
            );
        } else if (type === EditorType.Commonmark) {
            this.backingView = new CommonmarkEditor(
                this.innerTarget,
                content,
                this.pluginProvider,
                deepMerge(this.options, this.options.commonmarkOptions)
            );
        } else {
            throw `Unable to set editor to unknown type: ${EditorType[type]}`;
        }

        // set up focus/blur listeners so we can style the dom to match
        this.backingView.editorView.props.handleDOMEvents = {
            focus: () => {
                this.innerTarget.classList.add("bs-ring", "bc-blue-300");
                return false;
            },
            blur: () => {
                this.innerTarget.classList.remove("bs-ring", "bc-blue-300");
                return false;
            },
        };

        // re-sync the view readonly state / classes
        if (readonly) {
            this.disable();
        } else {
            this.enable();
        }
    }

    /**
     * Creates the button that toggles the backing view type
     * @param defaultItem The type that is set as the default
     * @param menuTarget The container to append the created element to
     */
    private createEditorSwitcher(defaultItem: EditorType, menuTarget: Element) {
        const richCheckedProp =
            defaultItem === EditorType.RichText ? "checked" : "";
        const markCheckedProp =
            defaultItem === EditorType.Commonmark ? "checked" : "";

        const container = document.createElement("div");
        container.className = "flex--item d-flex ai-center ml24 fc-medium";

        container.innerHTML = escapeHTML`<div class="s-btn-group__radio">
    <input type="radio" name="mode-toggle-${this.internalId}"
        id="mode-toggle-rich-${this.internalId}"
        class="js-editor-toggle-btn"
        data-mode="${EditorType.RichText}"
        ${richCheckedProp} />
    <label class="s-btn s-editor-btn px6"
        for="mode-toggle-rich-${this.internalId}"
        title="${_t("menubar.mode_toggle_richtext_title")}">
        <span class="icon-bg iconRichText"></span>
        <span class="v-visible-sr">${_t(
            "menubar.mode_toggle_richtext_title"
        )}</span>
    </label>
    <input type="radio" name="mode-toggle-${this.internalId}"
        id="mode-toggle-markdown-${this.internalId}"
        class="js-editor-toggle-btn"
        data-mode="${EditorType.Commonmark}"
        ${markCheckedProp} />
    <label class="s-btn s-editor-btn px6"
        for="mode-toggle-markdown-${this.internalId}"
        title="${_t("menubar.mode_toggle_markdown_title")}">
        <span class="icon-bg iconMarkdown"></span>
        <span class="v-visible-sr">${_t(
            "menubar.mode_toggle_markdown_title"
        )}</span>
    </label>
</div>`;

        if (this.options.commonmarkOptions.preview.enabled) {
            const input = document.createElement("input");
            input.setAttribute(
                "name",
                `mode-toggle-preview-${this.internalId}`
            );
            input.setAttribute("type", "radio");
            input.setAttribute("id", `mode-toggle-preview-${this.internalId}`);
            input.className = "js-editor-toggle-btn";
            input.setAttribute("data-mode", "preview");
            input.checked = false; // TODO
            const label = document.createElement("label");
            label.setAttribute("for", `mode-toggle-preview-${this.internalId}`);
            label.setAttribute(
                "title",
                _t("menubar.mode_toggle_preview_title")
            );
            label.className = "s-btn s-editor-btn px6";
            label.innerHTML = escapeHTML`<span class="icon-bg iconMarkdownPreview"></span><span class="v-visible-sr">${_t(
                "menubar.mode_toggle_preview_title"
            )}</span>`;

            container.firstChild.appendChild(input);
            container.firstChild.appendChild(label);
        }

        container.querySelectorAll(".js-editor-toggle-btn").forEach((el) => {
            el.addEventListener(
                "change",
                this.editorSwitcherChangeHandler.bind(this)
            );
        });

        menuTarget.appendChild(container);
    }

    /**
     * Handles toggling the editor when the switcher is clicked
     * and fires a change event from the target element for consumers to listen for
     * @param e The click event
     */
    private editorSwitcherChangeHandler(e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();

        // get type from the target element
        const target = e.target as HTMLInputElement;
        const type: EditorType = +target.dataset.mode;

        // if the type hasn't changed, do nothing
        if (type === this.currentViewType) {
            return;
        }

        // ensure the correct element is checked in case the event was fired programmatically
        target.parentElement
            .querySelectorAll<HTMLInputElement>(".js-editor-toggle-btn")
            .forEach((el) => {
                el.checked = el === target;
            });

        // set the view type for this button
        this.setView(type);

        // TODO better event name?
        // trigger an event on the target for consumers to listen for
        dispatchEditorEvent(this.target, "view-change", {
            editorType: type,
        });

        // TODO do we always want to focus the editor?
        this.focus();
    }
}
