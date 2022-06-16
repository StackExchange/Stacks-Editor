import { toggleMark } from "prosemirror-commands";
import { Mark } from "prosemirror-model";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { _t } from "../../shared/localization";
import {
    StatefulPlugin,
    StatefulPluginKey,
} from "../../shared/prosemirror-plugins/plugin-extensions";
import { richTextSchema as schema } from "../schema";
import { escapeHTML, generateRandomId } from "../../shared/utils";
import { CommonmarkParserFeatures } from "../../shared/view";

class LinkTooltip {
    private content: HTMLElement;
    private href: string;
    private removeListener: () => void;
    private applyListener: () => void;
    private validateLink: CommonmarkParserFeatures["validateLink"];

    editing: boolean;

    private get editButton() {
        return this.content.querySelector(".js-link-tooltip-edit");
    }
    private get applyButton() {
        return this.content.querySelector(".js-link-tooltip-apply");
    }
    private get removeButton() {
        return this.content.querySelector(".js-link-tooltip-remove");
    }
    private get link() {
        return this.content.querySelector("a");
    }
    private get input() {
        return this.content.querySelector<HTMLInputElement>(
            ".js-link-tooltip-input"
        );
    }
    private get inputWrapper() {
        return this.content.querySelector<HTMLInputElement>(
            ".js-link-tooltip-input-wrapper"
        );
    }

    constructor(
        state: EditorState,
        linkValidator: CommonmarkParserFeatures["validateLink"]
    ) {
        const popoverId = "link-tooltip-popover" + generateRandomId();
        this.validateLink = linkValidator;
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
                <div class="flex--item d-none wmn2 ml2 mr4 mb0 js-link-tooltip-input-wrapper">
                    <input type="text"
                            class="s-input s-input__sm js-link-tooltip-input"
                            autocomplete="off"
                            name="link"
                            value="${this.href}" />
                </div>
                <button type="button"
                        class="flex--item s-btn mr4 js-link-tooltip-edit"
                        title="${_t(
                            "link_tooltip.edit_button_title"
                        )}"><span class="svg-icon icon-bg iconPencilSm"></span></button>
                <button type="button"
                        class="flex--item s-btn d-none js-link-tooltip-apply"
                        title="${_t("link_tooltip.apply_button_title")}">${_t(
            "link_tooltip.apply_button_text"
        )}</button>
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

        // same as above, don't bind directly
        const applyListener = (e: Event) => {
            this.applyListener.call(this, e);
        };

        // prevent form submits on ENTER press and apply changes instead
        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.stopPropagation();
                e.preventDefault();
                applyListener(e);
            }
        });

        // hook up the click/keyboard events for the supporting buttons
        this.bindElementInteraction(this.applyButton, applyListener);
        this.bindElementInteraction(this.removeButton, removeListener);
        this.bindElementInteraction(this.editButton, () => {
            this.showEditMode(this.href);
        });

        this.editing = false;
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

        // if we can toggle the mark and actually found an href to display, show the tooltip
        if (toggleMark(schema.marks.link)(state) && this.href) {
            this.hideEditMode();
        }

        if (this.editing || this.href === "") {
            this.showEditMode(this.href);
        }
    }

    /**
     * Gets the tooltip decoration from a new PluginState.apply call
     * @param tr The transaction that was applied (to map existing decorations)
     * @param value The existing LinkTooltipState (with forceHidden potentially set)
     * @param oldState The state before the transaction
     * @param newState The state after the transaction
     */
    getDecorations(
        tr: Transaction,
        value: LinkTooltipState,
        oldState: EditorState,
        newState: EditorState
    ): DecorationSet {
        // if we're forced to hide the decorations, don't even attempt to create them
        if ("forceHide" in value && value.forceHide) {
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
            return state.doc.rangeHasMark(from, to, schema.marks.link);
        }

        return (
            schema.marks.link.isInSet(state.storedMarks || $from.marks()) !==
            undefined
        );
    }

    /**
     * Shows the input for href editing and focuses it
     * @param url
     */
    private showEditMode(url: string) {
        this.hideValidationError();
        const input = this.input;
        input.value = url || "https://";
        this.inputWrapper.classList.remove("d-none");
        input.select();
        this.applyButton.classList.remove("d-none");
        this.editButton.classList.add("d-none");
        this.link.classList.add("d-none");
        input.focus();
    }

    /**
     * Hides the href focus input and changes back to view mode
     */
    private hideEditMode() {
        this.editButton.classList.remove("d-none");
        this.link.classList.remove("d-none");
        this.inputWrapper.classList.add("d-none");
        this.applyButton.classList.add("d-none");
    }

    /** Marks the input with a visual validation error */
    private showValidationError() {
        this.inputWrapper.classList.add("has-error");
    }

    /** Clears the input of any visual validation errors */
    private hideValidationError() {
        this.inputWrapper.classList.remove("has-error");
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

        const link = start.node.marks.find(
            (mark) => mark.type === state.schema.marks.link
        );
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
            return $from
                .marks()
                .filter((mark) => mark.type === schema.marks.link);
        }
        if (to > from) {
            state.doc.nodesBetween(from, to, (node) => {
                linkMarks.push(
                    node.marks.filter((mark) => mark.type === schema.marks.link)
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
                // TODO chain the double dispatch!
                view.dispatch(this.expandSelection(state, view.state.tr));
                state = view.state;
            }

            toggleMark(schema.marks.link)(state, view.dispatch.bind(view));
        };

        this.applyListener = () => {
            const link = this.link;
            const input = this.input;

            let { from, to } = view.state.selection;

            this.editing = false;

            // the input stole focus from the editor, so reset focus
            view.focus();

            // if the link didn't change, close and move on
            if (link.href === input.value) {
                this.hideEditMode();
                return;
            }

            this.hideValidationError();

            // validate link
            if (!this.validateLink(input.value)) {
                this.showValidationError();
                return;
            }

            link.href = link.title = link.innerText = input.value;

            if (view.state.selection.empty) {
                const expanded = this.linkAround(view.state);
                from = expanded.from;
                to = expanded.to;
            }

            const tr = view.state.tr.addMark(
                from,
                to,
                schema.marks.link.create({ href: this.link.href })
            );

            view.dispatch(tr);
        };
    }
}

