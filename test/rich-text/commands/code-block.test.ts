import { EditorState, Transaction } from "prosemirror-state";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { doc, p, code_block, br } from "prosemirror-test-builder";
import {
    indentCodeBlockLinesCommand,
    toggleCodeBlock,
    unindentCodeBlockLinesCommand,
} from "../../../src/rich-text/commands/code-block";
import { EditorView } from "prosemirror-view";
import { splitCodeBlockAtStartOfDoc } from "../../../src/rich-text/commands";
import {
    applySelection,
    createState,
    executeTransaction,
} from "../test-helpers";

const indentStr = "    ";
const indentionBaseState = `<p>asdf</p><pre><code>in0\n${indentStr}in1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0</code></pre>`;

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
    it("turns an empty paragraph into an empty code block", () => {
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

    it("turns a paragraph with text into a code block (no selection, just cursor)", () => {
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

    it("turns a multi-line code block into a paragraph with hard breaks", () => {
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

    it("turns a paragraph with a hard_break into a multi-line code block", () => {
        // A single paragraph, "abc<break>def"
        const startDoc = doc(p("abc", br(), "def<cursor>"));

        let state = EditorState.create({
            doc: startDoc,
            schema: basicSchema,
        });

        state = applyCommand(toggleCodeBlock(), state);

        // This should yield one codeBlock node with "abc\ndef", and an empty paragraph.
        const expectedDoc = doc(code_block("abc\ndef"), p());

        expect(state.doc.toJSON()).toEqual(expectedDoc.toJSON());
    });
});

describe("indentCodeBlockLinesCommand", () => {
    it("should indent code block line with empty selection at start of line", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            6, // start of first line of code block
            6 // start of first line of code block
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("code_block");

        const { newState, isValid } = executeTransaction(
            state,
            indentCodeBlockLinesCommand
        );

        expect(isValid).toBeTruthy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(11);
        expect(newState.selection.to).toBe(11);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `${indentStr}in0\n${indentStr}in1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });

    it("should indent code block line with empty selection at end of line", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            9, // end of first line of code block
            9 // end of first line of code block
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("code_block");

        const { newState, isValid } = executeTransaction(
            state,
            indentCodeBlockLinesCommand
        );

        expect(isValid).toBeTruthy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(14);
        expect(newState.selection.to).toBe(14);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `${indentStr}in0\n${indentStr}in1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });

    it("should indent code block line when entire line is selected", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            6, // start of first line of code block
            9 // end of first line of code block
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("code_block");

        const { newState, isValid } = executeTransaction(
            state,
            indentCodeBlockLinesCommand
        );

        expect(isValid).toBeTruthy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(11);
        expect(newState.selection.to).toBe(14);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `${indentStr}in0\n${indentStr}in1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });

    it("should indent code block lines when multiple lines are selected", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            6, // start of first line of code block
            18 // middle of third line of code block
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("code_block");

        const { newState, isValid } = executeTransaction(
            state,
            indentCodeBlockLinesCommand
        );

        expect(isValid).toBeTruthy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(11);
        expect(newState.selection.to).toBe(31);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `${indentStr}in0\n${indentStr}${indentStr}in1\n${indentStr}${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });

    it("shouldn't indent code block lines when selection is outside of the code block", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            0, // start of paragraph
            3 // end of paragraph
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("paragraph");

        const { newState, isValid } = executeTransaction(
            state,
            indentCodeBlockLinesCommand
        );

        expect(isValid).toBeFalsy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(1);
        expect(newState.selection.to).toBe(4);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `in0\n${indentStr}in1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });
});

describe("unindentCodeBlockLinesCommand", () => {
    it("should unindent indented code block line with empty selection at start of line", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            10, // start of second line of code block
            10 // start of second line of code block
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("code_block");

        const { newState, isValid } = executeTransaction(
            state,
            unindentCodeBlockLinesCommand
        );

        expect(isValid).toBeTruthy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(7);
        expect(newState.selection.to).toBe(7);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `in0\nin1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });

    it("should unindent indented code block line with empty selection at end of line", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            14, // end of second line of code block
            14 // end of second line of code block
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("code_block");

        const { newState, isValid } = executeTransaction(
            state,
            unindentCodeBlockLinesCommand
        );

        expect(isValid).toBeTruthy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(11);
        expect(newState.selection.to).toBe(11);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `in0\nin1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });

    it("should unindent indented code block line when entire line is selected", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            10, // end of second line of code block
            14 // end of second line of code block
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("code_block");

        const { newState, isValid } = executeTransaction(
            state,
            unindentCodeBlockLinesCommand
        );

        expect(isValid).toBeTruthy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(7);
        expect(newState.selection.to).toBe(11);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `in0\nin1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });

    it("should unindent indented code block lines when multiple lines are selected", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            6, // start of first line of code block
            18 // middle of third line of code block
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("code_block");

        const { newState, isValid } = executeTransaction(
            state,
            unindentCodeBlockLinesCommand
        );

        expect(isValid).toBeTruthy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(3);
        expect(newState.selection.to).toBe(11);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `in0\nin1\n${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });

    it("shouldn't unindent indented code block lines when selection is outside of the code block", () => {
        const state = applySelection(
            createState(indentionBaseState, []),
            0, // start of paragraph
            3 // end of paragraph
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("paragraph");

        const { newState, isValid } = executeTransaction(
            state,
            unindentCodeBlockLinesCommand
        );

        expect(isValid).toBeFalsy();
        // Test for expected new selection
        expect(newState.selection.from).toBe(1);
        expect(newState.selection.to).toBe(4);

        expect(newState.doc).toMatchNodeTree({
            "type.name": "doc",
            "content": [
                {
                    "type.name": "paragraph",
                    "childCount": 1,
                    "content": [
                        {
                            text: "asdf",
                        },
                    ],
                },
                {
                    "type.name": "code_block",
                    "childCount": 1,
                    "content": [
                        {
                            text: `in0\n${indentStr}in1\n${indentStr}${indentStr}in2\n${indentStr}${indentStr}in3\n\n${indentStr}in1\nin0`,
                        },
                    ],
                },
            ],
        });
    });
});

describe("splitCodeBlockAtStartOfDoc", () => {
    it("splits if the code block is first in the doc and the selection is at offset 0", () => {
        // A doc where the *very first* node is a code block with text "Some code".
        const state = createState("<pre><code>Some code</code></pre>", []);

        // We want to place the cursor at the very start of the code block.
        const selectionAtStart = applySelection(state, 0, 0);

        const { newState, isValid } = executeTransaction(
            selectionAtStart,
            splitCodeBlockAtStartOfDoc
        );

        // Because it's the first child + offset 0 in code_block, the command should handle it:
        expect(isValid).toBe(true);

        // The doc should now have an empty paragraph inserted above the code block.
        expect(newState.doc.childCount).toBe(2);

        // The first node should be an empty paragraph:
        expect(newState.doc.firstChild.type.name).toBe("paragraph");
        expect(newState.doc.firstChild.textContent).toBe("");

        // The second node should be the code block with the original text:
        expect(newState.doc.lastChild.type.name).toBe("code_block");
        expect(newState.doc.lastChild.textContent).toBe("Some code");
    });

    it("returns false if selection is NOT at offset 0 (even if code block is first)", () => {
        // Same doc as above - code block is first child.
        const state = createState("<pre><code>Some code</code></pre>", []);

        // Place the cursor in the middle of the code block this time.
        const selectionInMiddle = applySelection(state, 5, 5);

        const { newState, isValid } = executeTransaction(
            selectionInMiddle,
            splitCodeBlockAtStartOfDoc
        );

        // Should not handle it:
        expect(isValid).toBe(false);
        // Doc should remain unchanged.
        expect(newState.doc.toString()).toEqual(state.doc.toString());
    });

    it("returns false if the code block is NOT the first child in the doc", () => {
        // A doc with a paragraph first, THEN a code block.
        const state = createState(
            "<p>Intro</p><pre><code>Some code</code></pre>",
            []
        );

        // Even if we place the cursor at offset 0 of the code block, it’s not the doc’s first child.
        const selectionAtStartOfBlock = applySelection(state, 7, 7);

        // First, verify that this test is actually valid - we want to be in the code_block at offset 0.
        const sel = selectionAtStartOfBlock.selection;
        expect(sel.$from.parent.type.name).toBe("code_block");
        expect(sel.$from.parentOffset).toBe(0);

        const { newState, isValid } = executeTransaction(
            selectionAtStartOfBlock,
            splitCodeBlockAtStartOfDoc
        );

        // Should not handle it because the code block isn’t the doc's first node:
        expect(isValid).toBe(false);
        expect(newState.doc.toString()).toEqual(state.doc.toString());
    });

    it("returns false if the parent node is not a code_block", () => {
        // If the first node in the doc is a paragraph instead.
        const state = createState("<p>First paragraph</p>", []);
        // Cursor at the start of that paragraph
        const selectionInParagraph = applySelection(state, 0, 0);

        const { newState, isValid } = executeTransaction(
            selectionInParagraph,
            splitCodeBlockAtStartOfDoc
        );

        // Not a code block, so do nothing:
        expect(isValid).toBe(false);
        expect(newState.doc.toString()).toEqual(state.doc.toString());
    });
});
