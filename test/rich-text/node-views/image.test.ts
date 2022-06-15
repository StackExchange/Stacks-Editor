import { ImageView } from "../../../src/rich-text/node-views/image";
import { Node as ProsemirrorNode } from "prosemirror-model";
import { RichTextEditor } from "../../../src/rich-text/editor";
import { ExternalPluginProvider } from "../../../src/shared/editor-plugin";

jest.useFakeTimers();

describe("image node views", () => {
    const imageNode = prosemirrorNode({
        src: "https://example.com/initial.png",
        alt: "some image",
        title: "some title",
        height: 400,
        width: 300,
    });

    const richView = new RichTextEditor(
        document.createElement("div"),
        "![some image](https://example.com/initial.png 'some title')",
        new ExternalPluginProvider([], null)
    );

    it("should render image node as image tag", () => {
        const view = new ImageView(imageNode, richView.editorView, () => 1);

        const image = view.dom.firstChild as HTMLImageElement;
        expect(image.src).toEqual(imageNode.attrs.src);
        expect(image.alt).toEqual(imageNode.attrs.alt);
        expect(image.title).toEqual(imageNode.attrs.title);
    });

    it("should render popover with form", () => {
        const view = new ImageView(imageNode, richView.editorView, () => 1);

        const dom = view.dom as HTMLElement;
        const popover = dom.querySelector("div.s-popover");
        expect(popover).not.toBeNull();

        const form = popover.querySelector("form");
        expect(form).not.toBeNull();

        const srcInput = findInput(form, "src");
        const altInput = findInput(form, "alt");
        const titleInput = findInput(form, "title");

        expect(srcInput).not.toBeNull();
        expect(altInput).not.toBeNull();
        expect(titleInput).not.toBeNull();

        expect(srcInput.value).toEqual(imageNode.attrs.src);
        expect(altInput.value).toEqual(imageNode.attrs.alt);
        expect(titleInput.value).toEqual(imageNode.attrs.title);
    });

    it("should apply property changes on submit", () => {
        const view = new ImageView(imageNode, richView.editorView, () => 1);

        const form = view.form;
        findInput(form, "src").value = "https://example.com/changed.png";
        findInput(form, "alt").value = "changed alt text";
        findInput(form, "title").value = "changed title";

        form.submit();
        jest.runAllTimers();

        expect(richView.content).toBe(
            `![changed alt text](https://example.com/changed.png "changed title")`
        );
    });
});

function findInput(form: HTMLFormElement, inputName: string): HTMLInputElement {
    return form.querySelector(`input[name='${inputName}']`);
}

function prosemirrorNode(attrs: ProsemirrorNode["attrs"]): ProsemirrorNode {
    const node = new ProsemirrorNode();
    // @ts-expect-error TODO
    node.attrs = attrs;
    return node;
}
