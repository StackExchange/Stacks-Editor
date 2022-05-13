import { EditorState, Transaction } from "prosemirror-state";
import {
    exitInclusiveMarkCommand,
    insertHorizontalRuleCommand,
    toggleBlockType,
} from "../../../src/rich-text/commands";
import { richTextSchema } from "../../../src/rich-text/schema";
import { applySelection, createState } from "../test-helpers";
import "../../matchers";

function getEndOfNode(state: EditorState, nodePos: number) {
    let from = nodePos;
    state.doc.nodesBetween(1, state.doc.content.size, (node, pos) => {
        from = pos + node.nodeSize - 1;
        return true;
    });

    return from;
}

/**
 * Applies a command to the state and expects the entire doc to resemble
 * `expected` and the selected text to resemble `expectedSelected`
 */
function executeTransaction(
    state: EditorState,
    command: (
        state: EditorState,
        dispatch: (tr: Transaction) => void
    ) => boolean
) {
    let newState = state;

    const isValid = command(state, (t) => {
        newState = state.apply(t);
    });

    return { newState, isValid };
}

describe("commands", () => {
    describe("toggleBlockType", () => {
        it.todo("should insert a paragraph at the end of the doc");
        it.todo("should not insert a paragraph at the end of the doc");

        it("should toggle a type off when attributes match", () => {
            const state = applySelection(
                createState("<h1>heading</h1>", []),
                3
            );
            const resolvedNode = state.selection.$from;
            expect(resolvedNode.node().type.name).toBe("heading");

            const { newState, isValid } = executeTransaction(
                state,
                toggleBlockType(richTextSchema.nodes.heading, { level: 1 })
            );

            expect(isValid).toBeTruthy();
            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                    },
                ],
            });
        });

        it("should should toggle a type on and set attributes when the NodeType doesn't match", () => {
            const state = applySelection(
                createState("<p>paragraph</p>", []),
                3
            );
            const resolvedNode = state.selection.$from;
            expect(resolvedNode.node().type.name).toBe("paragraph");

            const { newState, isValid } = executeTransaction(
                state,
                toggleBlockType(richTextSchema.nodes.heading, { level: 1 })
            );

            expect(isValid).toBeTruthy();
            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "heading",
                        "attrs": {
                            level: 1,
                            markup: "",
                        },
                        "childCount": 1,
                    },
                    {
                        "type.name": "paragraph",
                        "childCount": 0,
                    },
                ],
            });
        });

        it("should should toggle a type on and set attributes when the NodeType matches", () => {
            const state = applySelection(
                createState("<h1>heading</h1>", []),
                3
            );
            const resolvedNode = state.selection.$from;
            expect(resolvedNode.node().type.name).toBe("heading");

            const { newState, isValid } = executeTransaction(
                state,
                toggleBlockType(richTextSchema.nodes.heading, { level: 2 })
            );

            expect(isValid).toBeTruthy();
            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "heading",
                        "attrs": {
                            level: 2,
                            markup: "",
                        },
                        "childCount": 1,
                    },
                    {
                        "type.name": "paragraph",
                        "childCount": 0,
                    },
                ],
            });
        });
    });

    describe("insertHorizontalRuleCommand", () => {
        it("should not insert while in a table", () => {
            const state = applySelection(
                createState(
                    "<table><thead><tr><th>asdf</th></tr></thead></table>",
                    []
                ),
                3
            );

            const resolvedNode = state.selection.$from;
            expect(resolvedNode.node().type.name).toBe("table_header");

            const { newState, isValid } = executeTransaction(
                state,
                insertHorizontalRuleCommand
            );

            expect(isValid).toBeFalsy();
            let constainsHr = false;

            newState.doc.nodesBetween(0, newState.doc.content.size, (node) => {
                constainsHr = node.type.name === "horizontal_rule";

                return !constainsHr;
            });

            expect(constainsHr).toBeFalsy();
        });
        it("should add paragraph after when inserted at the end of the doc", () => {
            let state = createState("asdf", []);

            state = applySelection(state, getEndOfNode(state, 1));

            const { newState, isValid } = executeTransaction(
                state,
                insertHorizontalRuleCommand
            );

            expect(isValid).toBeTruthy();

            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                    },
                    {
                        "type.name": "horizontal_rule",
                    },
                    {
                        "type.name": "paragraph",
                        "childCount": 0,
                    },
                ],
            });
        });
        it("should add paragraph before when inserted at the beginning of the doc", () => {
            const state = createState("asdf", []);

            const { newState, isValid } = executeTransaction(
                state,
                insertHorizontalRuleCommand
            );

            expect(isValid).toBeTruthy();

            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "paragraph",
                        "childCount": 0,
                    },
                    {
                        "type.name": "horizontal_rule",
                    },
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                    },
                ],
            });
        });

        it("should add paragraph before and after when inserted into empty doc", () => {
            const state = createState("", []);

            const { newState, isValid } = executeTransaction(
                state,
                insertHorizontalRuleCommand
            );

            expect(isValid).toBeTruthy();

            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "paragraph",
                        "childCount": 0,
                    },
                    {
                        "type.name": "horizontal_rule",
                    },
                    {
                        "type.name": "paragraph",
                        "childCount": 0,
                    },
                ],
            });
        });

        it("should insert without paragraphs when surrounded by other nodes", () => {
            let state = createState("asdf", []);

            state = applySelection(state, 2);

            const { newState, isValid } = executeTransaction(
                state,
                insertHorizontalRuleCommand
            );

            expect(isValid).toBeTruthy();

            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                isText: true,
                                text: "as",
                            },
                        ],
                    },
                    {
                        "type.name": "horizontal_rule",
                    },
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                isText: true,
                                text: "df",
                            },
                        ],
                    },
                ],
            });
        });

        it("should replace selected text", () => {
            let state = createState("asdf", []);

            state = applySelection(state, 2, 3);

            const { newState, isValid } = executeTransaction(
                state,
                insertHorizontalRuleCommand
            );

            expect(isValid).toBeTruthy();

            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                isText: true,
                                text: "as",
                            },
                        ],
                    },
                    {
                        "type.name": "horizontal_rule",
                    },
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                isText: true,
                                text: "f",
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("exitMarkCommand", () => {
        it("all exitable marks should also be inclusive: true", () => {
            Object.keys(richTextSchema.marks).forEach((markName) => {
                const mark = richTextSchema.marks[markName];

                try {
                    // require exitable marks to be explicitly marked as inclusive
                    expect(!mark.spec.exitable || mark.spec.inclusive).toBe(
                        true
                    );
                } catch {
                    // add a custom error message when the test fails
                    throw `${markName} is not both exitable *and* inclusive\ninclusive: ${String(
                        mark.spec.inclusive
                    )}`;
                }
            });
        });

        it.each([
            [`middle of some text`, false],
            [`<em>cannot exit emphasis from anywhere</em>`, true],
            [`<code>cannot exit code from middle</code>`, false],
        ])("should not exit unexitable marks", (input, positionCursorAtEnd) => {
            let state = createState(input, []);

            let from = Math.floor(input.length / 2);

            if (positionCursorAtEnd) {
                from = getEndOfNode(state, 0);
            }

            state = applySelection(state, from);

            expect(exitInclusiveMarkCommand(state, null)).toBe(false);
        });

        it.each([`<code>exit code mark</code>`, `<kbd>exit kbd mark</kbd>`])(
            "should exit exitable marks",
            (input) => {
                let state = createState(input, []);
                const from = getEndOfNode(state, 0);

                state = applySelection(state, from);
                expect(exitInclusiveMarkCommand(state, null)).toBe(true);
            }
        );
    });
});
