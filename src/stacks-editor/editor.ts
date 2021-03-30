import { CommonmarkEditor, CommonmarkOptions } from "../commonmark/editor";
import { RichTextEditor, RichTextOptions } from "../rich-text/editor";
import {
    deepMerge,
    startStickyObservers,
    STICKY_OBSERVER_CLASS,
    StickyChangeDetails,
    escapeHTML,
} from "../shared/utils";
import { View, CommonViewOptions, BaseView } from "../shared/view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { toggleReadonly } from "../shared/prosemirror-plugins/readonly";

//NOTE relies on Stacks classes. Should we separate out so the editor is more agnostic?

/** Describes each distinct editor type the StacksEditor handles */
export enum EditorType {
    RichText,
    Commonmark,
}

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
        this.internalId = (Math.random() * 10000).toFixed(0);

        this.innerTarget = document.createElement("div");
        this.target.appendChild(this.innerTarget);

        this.setupPluginContainer();

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
            "fl1",
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
                "s-editor-resizable",
            ],
            parserFeatures: RichTextEditor.defaultOptions.parserFeatures,
            commonmarkOptions: {
                classList: commonClasses,
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
        menuTarget.className = "grid overflow-x-auto ai-center px12 py4 pb0";
        this.pluginContainer.appendChild(menuTarget);

        // set the editors' menu containers to be the combo container
        const menuContainerFn = () => menuTarget;
        this.options.menuParentContainer = menuContainerFn;

        // create a specific area for the editor plugins
        const pluginTarget = document.createElement("div");
        this.pluginContainer.appendChild(pluginTarget);

        const pluginContainerFn = () => pluginTarget;
        this.options.pluginParentContainer = pluginContainerFn;

        this.innerTarget.appendChild(this.pluginContainer);

        this.createEditorSwitcher(this.options.defaultView, menuTarget);

        // Call `preventDefault` on all `mousedown` events in our plugin container so that the Editor
        // itself does not blur on e.g. button clicks. This does not affect other mouse events / bubbling
        // and allows us to use `click` listeners in our plugins for better code transparency
        this.pluginContainer.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });

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
                deepMerge(this.options, this.options.richTextOptions)
            );
        } else if (type === EditorType.Commonmark) {
            this.backingView = new CommonmarkEditor(
                this.innerTarget,
                content,
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
        const checkedProp =
            defaultItem === EditorType.Commonmark ? "checked" : "";

        const container = document.createElement("div");
        container.className = "grid--cell grid ai-center ml24 fc-medium";

        // TODO localization
        container.innerHTML = escapeHTML`<label class="grid--cell fs-caption mr4 sm:d-none" for="js-editor-toggle-${this.internalId}">Markdown</label>
            <label class="grid--cell mr4 d-none sm:d-block" for="js-editor-toggle-${this.internalId}">
                <span class="icon-bg iconMarkdown"></span>
            </label>
            <div class="grid--cell s-toggle-switch js-editor-mode-switcher">
                <input class="js-editor-toggle-state" id="js-editor-toggle-${this.internalId}" type="checkbox" ${checkedProp}/>
                <div class="s-toggle-switch--indicator"></div>
            </div>`;

        container.title = "Toggle Markdown editing";

        container
            .querySelector("#js-editor-toggle-" + this.internalId)
            .addEventListener(
                "change",
                this.editorSwitcherChangeHandler.bind(this)
            );

        menuTarget.appendChild(container);
    }

    /**
     * Prefixes an event name to scope it to the editor
     * e.g. `view-change` becomes `StacksEditor:view-change`
     * @param eventName The event name to prefix
     */
    private prefixEventName(eventName: string) {
        return `StacksEditor:${eventName}`;
    }

    /**
     * Handles toggling the editor when the switcher is clicked
     * and fires a change event from the target element for consumers to listen for
     * @param e The click event
     */
    private editorSwitcherChangeHandler(e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();

        // get opposing type
        const type =
            this.currentViewType === EditorType.Commonmark
                ? EditorType.RichText
                : EditorType.Commonmark;

        // set the view type for this button
        this.setView(type);

        // ensure the checkbox matches the selected editor
        this.target.querySelector<HTMLInputElement>(
            "#js-editor-toggle-" + this.internalId
        ).checked = type === EditorType.Commonmark;

        // TODO better event name?
        // trigger an event on the target for consumers to listen for
        const event = new CustomEvent(this.prefixEventName("view-change"), {
            detail: {
                editorType: type,
            },
        });
        this.target.dispatchEvent(event);

        // TODO do we always want to focus the editor?
        this.focus();
    }
}
