import { Node as ProsemirrorNode } from "prosemirror-model";
import { NodeView } from "prosemirror-view";
import { error } from "../../shared/logger";
import { TagLinkOptions } from "../../shared/view";

// TODO instead of a NodeView, should we use marks and an editor like `link-tooltip`?
export class TagLink implements NodeView {
    dom: HTMLElement | null;

    constructor(node: ProsemirrorNode, options: TagLinkOptions) {
        this.dom = document.createElement("a");
        this.dom.setAttribute("href", "#");
        this.dom.setAttribute("rel", "tag");
        this.dom.classList.add("s-tag");
        this.dom.innerText = node.attrs.tagName as string;

        if (options?.render) {
            const rendered = options.render(
                node.attrs.tagName as string,
                node.attrs.tagType === "meta-tag"
            );

            // the renderer failed to return the bare minimum necessary to link the tag
            // log an error to the console, but don't crash the user input
            if (!rendered || !rendered?.link) {
                error(
                    "TagLink NodeView",
                    "Unable to render taglink due to invalid response from options.renderer: ",
                    rendered
                );
                return;
            }

            const additionalClasses = rendered.additionalClasses || [];
            additionalClasses.forEach((c) => this.dom.classList.add(c));
            this.dom.setAttribute("href", rendered.link);
            this.dom.setAttribute("title", rendered.linkTitle);
        }
    }
}
