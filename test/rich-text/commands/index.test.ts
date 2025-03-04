import { EditorState, TextSelection } from "prosemirror-state";
import {
    exitInclusiveMarkCommand,
    insertRichTextHorizontalRuleCommand,
    toggleHeadingLevel,
    toggleTagLinkCommand,
    toggleWrapIn,
} from "../../../src/rich-text/commands";
import {
    applyNodeSelection,
    applySelection,
    createState,
    executeTransaction,
    testRichTextSchema,
} from "../test-helpers";
import { toggleMark } from "prosemirror-commands";
import { MarkType } from "prosemirror-model";

function getEndOfNode(state: EditorState, nodePos: number) {
    let from = nodePos;
    state.doc.nodesBetween(1, state.doc.content.size, (node, pos) => {
        from = pos + node.nodeSize - 1;
        return true;
    });

    return from;
}

describe("commands", () => {
    describe("toggleHeadingLevel", () => {
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
                toggleHeadingLevel({ level: 1 })
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
                toggleHeadingLevel({ level: 1 })
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
                toggleHeadingLevel({ level: 2 })
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

        it("switch heading to next level when no level is passed", () => {
            const state = applySelection(
                createState("<h1>heading</h1>", []),
                3
            );
            const resolvedNode = state.selection.$from;
            expect(resolvedNode.node().type.name).toBe("heading");

            const { newState, isValid } = executeTransaction(
                state,
                toggleHeadingLevel()
            );

            expect(isValid).toBeTruthy();
            expect(newState.doc).toMatchNodeTree({
                content: [
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

        it("should toggle last heading level (h6)", () => {
            const state = applySelection(
                createState("<h6>heading</h6>", []),
                3
            );
            const resolvedNode = state.selection.$from;
            expect(resolvedNode.node().type.name).toBe("heading");

            const { newState, isValid } = executeTransaction(
                state,
                toggleHeadingLevel()
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
    });

    describe("toggleWrapIn", () => {
        it("should apply blockquote within paragraph", () => {
            const state = applySelection(createState("<p>quote</p>", []), 3);
            expect(state.doc).toMatchNodeTreeString("paragraph>text");

            const toggleBlockQuote = toggleWrapIn(
                state.schema.nodes.blockquote
            );
            const { newState, isValid } = executeTransaction(
                state,
                toggleBlockQuote
            );

            expect(isValid).toBeTruthy();
            expect(newState.doc).toMatchNodeTreeString(
                "blockquote>paragraph>text"
            );
        });

        it("should remove blockquote within blockquote", () => {
            const state = applySelection(
                createState("<blockquote>quote</blockquote>", []),
                3
            );
            expect(state.doc).toMatchNodeTreeString(
                "blockquote>paragraph>text"
            );

            const toggleBlockQuote = toggleWrapIn(
                state.schema.nodes.blockquote
            );
            const { newState, isValid } = executeTransaction(
                state,
                toggleBlockQuote
            );

            expect(isValid).toBeTruthy();
            expect(newState.doc).toMatchNodeTreeString("paragraph>text");
        });

        it("should toggle blockquote within list item", () => {
            const state = applySelection(
                createState("<ul><li>list</li></ul>", []),
                3
            );
            const resolvedNode = state.selection.$from;
            // default li child is paragraph
            expect(resolvedNode.node().type.name).toBe("paragraph");

            const toggleBlockQuote = toggleWrapIn(
                state.schema.nodes.blockquote
            );
            const { newState, isValid } = executeTransaction(
                state,
                toggleBlockQuote
            );

            expect(isValid).toBeTruthy();
            expect(newState.doc).toMatchNodeTreeString(
                "bullet_list>list_item>blockquote>paragraph>text"
            );
        });
    });

    describe("insertRichTextHorizontalRuleCommand", () => {
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
                insertRichTextHorizontalRuleCommand
            );

            expect(isValid).toBeFalsy();
            let containsHr = false;

            newState.doc.nodesBetween(0, newState.doc.content.size, (node) => {
                containsHr = node.type.name === "horizontal_rule";

                return !containsHr;
            });

            expect(containsHr).toBeFalsy();
        });
        it("should add paragraph after when inserted at the end of the doc", () => {
            let state = createState("asdf", []);

            state = applySelection(state, getEndOfNode(state, 1));

            const { newState, isValid } = executeTransaction(
                state,
                insertRichTextHorizontalRuleCommand
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
                insertRichTextHorizontalRuleCommand
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
                insertRichTextHorizontalRuleCommand
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
                insertRichTextHorizontalRuleCommand
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
                insertRichTextHorizontalRuleCommand
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

    describe("toggleTagLinkCommand", () => {
        it("should not insert with no text selected", () => {
            const state = createState("", []);

            const { newState, isValid } = executeTransaction(
                state,
                toggleTagLinkCommand(
                    {
                        validate: () => true,
                    },
                    false
                )
            );

            expect(isValid).toBeFalsy();
            let containsTagLink = false;

            newState.doc.nodesBetween(0, newState.doc.content.size, (node) => {
                containsTagLink = node.type.name === "tagLink";

                return !containsTagLink;
            });

            expect(containsTagLink).toBeFalsy();
        });

        it("should not insert when the text fails validation", () => {
            let state = createState("tag with spaces", []);

            state = applySelection(state, 1, 15);

            const { newState, isValid } = executeTransaction(
                state,
                toggleTagLinkCommand(
                    {
                        validate: () => false,
                    },
                    false
                )
            );

            expect(isValid).toBeFalsy();
            let containsTagLink = false;

            newState.doc.nodesBetween(0, newState.doc.content.size, (node) => {
                containsTagLink = node.type.name === "tagLink";

                return !containsTagLink;
            });

            expect(containsTagLink).toBeFalsy();
        });

        it.each([
            [createState("", []).schema.marks.link],
            [createState("", []).schema.marks.code],
        ])(
            "should not insert tag in text node with certain marks",
            (mark: MarkType) => {
                let state = createState("thisIsMyText", []);

                state = applySelection(state, 1, 12);

                const markResult = executeTransaction(state, toggleMark(mark));

                expect(markResult.isValid).toBeTruthy();

                markResult.newState = applySelection(markResult.newState, 2, 6);

                const tagLinkResult = executeTransaction(
                    markResult.newState,
                    toggleTagLinkCommand(
                        {
                            validate: () => true,
                        },
                        false
                    )
                );

                expect(tagLinkResult.isValid).toBeFalsy();

                let containsTagLink = false;
                tagLinkResult.newState.doc.nodesBetween(
                    0,
                    tagLinkResult.newState.doc.content.size,
                    (node) => {
                        containsTagLink = node.type.name === "tagLink";

                        return !containsTagLink;
                    }
                );

                expect(containsTagLink).toBeFalsy();
            }
        );

        it("should replace selected text with tagLink", () => {
            let state = createState("this is my state", []);

            state = applySelection(state, 5, 7); //"is"

            const { newState, isValid } = executeTransaction(
                state,
                toggleTagLinkCommand(
                    {
                        validate: () => true,
                    },
                    false
                )
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
                                text: "this ",
                            },
                            {
                                "type.name": "tagLink",
                            },
                            {
                                isText: true,
                                text: " my state",
                            },
                        ],
                    },
                ],
            });
        });

        it("should untoggle tagLink when selected", () => {
            let state = createState("someText", []);

            state = applySelection(state, 0, 8); // cursor is inside the tag

            const { newState, isValid } = executeTransaction(
                state,
                toggleTagLinkCommand(
                    {
                        validate: () => true,
                    },
                    false
                )
            );

            expect(isValid).toBeTruthy();

            expect(newState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                "type.name": "tagLink",
                            },
                        ],
                    },
                ],
            });

            const nodeSelection = applyNodeSelection(newState, 1);

            const { newState: newerState, isValid: isStillValid } =
                executeTransaction(
                    nodeSelection,
                    toggleTagLinkCommand(
                        {
                            validate: () => true,
                        },
                        false
                    )
                );

            expect(isStillValid).toBeTruthy();

            expect(newerState.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "paragraph",
                        "content": [
                            {
                                isText: true,
                                text: "someText",
                            },
                        ],
                    },
                ],
            });
        });

        it("should disallow meta tags when option is set", () => {
            let state = createState("this is my state", []);

            state = applySelection(state, 5, 7); //"is"

            const { newState, isValid } = executeTransaction(
                state,
                toggleTagLinkCommand(
                    {
                        // disable meta tags entirely
                        disableMetaTags: true,
                        validate: () => {
                            throw "This should never be called!";
                        },
                    },
                    true
                )
            );

            expect(isValid).toBeFalsy();
            let containsTagLink = false;

            newState.doc.nodesBetween(0, newState.doc.content.size, (node) => {
                containsTagLink = node.type.name === "tagLink";

                return !containsTagLink;
            });

            expect(containsTagLink).toBeFalsy();
        });
    });

    describe("wrapInCommand", () => {
        it.each([
            [createState("", []).schema.nodes.spoiler, "spoiler"],
            [createState("", []).schema.nodes.blockquote, "blockquote"],
        ])(
            "should wrap selected node with nodeType",
            (nodeType, nodeTypeText) => {
                let state = createState("asdf", []);

                state = applySelection(state, 0, 4);

                const { newState, isValid } = executeTransaction(
                    state,
                    toggleWrapIn(nodeType)
                );

                expect(isValid).toBeTruthy();

                expect(newState.doc).toMatchNodeTree({
                    "type.name": "doc",
                    "content": [
                        {
                            "type.name": nodeTypeText,
                            "content": [
                                {
                                    "type.name": "paragraph",
                                    "content": [
                                        {
                                            isText: true,
                                            text: "asdf",
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                });
            }
        );
    });

    describe("exitInclusiveMarkCommand", () => {
        it("all exitable marks should also be inclusive: true", () => {
            Object.keys(testRichTextSchema.marks).forEach((markName) => {
                const mark = testRichTextSchema.marks[markName];

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
            [`<sup>cannot exit sup from anywhere</sup>`, true],
            [`<sub>cannot exit sub from anywhere</sub>`, true],
            [`<code>cannot exit code from middle</code>`, false],
            [`<kbd>cannot exit kbd from middle</kbd>`, false],
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

        it("should handle the case when $cursor is null", () => {
            // suppress console.warn
            const consoleWarnSpy = jest
                .spyOn(console, "warn")
                .mockImplementation(() => {});

            let state = createState("this is my state", []);
            state = state.apply(
                state.tr.setSelection(TextSelection.create(state.doc, 0, null))
            );
            expect((<TextSelection>state.selection).$cursor).toBeNull();
            expect(() => exitInclusiveMarkCommand(state, null)).not.toThrow();

            // restore console.warn
            consoleWarnSpy.mockRestore();
        });
    });
});
