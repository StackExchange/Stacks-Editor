import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { escapeHTML } from "../../shared/utils";

//NOTE relies on Stacks classes. Should we separate out so the view is more agnostic?

type getPosParam = boolean | (() => number);

enum AltTextValidationResult {
    Ok,
    AltTextTooLong,
    AltTextDoesntEndWithPeriod,
    AltTextStartsWithLowerCase,
}

// keep track of all images so we can assign unique IDs for stacks popovers
let imageId = 0;
export class ImageView implements NodeView {
    dom?: Node | null;
    img: HTMLImageElement;
    popover: HTMLElement;
    form: HTMLFormElement;
    id: number;
    selectionActive: boolean;

    constructor(node: ProsemirrorNode, view: EditorView, getPos: getPosParam) {
        this.id = imageId++;

        this.img = this.createImage(node);

        this.form = this.createForm();
        this.form.addEventListener("submit", (event) =>
            this.handleChangedImageAttributes(event, getPos, view)
        );

        this.popover = this.createPopover();

        this.dom = document.createElement("div");
        this.dom.appendChild(this.img);
        this.dom.appendChild(this.popover);
        this.dom.addEventListener("s-popover:hide", (event: Event) =>
            this.preventClose(event)
        );
    }
    /**
     * We want to trigger Stacks' showing and hiding of popovers whenever an image is considered
     * "selected" by prosemirror. This can happen by mouse-clicking or arrowing through the editor
     */
    selectNode(): void {
        this.img.classList.add("bs-ring");
        this.selectionActive = true;
        // tell Stacks to hide the popover
        this.img.dispatchEvent(new Event("image-popover-show"));

        const inputFields = this.form.querySelectorAll("input");
        if (inputFields.length > 0) {
            inputFields[0].focus({
                preventScroll: true,
            });
        }
    }

    deselectNode(): void {
        this.img.classList.remove("bs-ring");
        this.selectionActive = false;
        // tell Stacks to hide the popover
        this.img.dispatchEvent(new Event("image-popover-hide"));
    }

    stopEvent(event: Event): boolean {
        // prevent elements from within the tooltip to bubble up to the outer editor
        // as this would make the editor view close the tooltip view right away
        return this.popover.contains(event.target as Element);
    }

    ignoreMutation(): boolean {
        return true;
    }

    destroy(): void {
        this.img.remove();
        this.popover.remove();
        this.dom = null;
        this.form.remove();
    }

    private createImage(node: ProsemirrorNode): HTMLImageElement {
        const img = document.createElement("img");
        img.setAttribute("aria-controls", `img-popover-${this.id}`);
        img.setAttribute("data-controller", "s-popover");
        img.setAttribute(
            "data-action",
            "image-popover-show->s-popover#show image-popover-hide->s-popover#hide"
        );
        img.src = node.attrs.src as string;
        if (node.attrs.alt) img.alt = node.attrs.alt as string;
        if (node.attrs.title) img.title = node.attrs.title as string;

        return img;
    }

    private createForm(): HTMLFormElement {
        const form = document.createElement("form");
        form.className = "d-flex fd-column";
        form.innerHTML = escapeHTML`
            <label class="flex--item s-label mb4" for="img-src-${this.id}">Image source</label>
            <div class="d-flex ps-relative mb12">
                <input class="flex--item s-input" type="text" name="src" id="img-src-${this.id}" value="${this.img.src}" placeholder="https://example.com/image.png"/>
            </div>
            <label class="flex--item s-label mb4" for="img-alt-${this.id}">Image description</label>
            <div class="d-flex ps-relative mb12">
                <input class="flex--item s-input" type="text" name="alt" id="img-alt-${this.id}" value="${this.img.alt}" placeholder="A description for the image"/>
            </div>
            <label class="flex--item s-label mb4" for="img-title-${this.id}">Title</label>
            <div class="d-flex ps-relative mb12">
                <input class="flex--item s-input" type="text" name="title" id="img-title-${this.id}" value="${this.img.title}" placeholder="A title shown on hover"/>
            </div>
            <aside class="s-notice s-notice__warning d-none m8 js-validation-message" role="status" aria-hidden="true"></aside>
            <button class="s-btn s-btn__primary" type="submit" aria-pressed="false">Apply</button>
        `;
        return form;
    }

    private createPopover(): HTMLDivElement {
        const popover = document.createElement("div");
        popover.className = "s-popover ws-normal wb-normal js-img-popover";
        popover.id = `img-popover-${this.id}`;

        // TODO added `ws-normal` to fix FF only bug. Will file bug against Stacks and revisit
        popover.innerHTML = `<div class="s-popover--arrow ws-normal"></div>`;
        popover.append(this.form);

        return popover;
    }

    private handleChangedImageAttributes(
        event: Event,
        getPos: getPosParam,
        view: EditorView
    ) {
        event.preventDefault();

        if (typeof getPos !== "function") return;

        this.hideValidationError();

        const findInput = (selector: string): HTMLInputElement =>
            this.form.querySelector(selector);

        const src = findInput(`#img-src-${this.id}`);
        const alt = findInput(`#img-alt-${this.id}`);
        const validationResult = this.validateImageAltText(alt.value);
        switch (validationResult) {
            case AltTextValidationResult.AltTextDoesntEndWithPeriod:
                this.showValidationError("Alt text should end with a period.");
                return;
            case AltTextValidationResult.AltTextStartsWithLowerCase:
                this.showValidationError(
                    "Alt text should start with an uppercase letter."
                );
                return;
            case AltTextValidationResult.AltTextTooLong:
                this.showValidationError(
                    "Alt text too long. The max is 150 characters, including spaces."
                );
                return;
        }
        const title = findInput(`#img-title-${this.id}`);

        view.dispatch(
            view.state.tr.setNodeMarkup(getPos(), null, {
                src: src.value,
                alt: alt.value,
                title: title.value,
            })
        );

        view.focus();
    }

    showValidationError(errorMessage: string, level = "warning"): void {
        const validationElement = (this.form as HTMLElement).querySelector(
            ".js-validation-message"
        );

        if (level === "warning") {
            validationElement.classList.remove("s-notice__danger");
            validationElement.classList.add("s-notice__warning");
        } else {
            validationElement.classList.remove("s-notice__warning");
            validationElement.classList.add("s-notice__danger");
        }

        validationElement.classList.remove("d-none");
        validationElement.textContent = errorMessage;
    }

    hideValidationError(): void {
        const validationElement = (this.form as HTMLElement).querySelector(
            ".js-validation-message"
        );
        validationElement.classList.add("d-none");
        validationElement.classList.remove("s-notice__warning");
        validationElement.classList.remove("s-notice__danger");
        validationElement.innerHTML = "";
    }

    private validateImageAltText(alt: string): AltTextValidationResult {
        if (!alt.endsWith(".")) {
            return AltTextValidationResult.AltTextDoesntEndWithPeriod;
        }
        if (alt.charAt(0) == alt.charAt(0).toLowerCase()) {
            return AltTextValidationResult.AltTextStartsWithLowerCase;
        }
        if (alt.length > 150) {
            return AltTextValidationResult.AltTextTooLong;
        }

        return AltTextValidationResult.Ok;
    }

    // don't let Stacks close the popover if the image
    // element is still selected in the editor
    private preventClose(event: Event) {
        if (this.selectionActive) {
            event.preventDefault();
        }
    }
}
