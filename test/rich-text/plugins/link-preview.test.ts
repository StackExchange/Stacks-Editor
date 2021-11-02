import { RichTextEditor } from "../../../src/rich-text/editor";
import "../../matchers";

const textOnlyPreviewText = "text-only preview";

function richView(markdownInput: string) {
    return new RichTextEditor(document.createElement("div"), markdownInput, {
        linkPreviewProviders: [
            {
                domainTest: /example.com/,
                renderer: (url) => {
                    const el = document.createElement("div");
                    el.innerText = url;
                    return Promise.resolve(el);
                },
            },
            {
                domainTest: /example.org/,
                renderer: () => {
                    return Promise.resolve(
                        document.createTextNode(textOnlyPreviewText)
                    );
                },
                textOnly: true,
            },
        ],
    });
}

describe("link-preview", () => {
    it("should add rich previews to links on a single line", () => {
        const markdown = "[some link](https://example.com)\n";

        const richEditorView = richView(markdown);

        // check that the loading indicator is shown
        const loadingIndicator = richEditorView.dom.querySelectorAll(
            ".js-link-preview-loading"
        );
        expect(loadingIndicator).toHaveLength(1);

        // wait for the promise to resolve (immediately) and check that the async content was pulled in
        setTimeout(() => {
            // check that the loading indicator is no longer showing
            const loadingIndicator = richEditorView.dom.querySelectorAll(
                ".js-link-preview-loading"
            );
            expect(loadingIndicator).toHaveLength(1);

            const oneboxDom = richEditorView.dom.querySelectorAll(
                ".js-link-preview-decoration"
            );
            expect(oneboxDom).toHaveLength(1);
            expect(oneboxDom[0].textContent).toBe("https://example.com");
        }, 0);
    });

    it("should not add rich previews to links with additional text on the same line", () => {
        const markdown = "here is [some link](https://example.com)\n";

        const richEditorView = richView(markdown);

        const oneboxDom = richEditorView.dom.querySelectorAll(".js-onebox");
        expect(oneboxDom).toHaveLength(0);
    });

    it("should add text-only previews to any valid link", () => {
        const markdown = "[https://example.org](https://example.org)\n";

        const richEditorView = richView(markdown);

        // check that the loading indicator is shown
        const loadingIndicator = richEditorView.dom.querySelectorAll(
            ".js-link-preview-loading"
        );
        expect(loadingIndicator).toHaveLength(1);

        // wait for the promise to resolve (immediately) and check that the async content was pulled in
        setTimeout(() => {
            // check that the loading indicator is no longer showing
            const loadingIndicator = richEditorView.dom.querySelectorAll(
                ".js-link-preview-loading"
            );
            expect(loadingIndicator).toHaveLength(1);

            // on a catastrophic crash, the raw string content gets
            // added into a code_block with a warning to the user attached
            expect(richEditorView.document).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                        "content": [
                            {
                                "type.isText": true,
                                "text": textOnlyPreviewText,
                                "marks.0.type.name": "link",
                                "marks.0.attrs.href": "https://example.org",
                            },
                        ],
                    },
                ],
            });
        }, 0);
    });
});
