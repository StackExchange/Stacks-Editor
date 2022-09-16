import {
    setupPasteSupport,
    cleanupPasteSupport,
    createView,
    createState,
    dispatchPasteEvent,
    applySelection,
    parseHtmlToDoc,
} from "../test-helpers";
import { plainTextPasteHandler } from "../../../src/rich-text/plugins/plain-text-paste-handler";

describe("plain-text-paste-handler", () => {
    beforeAll(setupPasteSupport);
    afterAll(cleanupPasteSupport);

    it("should inherit marks when pasting unformatted text", () => {
        const view = createView(
            applySelection(
                createState("<strong>test</strong>", [plainTextPasteHandler]),
                2
            )
        );

        dispatchPasteEvent(view.dom, {
            "text/plain": "plain text",
            "text/html": "<span>plain text</span>",
        });

        expect(view.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "content": [
                        {
                            "type.name": "text",
                            "text": "teplain textst",
                            "marks.0.type.name": "strong",
                        },
                    ],
                },
            ],
        });
    });

    it("should not inherit marks when pasting formatted text", () => {
        const view = createView(
            applySelection(
                createState("<strong>test</strong>", [plainTextPasteHandler]),
                2
            )
        );

        dispatchPasteEvent(view.dom, {
            "text/plain": "plain text",
            "text/html": "<em>plain text</em>",
        });

        expect(view.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "content": [
                        {
                            "type.name": "text",
                            "text": "te",
                            "marks.0.type.name": "strong",
                        },
                        {
                            "type.name": "text",
                            "text": "plain text",
                            "marks.0.type.name": "em",
                        },
                        {
                            "type.name": "text",
                            "text": "st",
                            "marks.0.type.name": "strong",
                        },
                    ],
                },
            ],
        });
    });

    it("should inherit marks when pasting after formatted text", () => {
        const view = createView(
            applySelection(
                createState("<strong>test</strong>", [plainTextPasteHandler]),
                4
            )
        );

        dispatchPasteEvent(view.dom, {
            "text/plain": "plain text",
            "text/html": "<span>plain text</span>",
        });

        expect(view.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "content": [
                        {
                            "type.name": "text",
                            "text": "testplain text",
                            "marks.0.type.name": "strong",
                        },
                    ],
                },
            ],
        });
    });

    it("should not inherit marks when pasting before formatted text", () => {
        const view = createView(
            applySelection(
                createState("<strong>test</strong>", [plainTextPasteHandler]),
                0
            )
        );

        dispatchPasteEvent(view.dom, {
            "text/plain": "plain text",
            "text/html": "<span>plain text</span>",
        });

        expect(view.state.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "content": [
                        {
                            "type.name": "text",
                            "text": "plain text",
                            "marks.length": 0,
                        },
                        {
                            "type.name": "text",
                            "text": "test",
                            "marks.0.type.name": "strong",
                        },
                    ],
                },
            ],
        });
    });

    it.each([
        // no text at all
        ["<strong>test</strong>", {}, false],
        // no html
        [
            "<strong>test</strong>",
            {
                "text/plain": "plain text",
            },
            false,
        ],
        ["<strong>test</strong>", {}, false],
        // plain text into marked text
        [
            "<strong>test</strong>",
            {
                "text/plain": "plain text",
                "text/html": "<span>plain text</span>",
            },
            true,
        ],
        [
            "<strong>test</strong>",
            {
                "text/plain": "plain text",
                "text/html": "<p>plain text</p>",
            },
            true,
        ],
        // plain text into plain (unmarked) text
        [
            "<p>test</p>",
            {
                "text/plain": "plain text",
                "text/html": "<span>plain text</span>",
            },
            false,
        ],
        // non-text into marked text
        [
            "<p>test</p>",
            {
                "text/plain": "plain text",
                "text/html": "<h1>plain text</h1>",
            },
            false,
        ],
        // marked text into marked text
        [
            "<strong>test</strong>",
            {
                "text/plain": "plain text",
                "text/html": "<strong>plain text</strong>",
            },
            false,
        ],
    ])(
        "should handle differently depending on the input and selection (%#)",
        (
            docContent: string,
            pasteData: { "text/plain"?: string; "text/html"?: string },
            shouldHandle: boolean
        ) => {
            const view = createView(
                applySelection(
                    createState(docContent, [plainTextPasteHandler]),
                    2
                )
            );

            // don't actually dispatch to the view, just simulate the paste event so we can manually dispatch via the plugin
            const evt = dispatchPasteEvent(
                document.createElement("div"),
                pasteData
            );

            const doc = parseHtmlToDoc(pasteData["text/html"], true);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            const handled = plainTextPasteHandler.props.handlePaste.bind(
                plainTextPasteHandler
            )(view, evt, doc) as boolean;

            expect(handled).toBe(shouldHandle);
        }
    );
});
