import { toggleMark } from "prosemirror-commands";
import { Mark, MarkType } from "prosemirror-model";
import {
    EditorState,
    PluginView,
    TextSelection,
    Transaction,
} from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { _t } from "../../shared/localization";
import {
    ManagedInterfaceKey,
    PluginInterfaceView,
} from "../../shared/prosemirror-plugins/interface-manager";
import { StatefulPlugin } from "../../shared/prosemirror-plugins/plugin-extensions";
import {
    escapeHTML,
    generateRandomId,
    getPlatformModKey,
} from "../../shared/utils";
import { CommonmarkParserFeatures } from "../../shared/view";

/**
 * PluginView for @see linkEditorPlugin
 * @internal Exported for testing
 */
export class LinkEditor extends PluginInterfaceView<
    LinkEditorPluginState,
    LinkEditorPluginKey
> {
    private validateLink: CommonmarkParserFeatures["validateLink"];
    private viewContainer: Element;

    private get hrefInput(): HTMLInputElement {
        return this.viewContainer.querySelector<HTMLInputElement>(
            ".js-link-editor-href"
        );
    }

    private get textInput(): HTMLInputElement {
        return this.viewContainer.querySelector<HTMLInputElement>(
            ".js-link-editor-text"
        );
    }

    private get saveBtn(): HTMLInputElement {
        return this.viewContainer.querySelector<HTMLInputElement>(
            ".js-link-editor-save-btn"
        );
    }

    private get hrefError(): Element {
        return this.viewContainer.querySelector(".js-link-editor-href-error");
    }

    constructor(
        view: EditorView,
        validateLink: CommonmarkParserFeatures["validateLink"]
    ) {
        super(LINK_EDITOR_KEY);

        this.validateLink = validateLink;

        const randomId = generateRandomId();
        this.viewContainer = document.createElement("form");
        this.viewContainer.className = "mt6 bt bb bc-black-400 js-link-editor";

        this.viewContainer.innerHTML = escapeHTML`<div class="d-flex fd-column gsy gs8 p12">
            <div class="flex--item">
                <label for="link-editor-href-input-${randomId}" class="s-label mb4">${_t(
            "link_editor.href_label"
        )}</label>
                <input id="link-editor-href-input-${randomId}" class="s-input js-link-editor-href" type="text" name="href" aria-describedby="link-editor-href-error-${randomId}" />
                <p id="link-editor-href-error-${randomId}" class="s-input-message mt4 d-none js-link-editor-href-error"></p>
            </div>

            <div class="flex--item">
                <label for="link-editor-text-input-${randomId}" class="s-label mb4">${_t(
            "link_editor.text_label"
        )}</label>
                <input id="link-text-href-input-${randomId}" class="s-input js-link-editor-text" type="text" name="text" />
            </div>

            <div class="flex--item">
                <button class="s-btn s-btn__primary js-link-editor-save-btn" type="submit" disabled>${_t(
                    "link_editor.save_button"
                )}</button>
                <button class="s-btn" type="reset">${_t(
                    "link_editor.cancel_button"
                )}</button>
            </div>
        </div>`;

        this.viewContainer.addEventListener("submit", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleSave(view);
        });

        this.viewContainer.addEventListener("reset", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tr = this.tryHideInterfaceTr(view.state);
            if (tr) {
                view.dispatch(tr);
            }
        });

        this.hrefInput.addEventListener("input", (e) => {
            this.validate((e.target as HTMLInputElement).value);
        });
    }
    protected key: LinkEditorPluginKey;

    validate(href: string): boolean {
        const valid = this.validateLink(href);
        if (!valid) {
            this.showValidationError(_t("link_editor.validation_error"));
        } else {
            this.hideValidationError();
        }

        this.saveBtn.disabled = !valid;

        return valid;
    }

    showValidationError(errorMessage: string): void {
        const parent = this.hrefInput.parentElement;
        const error = this.hrefError;
        parent.classList.add("has-error");
        error.textContent = errorMessage;
        error.classList.remove("d-none");
    }

    hideValidationError(): void {
        const parent = this.hrefInput.parentElement;
        const error = this.hrefError;
        parent.classList.remove("has-error");
        error.textContent = "";
        error.classList.add("d-none");
    }

    resetEditor(): void {
        this.hrefInput.value = "";
        this.textInput.value = "";
        this.hideValidationError();
    }

    handleSave(view: EditorView): void {
        const href = this.hrefInput.value;

        if (!this.validate(href)) {
            return;
        }

        const text = this.textInput.value || href;
        const node = view.state.schema.text(text, []);

        let tr =
            this.tryHideInterfaceTr(view.state, {
                url: null,
                text: null,
            }) || view.state.tr;

        // set the text first, inheriting all marks
        tr = tr.replaceSelectionWith(node, true);

        // reselect the now unselected text
        tr = tr.setSelection(
            TextSelection.create(
                tr.doc,
                tr.selection.from - text.length,
                tr.selection.to
            )
        );

        // drop any link marks that might already exist
        tr = tr.removeMark(
            tr.selection.from,
            tr.selection.to,
            view.state.schema.marks.link
        );

        // add our link mark back onto the selection
        tr = tr.addMark(
            tr.selection.from,
            tr.selection.to,
            view.state.schema.marks.link.create({ href })
        );

        view.dispatch(tr);
    }

    update(view: EditorView): void {
        super.update(view);

        if (this.isShown) {
            const state = LINK_EDITOR_KEY.getState(view.state);
            if (state?.url) {
                this.hrefInput.value = state.url;
                this.validate(state.url);
            }

            if (state?.text) {
                this.textInput.value = state.text;
            }

            let tr = this.tryShowInterfaceTr(view.state);
            if (tr) {
                tr = LINK_EDITOR_KEY.forceHideTooltipTr(view.state.apply(tr));
                view.dispatch(tr);
            }
            this.hrefInput.focus();
        } else {
            this.resetEditor();
            const tr = this.tryHideInterfaceTr(view.state);
            if (tr) {
                view.dispatch(tr);
            }
        }
    }

    destroy(): void {
        // this.uploadField.remove();
        this.viewContainer.remove();
    }

    buildInterface(container: Element): void {
        // add the view container to the menu area
        container.appendChild(this.viewContainer);
    }

    destroyInterface(container: Element): void {
        container.removeChild(this.viewContainer);
    }
}

