import { EditorState } from "prosemirror-state";
import { SnippetMetadata, StackSnippetOptions } from "../src/common";
import { openSnippetModal } from "../src/commands";
import { createState } from "../../../../test/rich-text/test-helpers";
import {
    buildSnippetSchema,
    validSnippetRenderCases,
} from "./stack-snippet-helpers";
import { parseSnippetBlockForProsemirror } from "../src/paste-handler";

describe("commands", () => {
    const schema = buildSnippetSchema();

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
