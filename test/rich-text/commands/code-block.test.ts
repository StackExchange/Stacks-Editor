import { EditorState, Transaction } from "prosemirror-state";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { doc, p, code_block, br } from "prosemirror-test-builder";
import { toggleCodeBlock } from "../../../src/rich-text/commands/code-block";
import { EditorView } from "prosemirror-view";

type Command = (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView
) => boolean;

function applyCommand(command: Command, state: EditorState): EditorState {
    let newState = state;
    command(state, (tr: Transaction) => {
        newState = state.apply(tr);
    });
    return newState;
}

describe("toggleCodeBlock command", () => {
    test("turns an empty paragraph into an empty code block", () => {
        // Start with a doc of one empty paragraph, cursor inside it
        const startDoc = doc(p("<cursor>"));

        let state = EditorState.create({
            doc: startDoc,
            schema: basicSchema,
        });

        // Apply the command
        state = applyCommand(toggleCodeBlock(), state);

        // The resulting doc should be just a codeBlock node (empty), with a new paragraph after it.
        const expectedDoc = doc(code_block(), p());

        expect(state.doc.toJSON()).toEqual(expectedDoc.toJSON());
    });

    test("turns a paragraph with text into a code block (no selection, just cursor)", () => {
        // Start: paragraph with text, cursor in the middle
        const startDoc = doc(p("ab<cursor>cd"));

        let state = EditorState.create({
            doc: startDoc,
            schema: basicSchema,
        });

        state = applyCommand(toggleCodeBlock(), state);

        // The entire paragraph block should become a single codeBlock node.
        // The text is "abcd". The command merges it into one line (since there's
        // only one block, no line breaks).
        const expectedDoc = doc(code_block("abcd"), p());

        expect(state.doc.toJSON()).toEqual(expectedDoc.toJSON());
    });

    test("turns a multi-line code block into a paragraph with hard breaks", () => {
        // A codeBlock with two lines: "abc\ndef"
        // We'll put the cursor anywhere in that block.
        const startDoc = doc(code_block("abc\ndef<cursor>"));

        let state = EditorState.create({
            doc: startDoc,
            schema: basicSchema,
        });

        state = applyCommand(toggleCodeBlock(), state);

        // We should get a single paragraph with "abc", then a hard_break, then "def".
        // Using test-builder, we can represent a hard break with `br()`.
        const expectedDoc = doc(p("abc", br(), "def"));

        expect(state.doc.toJSON()).toEqual(expectedDoc.toJSON());
    });

    test("turns a paragraph with a hard_break into a multi-line code block", () => {
        // A single paragraph, "abc<break>def"
        const startDoc = doc(p("abc", br(), "def<cursor>"));

        let state = EditorState.create({
            doc: startDoc,
            schema: basicSchema,
        });

        state = applyCommand(toggleCodeBlock(), state);

        // This should yield one codeBlock node with "abc\ndef".
        const expectedDoc = doc(code_block("abc\ndef"), p());

        expect(state.doc.toJSON()).toEqual(expectedDoc.toJSON());
    });
});
