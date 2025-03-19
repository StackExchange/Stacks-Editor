import { openSnippetModal } from "../../../src/shared/plugins/stack-snippets/commands";
import {
    getSnippetMetadata,
    mapMetaLine,
    MetaLine,
    SnippetMetadata,
    StackSnippetOptions,
    validateMetaLines,
} from "../../../src/shared/plugins/stack-snippets/common";
import { EditorState } from "prosemirror-state";
import {
    cleanupPasteSupport,
    createState,
    createView,
    dispatchPasteEvent,
    setupPasteSupport,
    testRichTextSchema,
} from "../test-helpers";
import {
    configureBegin,
    validBegin,
    validCss,
    validEnd,
    validHtml,
    validJs,
    validSnippetRenderCases,
} from "./stack-snippet-helpers";
import {
    parseSnippetBlockForProsemirror,
    stackSnippetPasteHandler,
} from "../../../src/shared/plugins/stack-snippets/paste-handler";
import { EditorView } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { StackSnippetView } from "../../../src/shared/plugins/stack-snippets/snippet-view";

describe("Stack-snippet", () => {
    describe("commands", () => {
        const whenOpenSnippetCommandCalled = (
            state: EditorState,
            shouldMatchCall: (
                meta?: SnippetMetadata,
                js?: string,
                css?: string,
                html?: string
            ) => boolean
        ) => {
            let captureMeta: SnippetMetadata = null;
            let captureJs: string = null;
            let captureCss: string = null;
            let captureHtml: string = null;
            const snippetOptions: StackSnippetOptions = {
                renderer: () => Promise.resolve(null),
                openSnippetsModal: (meta, js, css, html) => {
                    captureMeta = meta;
                    captureJs = js;
                    captureCss = css;
                    captureHtml = html;
                },
            };
            const ret = openSnippetModal(snippetOptions)(state, () => {});

            //The openModal command is always handled when called with dispatch
            expect(ret).toBe(true);
            expect(
                shouldMatchCall(captureMeta, captureJs, captureCss, captureHtml)
            ).toBe(true);
        };

        it("should do nothing if dispatch null", () => {
            const snippetOptions: StackSnippetOptions = {
                renderer: () => Promise.resolve(null),
                openSnippetsModal: () => {},
            };
            const state = createState(
                "Here's a paragraph -  a text block mind you",
                []
            );

            const command = openSnippetModal(snippetOptions);

            const ret = command(state, null);

            expect(ret).toBe(true);
        });

        it("should send openModal with blank arguments if no snippet detected", () => {
            const state = createState(
                "Here's a paragraph -  a text block mind you",
                []
            );

            whenOpenSnippetCommandCalled(state, (meta, js, css, html) => {
                //Expect a blank modal
                if (meta || js || css || html) {
                    return false;
                }
                return true;
            });
        });

        it.each(validSnippetRenderCases)(
            "should send openModal with blank arguments if snippet detected",
            (markdown: string, langs: string[]) => {
                //Create a blank doc, then replace the contents (a paragraph node) with the parsed markdown.
                let state = EditorState.create({
                    schema: testRichTextSchema,
                    plugins: [],
                });
                state = state.apply(
                    state.tr.replaceRangeWith(
                        0,
                        state.doc.nodeSize - 2,
                        parseSnippetBlockForProsemirror(
                            testRichTextSchema,
                            markdown
                        )
                    )
                );

                //Anywhere selection poision is now meaningfully a part of the stack snippet, so open the modal and expect it to be passed
                whenOpenSnippetCommandCalled(state, (meta, js, css, html) => {
                    if (!meta) {
                        return false;
                    }
                    if ("js" in langs) {
                        if (js === undefined) return false;
                    }
                    if ("css" in langs) {
                        if (css === undefined) return false;
                    }
                    if ("html" in langs) {
                        if (html === undefined) return false;
                    }

                    return true;
                });
            }
        );
    });

    describe("common functions", () => {
        describe("getSnippetMetadata", () => {
            it("should return null if empty node provided", () => {
                expect(getSnippetMetadata(null)).toBeNull();
            });

            it("should return null if non-snippet node provided", () => {
                const node = testRichTextSchema.text("Here's a test text node");

                expect(getSnippetMetadata(node)).toBeNull();
            });

            it("should parse begin correctly", () => {
                const validSnippetRaw =
                    configureBegin(true, false, null, true, false) +
                    validJs +
                    validEnd;
                const validSnippet = parseSnippetBlockForProsemirror(
                    testRichTextSchema,
                    validSnippetRaw
                );

                const metadata = getSnippetMetadata(validSnippet);

                expect(metadata.hide).toBe("true");
                expect(metadata.console).toBe("false");
                expect(metadata.babel).toBe("null");
                expect(metadata.babelPresetReact).toBe("true");
                expect(metadata.babelPresetTS).toBe("false");
            });

            it("should assign an ID if none available", () => {
                const validSnippetRaw = validBegin + validJs + validEnd;
                const validSnippet = parseSnippetBlockForProsemirror(
                    testRichTextSchema,
                    validSnippetRaw
                );

                const metadata = getSnippetMetadata(validSnippet);

                expect(metadata.id).toBeDefined();
            });

            it("should use an available ID if provided", () => {
                //Parsing markdown auto-generates an ID.
                // Here we want it specified, so we're creating the block by hand
                const langNode =
                    testRichTextSchema.nodes.stack_snippet_lang.createChecked(
                        { language: "js" },
                        testRichTextSchema.text("console.log('test');")
                    );
                const validSnippet =
                    testRichTextSchema.nodes.stack_snippet.createChecked(
                        {
                            id: "1234",
                            babel: "true",
                            babelPresetReact: "true",
                            babelPresetTS: "null",
                            console: "true",
                            hide: "false",
                        },
                        langNode
                    );

                const metadata = getSnippetMetadata(validSnippet);

                expect(metadata.id).toBe("1234");
            });

            it.each(validSnippetRenderCases)(
                "should parse language blocks correctly",
                (markdown: string, langs: string[]) => {
                    const validSnippet = parseSnippetBlockForProsemirror(
                        testRichTextSchema,
                        markdown
                    );

                    const metadata = getSnippetMetadata(validSnippet);

                    expect(metadata.langNodes).toHaveLength(langs.length);

                    for (const lang of langs) {
                        const [langNode] = metadata.langNodes.filter(
                            (l) => l.metaData.language == lang
                        );
                        expect(langNode).toBeDefined();
                        expect(langNode.content).toBeDefined();
                    }
                }
            );
        });

        describe("mapMetaLine", () => {
            it("should map a valid end line", () => {
                expect(mapMetaLine({ line: validEnd, index: 4 })).toStrictEqual(
                    {
                        type: "end",
                        index: 4,
                    }
                );
            });

            it("should map a valid start line", () => {
                const startLine = configureBegin(
                    true,
                    false,
                    null,
                    true,
                    false
                );

                expect(
                    mapMetaLine({ line: startLine, index: 8 })
                ).toStrictEqual({
                    type: "begin",
                    index: 8,
                    hide: "true",
                    console: "false",
                    babel: "null",
                    babelPresetReact: "true",
                    babelPresetTS: "false",
                });
            });

            it("should map a valid js lang line", () => {
                expect(
                    mapMetaLine({ line: validJs, index: 213 })
                ).toStrictEqual({
                    type: "lang",
                    index: 213,
                    language: "js",
                });
            });

            it("should map a valid html lang line", () => {
                expect(
                    mapMetaLine({ line: validHtml, index: 321 })
                ).toStrictEqual({
                    type: "lang",
                    index: 321,
                    language: "html",
                });
            });

            it("should map a valid css lang line", () => {
                expect(
                    mapMetaLine({ line: validCss, index: 123 })
                ).toStrictEqual({
                    type: "lang",
                    index: 123,
                    language: "css",
                });
            });
        });

        describe("validateMetaLines", () => {
            it("should validate multiple language blocks", () => {
                const metaLines: MetaLine[] = [
                    {
                        type: "begin",
                        index: 1,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "lang", index: 3, language: "js" },
                    { type: "lang", index: 4, language: "html" },
                    { type: "lang", index: 5, language: "css" },
                    { type: "end", index: 7 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBeNull();
                expect(result.valid).toBe(true);
                expect(result.beginIndex).toBe(1);
                expect(result.jsIndex).toBe(3);
                expect(result.htmlIndex).toBe(4);
                expect(result.cssIndex).toBe(5);
                expect(result.endIndex).toBe(7);
            });

            it("should validate a single language block", () => {
                const metaLines: MetaLine[] = [
                    {
                        type: "begin",
                        index: 1,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "lang", index: 4, language: "html" },
                    { type: "end", index: 7 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBeNull();
                expect(result.valid).toBe(true);
                expect(result.beginIndex).toBe(1);
                expect(result.htmlIndex).toBe(4);
                expect(result.endIndex).toBe(7);
            });

            it("should return invalid with no language block", () => {
                const metaLines: MetaLine[] = [
                    {
                        type: "begin",
                        index: 1,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "end", index: 7 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBe("No code block found");
                expect(result.valid).toBe(false);
            });

            it("should not allow duplicate language blocks", () => {
                const metaLines: MetaLine[] = [
                    {
                        type: "begin",
                        index: 1,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "lang", index: 4, language: "html" },
                    { type: "lang", index: 5, language: "html" },
                    { type: "end", index: 7 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBe("Duplicate HTML block");
                expect(result.valid).toBe(false);
            });

            it("should not allow duplicate begin blocks", () => {
                const metaLines: MetaLine[] = [
                    {
                        type: "begin",
                        index: 1,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    {
                        type: "begin",
                        index: 2,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "lang", index: 4, language: "html" },
                    { type: "lang", index: 5, language: "html" },
                    { type: "end", index: 7 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBe("Duplicate Begin block");
                expect(result.valid).toBe(false);
            });

            it("should not allow duplicate end blocks", () => {
                const metaLines: MetaLine[] = [
                    { type: "lang", index: 4, language: "html" },
                    { type: "end", index: 7 },
                    { type: "end", index: 8 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBe("Duplicate End block");
                expect(result.valid).toBe(false);
            });

            it("should clip a valid selection if there are a begin and end block", () => {
                const metaLines: MetaLine[] = [
                    {
                        type: "begin",
                        index: 1,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "lang", index: 4, language: "html" },
                    { type: "end", index: 7 },
                    {
                        type: "begin",
                        index: 8,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "end", index: 9 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBeNull();
                expect(result.valid).toBe(true);
                expect(result.beginIndex).toBe(1);
                expect(result.htmlIndex).toBe(4);
                expect(result.endIndex).toBe(7);
            });

            it("should validate begin comes before end blocks", () => {
                const metaLines: MetaLine[] = [
                    {
                        type: "begin",
                        index: 4,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "lang", index: 3, language: "html" },
                    { type: "end", index: 1 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBe("Start/end not in correct order");
                expect(result.valid).toBe(false);
            });

            it("should validate lang blocks comes after start", () => {
                const metaLines: MetaLine[] = [
                    {
                        type: "begin",
                        index: 2,
                        babel: "true",
                        babelPresetTS: "true",
                        babelPresetReact: "true",
                        hide: "true",
                        console: "true",
                    },
                    { type: "lang", index: 1, language: "html" },
                    { type: "end", index: 5 },
                ];

                const result = validateMetaLines(metaLines);

                expect(result.reason).toBe(
                    "Language blocks not within begin/end blocks"
                );
                expect(result.valid).toBe(false);
            });
        });
    });

    describe("paste functionality", () => {
        beforeAll(setupPasteSupport);
        afterAll(cleanupPasteSupport);

        const baseState = EditorState.create({
            schema: testRichTextSchema,
            plugins: [stackSnippetPasteHandler],
        });

        it("should do nothing if currently selecting a code block", () => {
            let state = baseState;
            state = state.apply(
                state.tr.replaceRangeWith(
                    0,
                    state.doc.nodeSize - 2,
                    state.schema.nodes.code_block.createChecked()
                )
            );
            const view = createView(state);

            dispatchPasteEvent(view.dom, {
                "text/plain": validBegin + validJs + validEnd,
            });

            const insertedNode = view.state.selection.$from.parent;

            //Prove we didn't insert any new top-level nodes
            expect(view.state.doc.firstChild.eq(view.state.doc.lastChild)).toBe(
                true
            );
            expect(insertedNode.isTextblock).toBe(true);
            expect(insertedNode.textContent).toBe(
                validBegin + validJs + validEnd
            );
        });

        it.each(validSnippetRenderCases)(
            "should render the pasted code as a stack_snippet node",
            (markdown: string, langs: string[]) => {
                const view = new EditorView(document.createElement("div"), {
                    state: baseState,
                    nodeViews: {
                        stack_snippet: (
                            node: ProseMirrorNode,
                            view: EditorView,
                            getPos: () => number
                        ) => {
                            return new StackSnippetView(node, view, getPos, {
                                renderer: () => Promise.resolve(null),
                                openSnippetsModal: () => {},
                            });
                        },
                    },
                });

                dispatchPasteEvent(view.dom, {
                    "text/plain": markdown,
                });

                //We expect a trailing paragraph on paste
                expect(view.state.doc.lastChild.type.name).toBe("paragraph");
                expect(view.state.doc.lastChild.textContent).toBe("");

                const insertedNode = view.state.doc.firstChild;
                expect(insertedNode.type.name).toBe("stack_snippet");
                expect(insertedNode.childCount).toBe(langs.length);
                for (const child of insertedNode.children) {
                    expect(child.type.name).toBe("stack_snippet_lang");
                    expect(langs).toContain(child.attrs["language"]);
                }
            }
        );
    });

    describe("stackSnippetPlugin (Markdown-it)", () => {});
    describe("StackSnippetView", () => {});
});
