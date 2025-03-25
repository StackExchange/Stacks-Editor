import {
    cleanupPasteSupport,
    createView,
    dispatchPasteEvent,
    setupPasteSupport,
} from "../../../test/rich-text/test-helpers";
import { EditorState } from "prosemirror-state";
import { stackSnippetPasteHandler } from "../src/paste-handler";
import {
    buildSnippetSchema,
    validBegin,
    validEnd,
    validJs,
    validSnippetRenderCases,
} from "./stack-snippet-helpers";
import { EditorView } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { StackSnippetView } from "../src/snippet-view";

describe("paste functionality", () => {
    beforeAll(setupPasteSupport);
    afterAll(cleanupPasteSupport);

    const baseState = EditorState.create({
        schema: buildSnippetSchema(),
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
        expect(insertedNode.textContent).toBe(validBegin + validJs + validEnd);
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
