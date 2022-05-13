import { RichTextEditor } from "../../../src/rich-text/editor";
import { LinkPreviewProvider } from "../../../src/rich-text/plugins/link-preview";
import "../../matchers";
import { sleepAsync } from "../test-helpers";

const textOnlyPreviewText = "text-only preview";

function richView(markdownInput: string, provider?: LinkPreviewProvider) {
    return new RichTextEditor(document.createElement("div"), markdownInput, {
        linkPreviewProviders: [provider],
    });
}

describe("link-preview", () => {
    it("should add rich previews to links on a single line", async () => {
        const markdown = "[some link](https://example.com)\n";

        // store the promise so we can control when it resolves
        let resolver: (value: Element | PromiseLike<Element>) => void;
        const promise = new Promise<Element>((resolve) => {
            resolver = resolve;
        });

        let promiseContent: HTMLElement;

        const richEditorView = richView(markdown, {
            domainTest: /example.com/,
            renderer: (url) => {
                promiseContent = document.createElement("div");
                promiseContent.textContent = url;
                return promise;
            },
        });

        // check that the loading indicator is shown
        let loadingIndicator = richEditorView.dom.querySelectorAll(
            ".js-link-preview-loading"
        );
        expect(loadingIndicator).toHaveLength(1);
        resolver(promiseContent);

        // wait for the promise to resolve (immediately) and check that the async content was pulled in
        await sleepAsync(0);

        // check that the loading indicator is no longer showing
        loadingIndicator = richEditorView.dom.querySelectorAll(
            ".js-link-preview-loading"
        );
        expect(loadingIndicator).toHaveLength(0);

        const oneboxDom = richEditorView.dom.querySelectorAll(
            ".js-link-preview-decoration"
        );
        expect(oneboxDom).toHaveLength(1);
        expect(oneboxDom[0].textContent).toBe("https://example.com");
    });

    it("should not add rich previews to links with additional text on the same line", () => {
        const markdown = "here is [some link](https://example.com)\n";

        const richEditorView = richView(markdown);

        const oneboxDom = richEditorView.dom.querySelectorAll(".js-onebox");
        expect(oneboxDom).toHaveLength(0);
    });

    it("should add text-only previews to any valid link", async () => {
        const markdown = "[https://example.org](https://example.org)\n";

        // store the promise so we can control when it resolves
        let resolver: (value: Text | PromiseLike<Text>) => void;
        const promise = new Promise<Text>((resolve) => {
            resolver = resolve;
        });

        const richEditorView = richView(markdown, {
            domainTest: /example.org/,
            renderer: () => promise,
            textOnly: true,
        });

        // check that the loading indicator is shown
        let loadingIndicator = richEditorView.dom.querySelectorAll(
            ".js-link-preview-loading"
        );
        expect(loadingIndicator).toHaveLength(1);

        resolver(document.createTextNode(textOnlyPreviewText));

        // wait for the promise to resolve (immediately) and check that the async content was pulled in
        await sleepAsync(0);

        // check that the loading indicator is no longer showing
        loadingIndicator = richEditorView.dom.querySelectorAll(
            ".js-link-preview-loading"
        );
        expect(loadingIndicator).toHaveLength(0);

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
    });

    it.each([
        [
            `| Column A | Column B |
| --- | --- |
| [Cell 1](https://example.com/foo/bar) | Cell 2 |
| Cell 3 | Cell 4 |`,
            "TD",
        ],
        [`# https://example.com/foo/bar`, "H1"],
    ])(
        "should add rich previews directly before the link in the same parent node",
        async (markdown, parentNodeName) => {
            const richEditorView = richView(markdown, {
                domainTest: /example.com/,
                renderer: (url) => {
                    const promiseContent = document.createElement("div");
                    promiseContent.textContent = url;
                    return Promise.resolve(promiseContent);
                },
            });

            // wait for the promise to resolve (immediately) and check that the async content was pulled in
            await sleepAsync(0);

            const oneboxDom = richEditorView.dom.querySelectorAll(
                ".js-link-preview-decoration"
            );
            expect(oneboxDom).toHaveLength(1);
            expect(oneboxDom[0].parentElement.nodeName).toBe(parentNodeName);
            expect(oneboxDom[0].nextElementSibling.nodeName).toBe("A");
        }
    );
});
