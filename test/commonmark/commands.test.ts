import { CodeStringParser } from "../../src/shared/schema";
import { EditorState, TextSelection } from "prosemirror-state";
import { commonmarkSchema } from "../../src/commonmark/schema";
import * as commands from "../../src/commonmark/commands";
import { MenuCommand } from "../../src/shared/menu";
import { getSelectedText } from "../test-helpers";

/**
 * Creates a state with the content optionally selected if selectFrom/To are passed
 * @param content the document content
 * @param selectFrom string index to select from
 * @param selectTo string index to select to
 */
function createState(
    content: string,
    selectFrom?: number,
    selectTo?: number
): EditorState {
    const doc =
        CodeStringParser.fromSchema(commonmarkSchema).parseCode(content);
    let selection: TextSelection = undefined;

    if (typeof selectFrom !== "undefined") {
        // if selectTo not set, then this is not a selection, but a cursor position
        if (typeof selectTo === "undefined") {
            selectTo = selectFrom;
        }

        // document vs string offset is different, adjust
        selectFrom = selectFrom + 1;
        selectTo = selectTo + 1;
        selection = TextSelection.create(doc, selectFrom, selectTo);
    }

    return EditorState.create({
        doc: doc,
        schema: commonmarkSchema,
        selection: selection,
    });
}

/**
 * Creates a state with all the content selected
 */
function createSelectedState(content: string) {
    const selectFrom = 0;
    const selectTo = content.length;

    return createState(content, selectFrom, selectTo);
}

/**
 * Applies a command to the state and expects the entire doc to resemble
 * `expected` and the selected text to resemble `expectedSelected`
 */
function expectTransactionSuccess(
    state: EditorState,
    command: MenuCommand,
    expected: string,
    expectedSelected: string
) {
    let newState = state;

    const isValid = command(state, (t) => {
        newState = state.apply(t);
    });

    expect(isValid).toBeTruthy();

    expect(newState.doc.textContent).toEqual(expected);

    // if no text is passed to check for selection,
    // assume the test implies that the selection is empty
    if (!expectedSelected) {
        expect(newState.selection.empty).toBeTruthy();
    } else {
        const selectedText = getSelectedText(newState);

        expect(selectedText).toEqual(expectedSelected);
    }
}

declare global {
    // Disable eslint warning, this is what the docs say to do
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            transactionSuccess(
                command: MenuCommand,
                expected: string,
                expectedSelected: string
            ): R;
        }
    }
}

expect.extend({
    transactionSuccess(
        state: EditorState,
        command: MenuCommand,
        expected: string,
        expectedSelected: string
    ) {
        expectTransactionSuccess(state, command, expected, expectedSelected);
        return {
            message: () => "",
            pass: true,
        };
    },
});

