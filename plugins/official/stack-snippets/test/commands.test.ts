import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { SnippetMetadata, StackSnippetOptions } from "../src/common";
import { openSnippetModalCommand } from "../src/commands";
import { RichTextHelpers } from "../../../../test";
import {
    buildSnippetSchema,
    snippetExternalProvider,
    validBegin,
    validEnd,
    validJs,
    validSnippetRenderCases,
} from "./stack-snippet-helpers";
import { parseSnippetBlockForProsemirror } from "../src/paste-handler";
import { RichTextEditor } from "../../../../src";
import { stackSnippetPlugin as markdownPlugin } from "../src/schema";
import MarkdownIt from "markdown-it";

describe("commands", () => {
    const schema = buildSnippetSchema();
    function richView(markdownInput: string, opts?: StackSnippetOptions) {
        return new RichTextEditor(
            document.createElement("div"),
            markdownInput,
            snippetExternalProvider(opts),
            {}
        );
    }

    const whenOpenSnippetCommandCalled = (
        state: EditorState,
        shouldMatchCall: (
            meta?: SnippetMetadata,
            js?: string,
            css?: string,
            html?: string
        ) => boolean
    ): boolean => {
        let captureMeta: SnippetMetadata = null;
        let captureJs: string = null;
        let captureCss: string = null;
        let captureHtml: string = null;
        const snippetOptions: StackSnippetOptions = {
            renderer: () => Promise.resolve(null),
            openSnippetsModal: (_, meta, js, css, html) => {
                captureMeta = meta;
                captureJs = js;
                captureCss = css;
                captureHtml = html;
            },
        };
        const ret = openSnippetModalCommand(snippetOptions)(state, () => {});

        //The openModal command is always handled when called with dispatch
        expect(ret).toBe(true);
        expect(
            shouldMatchCall(captureMeta, captureJs, captureCss, captureHtml)
        ).toBe(true);

        //Essentially the expects will mean this is terminated before now.
        // We can now expect on this guy to get rid of the linting errors
        return true;
    };

    describe("dispatch", () => {
        it("should do nothing if dispatch null", () => {
            const snippetOptions: StackSnippetOptions = {
                renderer: () => Promise.resolve(null),
                openSnippetsModal: () => {},
            };
            const state = RichTextHelpers.createState(
                "Here's a paragraph -  a text block mind you",
                []
            );

            const command = openSnippetModalCommand(snippetOptions);

            const ret = command(state, null);

            expect(ret).toBe(true);
        });

        it("should send openModal with blank arguments if no snippet detected", () => {
            const state = RichTextHelpers.createState(
                "Here's a paragraph -  a text block mind you",
                []
            );

            expect(
                whenOpenSnippetCommandCalled(state, (meta, js, css, html) => {
                    //Expect a blank modal
                    return !(meta || js || css || html);
                })
            ).toBe(true);
        });

        it.each(validSnippetRenderCases)(
            "should send openModal with arguments if snippet detected",
            (markdown: string, langs: string[]) => {
                //Create a blank doc, then replace the contents (a paragraph node) with the parsed markdown.
                let state = EditorState.create({
                    schema: schema,
                    plugins: [],
                });
                state = state.apply(
                    state.tr.replaceRangeWith(
                        0,
                        state.doc.nodeSize - 2,
                        parseSnippetBlockForProsemirror(schema, markdown)
                    )
                );

                //Anywhere selection position is now meaningfully a part of the stack snippet, so open the modal and expect it to be passed
                expect(
                    whenOpenSnippetCommandCalled(
                        state,
                        (meta, js, css, html) => {
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
                        }
                    )
                ).toBe(true);
            }
        );
    });

    describe("callback", () => {
        const mdit = new MarkdownIt("default", {});
        mdit.use(markdownPlugin);

        const callbackTestCaseJs: string = `<!-- language: lang-js -->

    console.log("callbackTestCase");

`;
        const starterCallbackSnippet = `${validBegin}${callbackTestCaseJs}${validEnd}`;

        it.each(validSnippetRenderCases)(
            "should replace existing snippet when updateDocumentCallback is called with an ID",
            (markdown: string) => {
                //Create a blank doc, then replace the contents (a paragraph node) with the parsed markdown.
                const view = richView(starterCallbackSnippet);

                //Capture the metadata (for the Id) and the callback
                let captureMeta: SnippetMetadata = null;
                let captureCallback: (
                    markdown: string,
                    id: SnippetMetadata["id"]
                ) => void;
                const snippetOptions: StackSnippetOptions = {
                    renderer: () => Promise.resolve(null),
                    openSnippetsModal: (updateDocumentCallback, meta) => {
                        captureMeta = meta;
                        captureCallback = updateDocumentCallback;
                    },
                };
                openSnippetModalCommand(snippetOptions)(
                    view.editorView.state,
                    () => {},
                    view.editorView
                );

                //Call the callback
                captureCallback(markdown, captureMeta.id);

                //Assert that the current view state has been changed
                let matchingNodes: Node[] = [];
                view.editorView.state.doc.descendants((node) => {
                    if (node.type.name == "stack_snippet") {
                        if (node.attrs.id == captureMeta.id) {
                            matchingNodes = [...matchingNodes, node];
                        }
                    }
                });
                expect(matchingNodes).toHaveLength(1);
                //And that we have replaced the content
                expect(matchingNodes[0].textContent).not.toContain(
                    "callbackTestCase"
                );
            }
        );

        it.each(validSnippetRenderCases)(
            "should add snippet when updateDocumentCallback is called without an ID",
            (markdown: string) => {
                //Create a blank doc, then replace the contents (a paragraph node) with the parsed markdown.
                const view = richView("");

                //Capture the metadata (for the Id) and the callback
                let captureCallback: (markdown: string) => void;
                const snippetOptions: StackSnippetOptions = {
                    renderer: () => Promise.resolve(null),
                    openSnippetsModal: (updateDocumentCallback) => {
                        captureCallback = updateDocumentCallback;
                    },
                };
                openSnippetModalCommand(snippetOptions)(
                    view.editorView.state,
                    () => {},
                    view.editorView
                );

                //Call the callback
                captureCallback(markdown);

                //Assert that the current view state now includes a snippet
                let matchingNodes: Node[] = [];
                view.editorView.state.doc.descendants((node) => {
                    if (node.type.name == "stack_snippet") {
                        matchingNodes = [...matchingNodes, node];
                    }
                });
                expect(matchingNodes).toHaveLength(1);
            }
        );
    });

    describe("shortcuts", () => {
        //Stolen eagerly from the Prosemirror-keymap git https://github.com/ProseMirror/prosemirror-keymap/blob/9df35bd441aa60b3ad620da66e0e3f75cd774075/src/keymap.ts#L5
        const mac =
            typeof navigator != "undefined"
                ? /Mac|iP(hone|[oa]d)/.test(navigator.platform)
                : false;

        it("should swallow commands when in a Snippet context", () => {
            const view = richView(`${validBegin}${validJs}${validEnd}`);
            const expectedHTML = view.editorView.dom.innerHTML;
            let event: KeyboardEvent;
            if (mac) {
                event = new KeyboardEvent("keydown", {
                    metaKey: true,
                    key: "Enter",
                });
            } else {
                event = new KeyboardEvent("keydown", {
                    ctrlKey: true,
                    key: "Enter",
                });
            }

            view.editorView.someProp("handleKeyDown", (f) =>
                f(view.editorView, event)
            );

            //The Dom is exactly the same - no change has occured
            expect(view.editorView.dom.innerHTML).toBe(expectedHTML);
        });

        it("should not swallow commands when in a non-Snippet context", () => {
            const view = richView("```javascript\nconsole.log('test');\n```");
            const expectedHTML = view.editorView.dom.innerHTML;
            let event: KeyboardEvent;
            if (mac) {
                event = new KeyboardEvent("keydown", {
                    metaKey: true,
                    key: "Enter",
                });
            } else {
                event = new KeyboardEvent("keydown", {
                    ctrlKey: true,
                    key: "Enter",
                });
            }

            view.editorView.someProp("handleKeyDown", (f) =>
                f(view.editorView, event)
            );

            //The Dom is not the same - a change has occured
            expect(view.editorView.dom.innerHTML).not.toBe(expectedHTML);
        });

        it("should trigger the openModal event when shortcut pressed", () => {
            let openSnippetTriggered = false;
            const view = richView("```javascript\nconsole.log('test');\n```", {
                openSnippetsModal: () => {
                    openSnippetTriggered = true;
                },
                renderer: () => Promise.resolve(null),
            });
            let event: KeyboardEvent;
            if (mac) {
                event = new KeyboardEvent("keydown", {
                    metaKey: true,
                    key: "9",
                });
            } else {
                event = new KeyboardEvent("keydown", {
                    ctrlKey: true,
                    key: "9",
                });
            }

            view.editorView.someProp("handleKeyDown", (f) =>
                f(view.editorView, event)
            );

            expect(openSnippetTriggered).toBe(true);
        });
    });
});
