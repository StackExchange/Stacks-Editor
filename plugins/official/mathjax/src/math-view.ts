import { Node as ProseMirrorNode } from "prosemirror-model";
import { NodeView } from "prosemirror-view";
import { MathJaxOptions } from "./common";

/** Rich-text node view that delegates MathJax rendering to the host. */
export class MathJaxView implements NodeView {
    readonly dom: HTMLElement;
    private renderVersion = 0;

    constructor(
        private node: ProseMirrorNode,
        private readonly display: boolean,
        private readonly options?: MathJaxOptions
    ) {
        this.dom = document.createElement(display ? "div" : "span");
        this.dom.classList.add(
            "stacks-editor-math",
            display ? "stacks-editor-math-display" : "stacks-editor-math-inline"
        );
        this.dom.contentEditable = "false";
        this.render();
    }

    /** Update this view when ProseMirror replaces its backing node. */
    update(node: ProseMirrorNode): boolean {
        if (node.type !== this.node.type) {
            return false;
        }

        this.node = node;
        this.render();
        return true;
    }

    /** Release any state owned by the host renderer. */
    destroy(): void {
        this.renderVersion++;
        try {
            void Promise.resolve(this.options?.clear?.(this.dom)).catch(
                (): void => {}
            );
        } catch {
            // Cleanup is best-effort because the node has already been removed.
        }
    }

    /** Render the current TeX source, preserving readable fallback content. */
    private render(): void {
        const version = ++this.renderVersion;
        const source = this.node.attrs.source as string;
        const openDelimiter = this.node.attrs.openDelimiter as string;
        const closeDelimiter = this.node.attrs.closeDelimiter as string;
        const fallback = `${openDelimiter}${source}${closeDelimiter}`;

        this.dom.textContent = fallback;

        if (!this.options?.renderer) {
            return;
        }

        try {
            const result = this.options.renderer({
                container: this.dom,
                source,
                display: this.display,
            });

            void Promise.resolve(result).catch(() => {
                if (version === this.renderVersion) {
                    this.dom.textContent = fallback;
                }
            });
        } catch {
            this.dom.textContent = fallback;
        }
    }
}