/** Represents the link tooltip plugin's state */
type LinkTooltipState = {
    forceHide?: boolean;
    editing?: boolean;
    linkTooltip: LinkTooltip;
    decorations: DecorationSet;
};

/**
 * Custom PluginKey with additional methods for interacting with a LinkTooltip
 */
class LinkTooltipPluginKey extends StatefulPluginKey<LinkTooltipState> {
    constructor() {
        super(LinkTooltip.name);
    }

    /**
     * Launch the link tooltip in edit mode
     */
    setEditMode(
        isEditing: boolean,
        state: EditorState,
        tr: Transaction
    ): Transaction {
        // set edit mode on the link tooltip
        const meta = this.getState(state);
        meta.editing = isEditing;

        // signal to the view that an update has been made
        return this.setMeta(tr, meta);
    }

    /**
     * Force the link tooltip to hide - useful e.g. when the entire editor is losing
     * focus and we want to make sure the tooltip disappears, too
     */
    forceHide(state: EditorState, dispatch: (tr: Transaction) => void): void {
        const meta = this.getState(state);

        // if the tooltip is not showing, just return
        if (meta.decorations === DecorationSet.empty) {
            return;
        }

        meta.forceHide = true;
        const tr = this.setMeta(state.tr, meta);

        // immediately dispatch
        dispatch(tr);
    }
}

export const LINK_TOOLTIP_KEY = new LinkTooltipPluginKey();

/**
 * A plugin view that shows a tooltip when selecting a link in rich-text mode.
 * The tooltip shows the href attribute of the selected link and allows removing
 * the link mark from the document.
 *
 * Note: This is not a _NodeView_ because when dealing with links, we're dealing with
 * _marks_, not _nodes_.
 */
export const linkTooltipPlugin = (features: CommonmarkParserFeatures) =>
    new StatefulPlugin<LinkTooltipState>({
        key: LINK_TOOLTIP_KEY,
        state: {
            init(_, instance) {
                return {
                    linkTooltip: new LinkTooltip(
                        instance,
                        features.validateLink
                    ),
                    decorations: DecorationSet.empty,
                };
            },
            apply(tr, value, oldState, newState): LinkTooltipState {
                // check if force hide was set and add to value for getDecorations to use
                const meta = this.getMeta(tr) || value;
                if ("forceHide" in meta) {
                    value.forceHide = meta.forceHide;
                }

                // check for editing as well
                value.linkTooltip.editing =
                    "editing" in meta ? meta.editing : false;

                // update the linkTooltip and get the decorations
                const decorations = value.linkTooltip.getDecorations(
                    tr,
                    value,
                    oldState,
                    newState
                );

                // always return a "fresh" state with just the required items set
                return {
                    linkTooltip: value.linkTooltip,
                    decorations: decorations,
                };
            },
        },
        props: {
            decorations(
                this: StatefulPlugin<LinkTooltipState>,
                state: EditorState
            ) {
                return this.getState(state).decorations;
            },
            handleDOMEvents: {
                /** Handle editor blur and close the tooltip if it isn't focused */
                blur(view, e: FocusEvent) {
                    const linkTooltip = LINK_TOOLTIP_KEY.getState(
                        view.state
                    ).linkTooltip;

                    // if the editor blurs, but NOT because of the tooltip, hide the tooltip
                    if (!view.hasFocus() && !linkTooltip.hasFocus(e)) {
                        LINK_TOOLTIP_KEY.forceHide(
                            view.state,
                            view.dispatch.bind(view)
                        );
                    }

                    // always return false since we're not cancelling/handling the blur
                    return false;
                },
            },
        },
    });