/** Represents the link-editor plugin's state */
interface LinkEditorPluginState {
    // interface
    url?: string;
    text?: string;
    visible: boolean;
    shouldShow: boolean;

    // tooltip
    forceHideTooltip?: boolean;
    linkTooltip: LinkTooltip;
    decorations: DecorationSet;
}

/**
 * Custom PluginKey with additional methods for interacting with a LinkTooltip
 */
class LinkEditorPluginKey extends ManagedInterfaceKey<LinkEditorPluginState> {
    constructor() {
        super(LinkEditor.name);
    }

    /**
     * Force the link tooltip to hide - useful e.g. when the entire editor is losing
     * focus and we want to make sure the tooltip disappears, too
     */
    forceHideTooltipTr(state: EditorState): Transaction {
        const meta = this.getState(state);

        // if the tooltip is not showing, just return
        if (meta.decorations === DecorationSet.empty) {
            return state.tr;
        }

        meta.forceHideTooltip = true;
        return this.setMeta(state.tr, meta);
    }
}

/** The plugin key the image uploader plugin is tied to */
const LINK_EDITOR_KEY = new LinkEditorPluginKey();

/** Manages the decorations necessary for drawing the link editor tooltip */
class LinkTooltip {
    private content: HTMLElement;
    private href: string;
    private removeListener: () => void;
    private editListener: () => void;

    private get editButton() {
        return this.content.querySelector(".js-link-tooltip-edit");
    }
    private get removeButton() {
        return this.content.querySelector(".js-link-tooltip-remove");
    }
    private get link() {
        return this.content.querySelector("a");
    }

