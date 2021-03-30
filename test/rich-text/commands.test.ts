import { EditorState, TextSelection } from "prosemirror-state";
import { richTextSchema } from "../../src/shared/schema";
import { DOMParser } from "prosemirror-model";
import "../matchers";
import { MenuCommand } from "../../src/shared/menu";
import {
    moveSelectionAfterTableCommand,
    moveSelectionBeforeTableCommand,
    removeRowCommand,
    removeColumnCommand,
    insertTableRowAfterCommand,
    insertTableRowBeforeCommand,
    insertTableColumnAfterCommand,
    insertTableColumnBeforeCommand,
    insertTableCommand,
    moveToNextCellCommand,
    moveToPreviousCellCommand,
} from "../../src/rich-text/commands";

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
    const container = document.createElement("div");
    // NOTE: tests only, no XSS danger
    // eslint-disable-next-line no-unsanitized/property
    container.innerHTML = content;
    const doc = DOMParser.fromSchema(richTextSchema).parse(container);
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
        schema: richTextSchema,
        selection: selection,
    });
}

/**
 * Applies a command to the state and expects it to apply correctly
 */
function runCommand(
    state: EditorState,
    command: MenuCommand,
    expectSuccess = true
) {
    let newState = state;

    const isValid = command(state, (t) => {
        newState = state.apply(t);
    });

    expect(isValid).toBe(expectSuccess);
    return newState;
}