describe("commonmark editor commands", () => {
    // Gotta test the test
    it("should prep correctly", () => {
        const content = "this is a\ntest";

        // check the "select all text" version
        let state = createSelectedState(content);
        let selectedText = getSelectedText(state);
        expect(selectedText).toEqual(content);

        // check the "select some text" version
        state = createState(content, 0, 4);
        selectedText = getSelectedText(state);
        expect(selectedText).toEqual(content.slice(0, 4));

        // check the "select no text" version
        state = createState(content);
        expect(state.selection.empty).toBeTruthy();
    });

    describe("wrapInCommand", () => {
        it("should wrap in character", () => {
            const content = "some text";
            const result = "**some text**";

            const state = createSelectedState(content);

            expect(state).transactionSuccess(
                commands.wrapInCommand("**"),
                result,
                result
            );
        });

        it("should unwrap character", () => {
            const content = "**some text**";
            const result = "some text";

            const state = createSelectedState(content);

            expect(state).transactionSuccess(
                commands.wrapInCommand("**"),
                result,
                result
            );
        });

        it("should inject character", () => {
            const state = createState("");

            expect(state).transactionSuccess(
                commands.wrapInCommand("**"),
                "**your text**",
                "your text"
            );
        });
    });

    describe("blockWrapInCommand", () => {
        it("should wrap single line in block characters", () => {
            const content = "some text";
            const expectedSelection = `\`\`\`
some text
\`\`\``;
            const expectedContent = "\n" + expectedSelection;

            const state = createSelectedState(content);

            expect(state).transactionSuccess(
                commands.blockWrapInCommand("```"),
                expectedContent,
                expectedSelection
            );
        });

        it("should unwrap block", () => {
            const content = `\`\`\`
some text
\`\`\``;
            const expectedContent = "some text";

            const state = createSelectedState(content);

            expect(state).transactionSuccess(
                commands.blockWrapInCommand("```"),
                expectedContent,
                expectedContent
            );
        });

        it("should insert if selection is empty", () => {
            const content = "some text";
            const expectedSelection = "type here";
            const expectedContent = `
\`\`\`
type here
\`\`\`
some text`;

            const state = createState(content, 0, 0);

            expect(state).transactionSuccess(
                commands.blockWrapInCommand("```"),
                expectedContent,
                expectedSelection
            );
        });
    });

    describe("insertRawTextCommand", () => {
        it("should insert raw text and select", () => {
            const state = createState("test");
            const command = commands.insertRawTextCommand(
                "this is some new text",
                13,
                16
            );

            expect(state).transactionSuccess(
                command,
                "this is some new texttest",
                "new"
            );
        });

        it("should insert raw text and not select", () => {
            const state = createState("test");
            const command = commands.insertRawTextCommand(
                "this is some new text"
            );

            expect(state).transactionSuccess(
                command,
                "this is some new texttest",
                null
            );
        });

        it("should replace existing text", () => {
            const state = createState("test REPLACE text", 5, 12);
            const command = commands.insertRawTextCommand("INSERTED");

            expect(state).transactionSuccess(
                command,
                "test INSERTED text",
                null
            );
        });
    });

    describe("setBlockTypeCommand", () => {
        /* SET */
        describe("should set from no block type", () => {
            it("single line, cursor at start of line", () => {
                const state = createState("test");
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "> test", null);
            });

            it("single line, cursor at arbitrary position", () => {
                const state = createState("test", 2);
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "> test", null);
            });

            it("multi line, cursor at start of line", () => {
                const state = createState(
                    "test\nthis is a test\nuntouched line",
                    5
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "test\n> this is a test\nuntouched line",
                    null
                );
            });

            it("multi line, cursor at arbitrary position", () => {
                const state = createState(
                    "test\nthis is a test\nuntouched line",
                    10
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "test\n> this is a test\nuntouched line",
                    null
                );
            });

            it("single line, arbitrary selection", () => {
                const state = createState("test", 2, 4);
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "> test", null);
            });

            it("multi line, arbitrary selection spanning multiple lines, insert newline", () => {
                const state = createState(
                    "test\n\nthis is a test\nuntouched line",
                    2,
                    10
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "te\n> st\n> \n> this is a test\nuntouched line",
                    "> st\n> \n> this"
                );
            });

            it("multi line, arbitrary selection spanning multiple lines, don't insert newline", () => {
                const state = createState(
                    "test\n\nthis is a test\nuntouched line",
                    0,
                    10
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "> test\n> \n> this is a test\nuntouched line",
                    "> test\n> \n> this"
                );
            });

            it("multi line, arbitrary selection spanning multiple lines, partial exists", () => {
                const state = createState(
                    "test\n> \nthis is a test\nuntouched line",
                    2,
                    12
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "te\n> st\n> \n> this is a test\nuntouched line",
                    "> st\n> \n> this"
                );
            });

            it("multi line, arbitrary selection spanning multiple lines, partial exists + swap", () => {
                const state = createState(
                    "test\n# \nthis is a test\nuntouched line",
                    2,
                    12
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "te\n> st\n> \n> this is a test\nuntouched line",
                    "> st\n> \n> this"
                );
            });
        });

        /* UNSET */
        describe("should unset same block type", () => {
            it("single line, cursor at start of line", () => {
                const state = createState("> test");
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "test", null);
            });

            it("single line, cursor at arbitrary position", () => {
                const state = createState("> test", 3);
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "test", null);
            });

            it("multi line, cursor at start of line", () => {
                const state = createState(
                    "test\n> this is a test\nuntouched line",
                    5
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "test\nthis is a test\nuntouched line",
                    null
                );
            });

            it("multi line, cursor at arbitrary position", () => {
                const state = createState(
                    "test\n> this is a test\nuntouched line",
                    10
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "test\nthis is a test\nuntouched line",
                    null
                );
            });

            it("single line, arbitrary selection", () => {
                const state = createState("> test", 2, 4);
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "test", "te");
            });

            it("multi line, arbitrary selection spanning multiple lines", () => {
                const state = createState(
                    "test\n> \n> this is a test\nuntouched line",
                    5,
                    12
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "test\n\nthis is a test\nuntouched line",
                    "\nth"
                );
            });
        });

        /* SWAP */
        describe("should swap other block type", () => {
            it("single line, cursor at start of line", () => {
                const state = createState("# test");
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "> test", null);
            });

            it("single line, cursor at arbitrary position", () => {
                const state = createState("# test", 2);
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "> test", null);
            });

            it("multi line, cursor at start of line", () => {
                const state = createState(
                    "test\n# this is a test\nuntouched line",
                    5
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "test\n> this is a test\nuntouched line",
                    null
                );
            });

            it("multi line, cursor at arbitrary position", () => {
                const state = createState(
                    "test\n# this is a test\nuntouched line",
                    10
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "test\n> this is a test\nuntouched line",
                    null
                );
            });

            it("single line, arbitrary selection", () => {
                const state = createState("# test", 2, 4);
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(command, "> test", null);
            });

            it("multi line, arbitrary selection spanning multiple lines", () => {
                const state = createState(
                    "te\n# st\n# \n# this is a test\nuntouched line",
                    3,
                    17
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "te\n> st\n> \n> this is a test\nuntouched line",
                    "> st\n> \n> this"
                );
            });

            it("multi line, arbitrary selection spanning multiple lines, partial exists", () => {
                const state = createState(
                    "te\n# st\n> \n# this is a test\nuntouched line",
                    3,
                    17
                );
                const command = commands.setBlockTypeCommand(">");

                expect(state).transactionSuccess(
                    command,
                    "te\n> st\n> \n> this is a test\nuntouched line",
                    "> st\n> \n> this"
                );
            });
        });
    });

    describe("matchLeadingBlockCharacters", () => {
        it("return no leading characters", () => {
            const command = commands.matchLeadingBlockCharacters(
                "42 shouldn't be returned"
            );

            expect(command).toBe("");
        });

        it("return ordered list leading characters", () => {
            let command = commands.matchLeadingBlockCharacters("23. -ol item");

            expect(command).toBe("23. ");

            command = commands.matchLeadingBlockCharacters("23) -ol item");

            expect(command).toBe("23) ");
        });

        it("return unordered list leading characters", () => {
            const command = commands.matchLeadingBlockCharacters("- 1 ul item");

            expect(command).toBe("- ");
        });

        it("return heading leading characters", () => {
            const command =
                commands.matchLeadingBlockCharacters("## Heading level 2");

            expect(command).toBe("## ");
        });
    });
});