    constructor(state: EditorState) {
        const popoverId = "link-tooltip-popover" + generateRandomId();
        this.content = document.createElement("span");
        this.content.className = "w0";
        this.content.setAttribute("aria-controls", popoverId);
        this.content.setAttribute("data-controller", "s-popover");
        this.content.setAttribute("data-s-popover-placement", "bottom");

        this.content.innerHTML = escapeHTML`<div class="s-popover is-visible p4 w-auto wmx-initial wmn-initial js-link-tooltip"
            id="${popoverId}"
            role="menu">
            <div class="s-popover--arrow"></div>
            <div class="d-flex ai-center">
                <a href="${this.href}"
                    class="wmx3 flex--item fs-body1 fw-normal truncate ml8 mr4"
                    target="_blank"
                    rel="nofollow noreferrer">${this.href}</a>
                <button type="button"
                        class="flex--item s-btn mr4 js-link-tooltip-edit"
                        title="${_t(
                            "link_tooltip.edit_button_title"
                        )}"><span class="svg-icon icon-bg iconPencilSm"></span></button>
                <button type="button"
                        class="flex--item s-btn js-link-tooltip-remove"
                        title="${_t(
                            "link_tooltip.remove_button_title"
                        )}"><span class="svg-icon icon-bg iconTrashSm"></span></button>
            </div>
        </div>`;

        // never allow the popover to hide itself. It either exists visibly or not at all
        this.content.addEventListener("s-popover:hide", (e: Event) => {
            e.preventDefault();
        });

        // don't bind the exact listener, call whatever is currently set on `this` at event time
        const removeListener = (e: Event) => {
            this.removeListener.call(this, e);
        };
        const editListener = (e: Event) => {
            this.editListener.call(this, e);
        };

        // hook up the click/keyboard events for the supporting buttons
        this.bindElementInteraction(this.removeButton, removeListener);
        this.bindElementInteraction(this.editButton, editListener);

        this.update(state);
    }

    /**
     * Binds both a mousedown and selective keydown listener to replace the purposefully missing "click" event
     * @param element The element to bind the events to
     * @param callback The callback to run on mousedown/keydown
     */
    private bindElementInteraction(element: Element, callback: EventListener) {
        element.addEventListener("mousedown", (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            callback.call(this, e);
        });

        element.addEventListener("keydown", (e: KeyboardEvent) => {
            // allow the Tab key to keep doing its thing
            if (e.key === "Tab") {
                return;
            }

            // cancel all other keypresses
            e.stopPropagation();
            e.preventDefault();

            // enter/space should still fire the event as if clicked
            if (e.key === "Enter" || e.key === " ") {
                callback.call(this, e);
            }
        });
    }

    /**
     * Updates the internal state / tooltip visuals based on the current editor state
     * @param state the current state of the editor
     */
    private update(state: EditorState) {
        if (!this.isLink(state)) {
            return;
        }

        const linkMarks = this.findMarksInSelection(state);

        if (linkMarks.length > 0) {
            this.href = linkMarks[0].attrs.href as string;
            const link = this.link;
            link.href = link.title = link.innerText = this.href;
        }
    }

    /**
     * Gets the tooltip decoration from a new PluginState.apply call
     * @param value The existing LinkTooltipState (with forceHideTooltip potentially set)
     * @param newState The state after the transaction
     */
    getDecorations(
        value: LinkEditorPluginState,
        newState: EditorState
    ): DecorationSet {
        // if we're forced to hide the decorations, don't even attempt to create them
        if ("forceHideTooltip" in value && value.forceHideTooltip) {
            return DecorationSet.empty;
        }

        const marks = this.findMarksInSelection(newState);

        // if there are no marks in the current selection, then return empty
        if (!marks.length) {
            return DecorationSet.empty;
        }

        // always update the state, regardless of document changes (potential metadata changes can change tooltip visuals)
        this.update(newState);

        // create the widget tooltip via EditorView callback
        const decoration = Decoration.widget(
            newState.selection.from,
            (view) => {
                /* NOTE: This function runs on every transaction update */
                this.updateEventListeners(view);
                return this.content;
            },
            {
                // place the widget *before* the cursor so it isn't included in text selections
                side: -1,
                ignoreSelection: true,
                // cancel all events coming from inside this widget
                stopEvent: () => true,
            }
        );

        return DecorationSet.create(newState.doc, [decoration]);
    }

