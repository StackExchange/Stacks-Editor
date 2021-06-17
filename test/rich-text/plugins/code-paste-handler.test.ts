import {
    codePasteHandler,
    getDetectedCode,
} from "../../../src/rich-text/plugins/code-paste-handler";
import "../../matchers";
import {
    applySelection,
    cleanupPasteSupport,
    createState,
    createView,
    DataTransferMock,
    dispatchPasteEvent,
    setupPasteSupport,
} from "../test-helpers";

const nonCodeTextData = ["not code", " nope", " still\tnope", "\n\nnada\n\n"];

const codeTextData = [
    `  code`,
    `    code`,
    `\tcode`,
    `note code\n  code\nnot code`,
    `note code\n\tcode\nnot code`,
    // TODO should empty lines count as code?
    `\t`,
    `  `,
    `not code\n\t\nnot code`,
];

describe("code-paste-handler", () => {
    describe("getDetectedCode", () => {
        it("should ignore empty data", () => {
            const data = new DataTransferMock({});
            const code = getDetectedCode(data);
            expect(code).toBeNull();
        });

        it.each(codeTextData)("should detect code in text (%#)", (text) => {
            const data = new DataTransferMock({
                "text/plain": text,
            });
            const code = getDetectedCode(data);
            expect(code).toBe(text);
        });

        it.each(nonCodeTextData)("should ignore non-code text (%#)", (text) => {
            const data = new DataTransferMock({
                "text/plain": text,
            });
            const code = getDetectedCode(data);
            expect(code).toBeNull();
        });

        it("should detect lone <code> in html", () => {
            const data = new DataTransferMock({
                "text/html": "<code>test</code>",
            });
            const code = getDetectedCode(data);
            expect(code).toBe("test");
        });

        it("should detect wrapped <code> in html with no other content", () => {
            const data = new DataTransferMock({
                "text/html": "<pre><code>test</code></pre>",
            });
            const code = getDetectedCode(data);
            expect(code).toBe("test");
        });

        it("should ignore <code> with other content", () => {
            const data = new DataTransferMock({
                "text/html": "<p>other stuff</p><code>test</code>",
            });
            const code = getDetectedCode(data);
            expect(code).toBeNull();
        });

        it.each(["vscode-editor-data"])(
            "should detect special ide support",
            (ideDataFormat: string) => {
                const codeText = "not code";
                const data = new DataTransferMock({
                    "text/plain": codeText,
                });
                data.setData(ideDataFormat, "TODO");

                const code = getDetectedCode(data);
                expect(code).toBe(codeText);
            }
        );
    });

    describe("codePasteHandler plugin", () => {
        beforeAll(setupPasteSupport);
        afterAll(cleanupPasteSupport);

        it.each(nonCodeTextData)(
            "should handle pasting non-code text (%#)",
            (text) => {
                const view = createView(createState("", [codePasteHandler]));

                dispatchPasteEvent(view.dom, {
                    "text/plain": text,
                });

                expect(view.state.doc).toMatchNodeTree({
                    "type.name": "doc",
                    "childCount": 1,
                    "content": [
                        {
                            "type.name": "paragraph",
                            "content": [
                                {
                                    "type.name": "text",
                                    "text": text.trim(),
                                },
                            ],
                        },
                    ],
                });
            }
        );

        it.each(codeTextData)(
            "should handle pasting code text (%#)",
            (text) => {
                const view = createView(createState("", [codePasteHandler]));

                dispatchPasteEvent(view.dom, {
                    "text/plain": text,
                });

                expect(view.state.doc).toMatchNodeTree({
                    "type.name": "doc",
                    "childCount": 1,
                    "content": [
                        {
                            "type.name": "code_block",
                            "content": [
                                {
                                    "type.name": "text",
                                    "text": text,
                                },
                            ],
                        },
                    ],
                });
            }
        );

        it("should paste into existing code_blocks", () => {
            const view = createView(
                createState(
                    `<pre data-params="lang-test"><code>existing code here</code></pre>`,
                    [codePasteHandler]
                )
            );

            dispatchPasteEvent(view.dom, {
                "text/plain": "\tnew code",
            });

            expect(view.state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 1,
                "content": [
                    {
                        "type.name": "code_block",
                        "attrs.params": "lang-test",
                        "content": [
                            {
                                "type.name": "text",
                                "text": "\tnew codeexisting code here",
                            },
                        ],
                    },
                ],
            });
        });

        it("should replace selected text range", () => {
            const startText =
                "replace from START and all text until END and nothing more";
            const replacingText = "\treplaced text";
            const startIndex = startText.indexOf("START");
            const endIndex = startText.indexOf("END") + "END".length;

            let state = createState(`<p>${startText}</p>`, [codePasteHandler]);
            state = applySelection(state, startIndex, endIndex);

            const view = createView(state);

            dispatchPasteEvent(view.dom, {
                "text/plain": replacingText,
            });

            expect(view.state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 3,
                "content": [
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                "type.name": "text",
                                "text": startText.slice(0, startIndex),
                            },
                        ],
                    },
                    {
                        "type.name": "code_block",
                        "content": [
                            {
                                "type.name": "text",
                                "text": replacingText,
                            },
                        ],
                    },
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                "type.name": "text",
                                "text": startText.slice(endIndex),
                            },
                        ],
                    },
                ],
            });
        });
    });
});
