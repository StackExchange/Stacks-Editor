import { Node as ProsemirrorNode } from "prosemirror-model";
import { NodeView } from "prosemirror-view";

export class HtmlBlock implements NodeView {
    dom?: HTMLElement | null;

    constructor(node: ProsemirrorNode) {
        // TODO
        this.dom = document.createElement("div");
        this.dom.className = "html_block ProseMirror-widget";
        // TODO need to indicate that this can't be edited
        //this.dom.classList.add("bg-red-100");

        // NOTE XSS safe, content is sanitized before getting here
        // eslint-disable-next-line no-unsanitized/property
        this.dom.innerHTML = node.attrs.content as string;
    }
}

export class HtmlBlockContainer implements NodeView {
    dom?: HTMLElement | null;
    contentDOM?: HTMLElement | null;

    constructor(node: ProsemirrorNode) {
        // TODO
        this.dom = document.createElement("div");
        this.dom.className = "html_block_container ProseMirror-widget";

        // check for children, just to be safe
        if (!node.childCount) {
            this.dom.innerHTML = "invalid html_block_container";
            return;
        }

        const contentDomPlaceholder = `<div class="ProseMirror-contentdom"></div>`;

        const wrappingHtmlString =
            (node.attrs.contentOpen as string) +
            contentDomPlaceholder +
            (node.attrs.contentClose as string);

        // NOTE XSS safe, content is sanitized before getting here
        // eslint-disable-next-line no-unsanitized/property
        this.dom.innerHTML = wrappingHtmlString;
        this.contentDOM = this.dom.querySelector(".ProseMirror-contentdom");
    }
}