    /**
     * Returns true if the focus event caused something in the content to be focused
     * @param e The dispatched focus event
     */
    hasFocus(e: FocusEvent) {
        return this.content.contains(e.relatedTarget as Element);
    }

    /**
     * Find out if the current selection contains a link mark
     * @param state The current editor state
     */
    private isLink(state: EditorState): boolean {
        const { from, $from, to, empty } = state.selection;
        if (!empty) {
            return state.doc.rangeHasMark(from, to, state.schema.marks.link);
        }

        return (
            state.schema.marks.link.isInSet(
                state.storedMarks || $from.marks()
            ) !== undefined
        );
    }

    /**
     * Expand the current selection to contain the entire link mark.
     * This allows us to remove the link mark from the entire link in the document
     * if the user didn't explicitly select a region to be toggled.
     */
    private expandSelection(state: EditorState, tr: Transaction) {
        const expanded = this.linkAround(state);
        tr = tr.setSelection(
            TextSelection.create(tr.doc, expanded.from, expanded.to)
        );

        return tr;
    }

    /**
     * Gets the positions immediately before and after a link mark in the current selection
     * @param state
     */
    private linkAround(state: EditorState) {
        const $pos = state.selection.$from;
        const start = $pos.parent.childAfter($pos.parentOffset);
        if (!start.node) {
            return;
        }

        const link = findMarksInSet(
            start.node.marks,
            state.schema.marks.link
        )[0];
        if (!link) {
            return;
        }

        let startIndex = $pos.index();
        let startPos = $pos.start() + start.offset;
        while (
            startIndex > 0 &&
            link.isInSet($pos.parent.child(startIndex - 1).marks)
        ) {
            startIndex -= 1;
            startPos -= $pos.parent.child(startIndex).nodeSize;
        }

        let endIndex = $pos.indexAfter();
        let endPos = startPos + start.node.nodeSize;
        while (
            endIndex < $pos.parent.childCount &&
            link.isInSet($pos.parent.child(endIndex).marks)
        ) {
            endPos += $pos.parent.child(endIndex).nodeSize;
            endIndex += 1;
        }

        return { from: startPos, to: endPos };
    }

    /**
     * Finds all marks in the current selection
     * @param state The current editor state
     */
    private findMarksInSelection(state: EditorState): Mark[] {
        const linkMarks: Mark[][] = [];
        const { to, from, $from, empty } = state.selection;
        if (empty) {
            return findMarksInSet($from.marks(), state.schema.marks.link);
        }
        if (to > from) {
            state.doc.nodesBetween(from, to, (node) => {
                linkMarks.push(
                    findMarksInSet(node.marks, state.schema.marks.link)
                );
            });
        }

        const returnValue: Mark[] = [];
        return returnValue.concat(...linkMarks);
    }

    /**
     * Updates apply/delete button events with the current editor view
     * @param view The current editor view
     */
    private updateEventListeners(view: EditorView) {
        this.removeListener = () => {
            let state = view.state;

            if (view.state.selection.empty) {
                const tr = this.expandSelection(state, state.tr);
                state = view.state.apply(tr);
            }

            toggleMark(view.state.schema.marks.link)(
                state,
                view.dispatch.bind(view) as (tr: Transaction) => void
            );
        };

        this.editListener = () => {
            let tr = view.state.tr;
            if (view.state.selection.empty) {
                tr = this.expandSelection(view.state, view.state.tr);
            }

            const state = view.state.apply(tr);
            const { from, to } = state.selection;
            const text = state.doc.textBetween(from, to);
            const href = this.findMarksInSelection(state)[0].attrs
                .href as string;

            tr =
                LINK_EDITOR_KEY.showInterfaceTr(state, {
                    forceHideTooltip: true,
                    url: href,
                    text,
                }) || tr;

            view.dispatch(tr);
        };
    }
}