describe("table commands", () => {
    it("should create a table", () => {
        const state = createState(
            "<table><thead><tr><th>asdf</th></tr></thead></table>",
            3
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toEqual("table_header");

        expect(state.doc).toMatchNodeTree({
            "type.name": "doc",
            "childCount": 1,
            "content": [
                {
                    "type.name": "table",
                    "childCount": 1,
                    "content": [
                        {
                            "type.name": "table_head",
                            "childCount": 1,
                            "content": [
                                {
                                    "type.name": "table_row",
                                    "childCount": 1,
                                    "content": [
                                        {
                                            "type.name": "table_header",
                                            "childCount": 1,
                                            "content": [
                                                {
                                                    isText: true,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        expect(1).toBe(1);
    });

    describe("exitTableCommand", () => {
        it("should exit the block, after table", () => {
            let state = createState(
                "<table><thead><tr><th>asdf</th></tr></thead></table>",
                3
            );

            state = runCommand(state, moveSelectionAfterTableCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 2,
                "content": [
                    {
                        "type.name": "table",
                        "childCount": 1,
                    },
                    {
                        "type.name": "paragraph",
                        "childCount": 0,
                    },
                ],
            });
        });

        it("should select newly inserted paragraph. afer table", () => {
            let state = createState(
                "<table><thead><tr><th>asdf</td></th></thead></table>",
                3
            );

            expect(state.selection.$from.node().type.name).toEqual(
                "table_header"
            );

            state = runCommand(state, moveSelectionAfterTableCommand);

            expect(state.selection.$from.node().type.name).toEqual("paragraph");
        });

        it("should exit the block, before table", () => {
            let state = createState(
                "<table><thead><tr><th>asdf</th></tr></thead></table>",
                3
            );

            state = runCommand(state, moveSelectionBeforeTableCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 2,
                "content": [
                    {
                        "type.name": "paragraph",
                        "childCount": 0,
                    },
                    {
                        "type.name": "table",
                        "childCount": 1,
                    },
                ],
            });
        });

        it("should select newly inserted paragraph, before table", () => {
            let state = createState(
                "<table><thead><tr><th>asdf</th></tr></thead></table>",
                3
            );

            expect(state.selection.$from.node().textContent).toEqual("asdf");

            state = runCommand(state, moveSelectionBeforeTableCommand);

            expect(state.selection.$from.node().type.name).toEqual("paragraph");
        });
    });

    describe("insertTableRow command", () => {
        it("should insert a row after the currently selected one", () => {
            let state = createState(
                `<table>
                    <thead><tr><th>X</th></tr></thead>
                    <tbody>
                        <tr>
                            <td tag="td">cell 1</td>
                            <td tag="td">cell 2</td>
                        </tr>
                    </tbody>
                </table>`,
                13
            );

            expect(state.selection.$from.node().textContent).toEqual("cell 1");

            state = runCommand(state, insertTableRowAfterCommand);
            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 1,
                "content": [
                    {
                        "type.name": "table",
                        "content": [
                            {
                                "type.name": "table_head",
                                "childCount": 1,
                            },
                            {
                                "type.name": "table_body",
                                "childCount": 2,
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "cell 1",
                                            },
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "cell 2",
                                            },
                                        ],
                                    },
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "",
                                            },
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("should insert a row before the currently selected one", () => {
            let state = createState(
                "<table><thead><tr><th>X</th></tr></thead><tbody><tr><td>original cell</td></tr></tbody></table>",
                12
            );
            expect(state.selection.$from.node().textContent).toEqual(
                "original cell"
            );

            state = runCommand(state, insertTableRowBeforeCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 1,
                "content": [
                    {
                        "type.name": "table",
                        "content": [
                            {
                                "type.name": "table_head",
                                "childCount": 1,
                            },
                            {
                                "type.name": "table_body",
                                "childCount": 2,
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "childCount": 1,
                                        "textContent": "",
                                    },
                                    {
                                        "type.name": "table_row",
                                        "childCount": 1,
                                        "textContent": "original cell",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("should do nothing when outside of a table", () => {
            let state = createState(
                "<p>some paragraph</p><table><thead><tr><th>original cell</th></tr></thead></table>",
                1
            );

            expect(state.selection.$from.node().type.name).toEqual("paragraph");

            state = runCommand(state, insertTableRowBeforeCommand, false);
        });
    });

    describe("insertTableColumn command", () => {
        it("should insert a column after the currently selected one", () => {
            let state = createState(
                `<table>
                    <thead><tr><th>X</th></tr></thead>
                    <tbody>
                        <tr><td>A</td></tr>
                        <tr><td>B</td></tr>
                    </tbody>
                </table>`,
                11
            );

            expect(state.selection.$from.node().textContent).toEqual("A");

            state = runCommand(state, insertTableColumnAfterCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 1,
                "content": [
                    {
                        "type.name": "table",
                        "content": [
                            {
                                "type.name": "table_head",
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "childCount": 2,
                                    },
                                ],
                            },
                            {
                                "type.name": "table_body",
                                "childCount": 2,
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "A",
                                            },
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "",
                                            },
                                        ],
                                    },
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "B",
                                            },
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("should insert a column before the currently selected one", () => {
            let state = createState(
                `<table>
                    <thead><tr><th>X</th></tr></thead>
                    <tbody>
                        <tr><td>A</td></tr>
                        <tr><td>B</td></tr>
                    </tbody>
                </table>`,
                11
            );

            expect(state.selection.$from.node().textContent).toEqual("A");

            state = runCommand(state, insertTableColumnBeforeCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 1,
                "content": [
                    {
                        "type.name": "table",
                        "content": [
                            {
                                "type.name": "table_head",
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "childCount": 2,
                                    },
                                ],
                            },
                            {
                                "type.name": "table_body",
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "",
                                            },
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "A",
                                            },
                                        ],
                                    },
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "",
                                            },
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "B",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("should do nothing when outside of a table", () => {
            let state = createState(
                "<p>some paragraph</p><table><thead><tr><th>original cell</th></tr></thead></table>",
                1
            );

            expect(state.selection.$from.node().type.name).toEqual("paragraph");

            state = runCommand(state, insertTableColumnAfterCommand, false);
        });
    });

    describe("removeRow command", () => {
        it("should remove currently selected row", () => {
            let state = createState(
                `<table>
                    <thead><tr><th>X</th></tr></thead>
                    <tbody>
                        <tr><td>A</td></tr>
                        <tr><td>B</td></tr>
                    </tbody>
                </table>`,
                11
            );

            expect(state.selection.$from.node().textContent).toEqual("A");

            state = runCommand(state, removeRowCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 1,
                "content": [
                    {
                        "type.name": "table",
                        "content": [
                            {
                                "type.name": "table_head",
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_header",
                                                "textContent": "X",
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                "type.name": "table_body",
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "B",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("should drop entire table when removing the last body row", () => {
            let state = createState(
                `<table><thead><tr><th>X</th></tr></thead><tbody><tr><td>A</td></tr></tbody></table>`,
                11
            );

            expect(state.selection.$from.node().textContent).toEqual("A");

            state = runCommand(state, removeRowCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [{ "type.name": "paragraph" }],
            });
        });
    });

    describe("removeColumn command", () => {
        it("should remove currently selected column", () => {
            let state = createState(
                `<table>
                    <thead><tr><th>X</th><th>Y</th></tr></thead>
                    <tbody>
                        <tr><td>A</td><td>B</td></tr>
                        <tr><td>C</td><td>D</td></tr>
                    </tbody>
                </table>`,
                13
            );

            expect(state.selection.$from.node().textContent).toEqual("A");

            state = runCommand(state, removeColumnCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "childCount": 1,
                "content": [
                    {
                        "type.name": "table",
                        "content": [
                            {
                                "type.name": "table_head",
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_header",
                                                "textContent": "Y",
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                "type.name": "table_body",
                                "content": [
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "B",
                                            },
                                        ],
                                    },
                                    {
                                        "type.name": "table_row",
                                        "content": [
                                            {
                                                "type.name": "table_cell",
                                                "textContent": "D",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("should drop entire table when removing the last column", () => {
            let state = createState(
                `<table><thead><tr><th>A</th></tr></thead></table>`,
                4
            );

            state = runCommand(state, removeColumnCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [{ "type.name": "paragraph" }],
            });
        });
    });

    describe("insertTable command", () => {
        it("should insert table at current position", () => {
            let state = createState(`some text`, 2);
            expect(state.selection.$from.node().type.name).toEqual("paragraph");

            state = runCommand(state, insertTableCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    { "type.name": "paragraph" },
                    {
                        "type.name": "table",
                        "content": [
                            { "type.name": "table_head" },
                            { "type.name": "table_body" },
                        ],
                    },
                    { "type.name": "paragraph" },
                ],
            });
        });

        it("should do nothing when inside a table", () => {
            let state = createState(
                `<table><thead><tr><th>A</th></tr></thead></table>`,
                4
            );

            expect(state.selection.$from.node().type.name).toEqual(
                "table_header"
            );

            const before = state.doc;
            state = runCommand(state, insertTableCommand, false);

            expect(before.nodeSize).toEqual(state.doc.nodeSize);
            expect(state.doc.eq(before)).toBe(true);
        });
    });

    describe("table movement commands", () => {
        it("should move selection into next table cell", () => {
            let state = createState(
                `
            <table>
                <thead>
                    <tr>
                        <th>A</th>
                        <th>B</th>
                    </tr>
                </thead>
            </table>`,
                4
            );
            expect(state.selection.$from.node().textContent).toEqual("A");

            state = runCommand(state, moveToNextCellCommand);

            expect(state.selection.$from.node().textContent).toEqual("B");
        });

        it("should move selection into next table row if at last cell of row", () => {
            let state = createState(
                `
            <table>
                <thead>
                    <tr>
                        <th>X</th>
                        <th>Y</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>A</td>
                        <td>B</td>
                    </tr>
                    <tr>
                        <td>C</td>
                        <td>D</td>
                    </tr>
                </tbody>
            </table>`,
                16
            );
            expect(state.selection.$from.node().textContent).toEqual("B");

            state = runCommand(state, moveToNextCellCommand);

            expect(state.selection.$from.node().textContent).toEqual("C");
        });

        it("should move selection into previous table cell", () => {
            let state = createState(
                `
            <table>
                <thead>
                    <tr>
                        <th>A</th>
                        <th>B</th>
                    </tr>
                </thead>
            </table>`,
                7
            );
            expect(state.selection.$from.node().textContent).toEqual("B");

            state = runCommand(state, moveToPreviousCellCommand);

            expect(state.selection.$from.node().textContent).toEqual("A");
        });

        it("should move selection into previous table row if at first cell of row", () => {
            let state = createState(
                `
            <table>
                <thead>
                    <tr>
                        <th>A</th>
                        <th>B</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>C</td>
                        <td>D</td>
                    </tr>
                </tbody>
            </table>`,
                13
            );
            expect(state.selection.$from.node().textContent).toEqual("C");

            state = runCommand(state, moveToPreviousCellCommand);

            expect(state.selection.$from.node().textContent).toEqual("B");
        });

        it("should do nothing when inside a table", () => {
            let state = createState(
                `<p>some paragraph</p><table><thead><tr><th>A</td></th></thead></table>`,
                4
            );

            expect(state.selection.$from.node().textContent).toEqual(
                "some paragraph"
            );

            state = runCommand(state, moveToNextCellCommand, false);

            expect(state.selection.$from.node().textContent).toEqual(
                "some paragraph"
            );
        });
    });
});
