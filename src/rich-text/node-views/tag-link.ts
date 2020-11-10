import { Node as ProsemirrorNode } from "prosemirror-model";
import { NodeView } from "prosemirror-view";

// TODO instead of a NodeView, should we use marks and an editor like `link-tooltip`?
export class TagLink implements NodeView {
    dom?: HTMLElement | null;

    // TODO constructor needs* to know where to link to
    constructor(node: ProsemirrorNode) {
        this.dom = document.createElement("a");
        this.dom.setAttribute("href", "#"); //TODO
        this.dom.classList.add("s-tag");
        if (node.attrs.tagType === "meta-tag") {
            this.dom.classList.add("s-tag__muted");
        }
        this.dom.innerText = node.attrs.tagName as string;
    }
}