/**
 * A plugin view that shows a tooltip when selecting a link in rich-text mode.
 * The tooltip shows the href attribute of the selected link and allows removing
 * the link mark from the document. Clicking on the tooltip's edit button will launch
 * a plugin view that allows editing the link's href and text.
 *
 * Note: This is not a _NodeView_ because when dealing with links, we're dealing with
 * _marks_, not _nodes_.
 */
export const linkEditorPlugin = (features: CommonmarkParserFeatures) =>
    new StatefulPlugin<LinkEditorPluginState>({
        key: LINK_EDITOR_KEY,
        state: {
            init(_, instance) {
                return {
                    visible: false,
                    linkTooltip: new LinkTooltip(instance),
                    decorations: DecorationSet.empty,
                    shouldShow: false,
                };
            },
            apply(tr, value, _, newState): LinkEditorPluginState {
                // check if force hide was set and add to value for getDecorations to use
                const meta = this.getMeta(tr) || value;
                if ("forceHideTooltip" in meta) {
                    value.forceHideTooltip = meta.forceHideTooltip;
                }

                // update the linkTooltip and get the decorations
                const decorations = value.linkTooltip.getDecorations(
                    value,
                    newState
                );

                return {
                    ...meta,
                    forceHideTooltip:
                        value.forceHideTooltip &&
                        decorations !== DecorationSet.empty,
                    linkTooltip: value.linkTooltip,
                    decorations: decorations,
                };
            },
        },
        props: {
            decorations(
                this: StatefulPlugin<LinkEditorPluginState>,
                state: EditorState
            ) {
                return this.getState(state).decorations || DecorationSet.empty;
            },
            handleDOMEvents: {
                /** Handle editor blur and close the tooltip if it isn't focused */
                blur(view, e: FocusEvent) {
                    const linkTooltip = LINK_EDITOR_KEY.getState(
                        view.state
                    ).linkTooltip;

                    // if the editor blurs, but NOT because of the tooltip, hide the tooltip
                    if (!view.hasFocus() && !linkTooltip.hasFocus(e)) {
                        view.dispatch(
                            LINK_EDITOR_KEY.forceHideTooltipTr(view.state)
                        );
                    }

                    // always return false since we're not cancelling/handling the blur
                    return false;
                },
            },
            /** Handle mod-click to open links in a new window */
            handleClick(view, pos, event) {
                const mark = findMarksInSet(
                    view.state.doc.resolve(pos).marks(),
                    view.state.schema.marks.link
                )[0];

                const modPressed =
                    getPlatformModKey() === "Cmd"
                        ? event.metaKey
                        : event.ctrlKey;

                const handled = mark && modPressed;

                // a link was mod-clicked, so open it in a new window
                if (handled) {
                    window.open(mark.attrs.href as string, "_blank");
                }

                return !!handled;
            },
        },
        view(editorView): PluginView {
            return new LinkEditor(editorView, features.validateLink);
        },
    });

/**
 * Dispatches a transaction to show the link editor with the given url and text filled in
 * @param view The current editor view
 * @param url The value to prefill the url input with
 * @param text The value to prefill the text input with
 */
export function showLinkEditor(
    view: EditorView,
    url?: string,
    text?: string
): void {
    const tr = LINK_EDITOR_KEY.showInterfaceTr(view.state, {
        url,
        text,
    });

    if (tr) {
        view.dispatch(tr);
    }
}

/**
 * Dispatches a transaction to hide the link editor
 * @param view The current editor view
 */
export function hideLinkEditor(view: EditorView): void {
    const tr = LINK_EDITOR_KEY.hideInterfaceTr(view.state, {
        url: null,
        text: null,
    });

    if (tr) {
        view.dispatch(tr);
    }
}

/**
 * Finds all marks in a set that are of the given type
 * @param marks The set of marks to search
 * @param type The type of mark to find
 */
function findMarksInSet(marks: readonly Mark[], type: MarkType): Mark[] {
    return marks.filter((mark) => mark.type === type);
}
