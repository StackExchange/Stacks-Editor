import {
    insertTableColumnAfterCommand,
    insertTableColumnBeforeCommand,
    insertTableCommand,
    insertTableRowAfterCommand,
    insertTableRowBeforeCommand,
    moveSelectionAfterTableCommand,
    moveSelectionBeforeTableCommand,
    moveToNextCellCommand,
    moveToPreviousCellCommand,
    removeColumnCommand,
    removeRowCommand,
} from "../../../src/rich-text/commands";
import "../../matchers";
import { applySelection, createState, runCommand } from "../test-helpers";

describe("table commands", () => {
    it("should create a table", () => {
        const state = applySelection(
            createState(
                "<table><thead><tr><th>asdf</th></tr></thead></table>",
                []
            ),
            3
        );

        const resolvedNode = state.selection.$from;
        expect(resolvedNode.node().type.name).toBe("table_header");

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
            let state = applySelection(
                createState(
                    "<table><thead><tr><th>asdf</th></tr></thead></table>",
                    []
                ),
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
            let state = applySelection(
                createState(
                    "<table><thead><tr><th>asdf</td></th></thead></table>",
                    []
                ),
                3
            );

            expect(state.selection.$from.node().type.name).toBe("table_header");

            state = runCommand(state, moveSelectionAfterTableCommand);

            expect(state.selection.$from.node().type.name).toBe("paragraph");
        });

        it("should exit the block, before table", () => {
            let state = applySelection(
                createState(
                    "<table><thead><tr><th>asdf</th></tr></thead></table>",
                    []
                ),
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
            let state = applySelection(
                createState(
                    "<table><thead><tr><th>asdf</th></tr></thead></table>",
                    []
                ),
                3
            );

            expect(state.selection.$from.node().textContent).toBe("asdf");

            state = runCommand(state, moveSelectionBeforeTableCommand);

            expect(state.selection.$from.node().type.name).toBe("paragraph");
        });
    });

    describe("insertTableRow command", () => {
        it("should insert a row after the currently selected one", () => {
            let state = applySelection(
                createState(
                    `<table>
                    <thead><tr><th>X</th></tr></thead>
                    <tbody>
                        <tr>
                            <td tag="td">cell 1</td>
                            <td tag="td">cell 2</td>
                        </tr>
                    </tbody>
                </table>`,
                    []
                ),
                13
            );

            expect(state.selection.$from.node().textContent).toBe("cell 1");

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
            let state = applySelection(
                createState(
                    "<table><thead><tr><th>X</th></tr></thead><tbody><tr><td>original cell</td></tr></tbody></table>",
                    []
                ),
                12
            );
            expect(state.selection.$from.node().textContent).toBe(
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
            let state = applySelection(
                createState(
                    "<p>some paragraph</p><table><thead><tr><th>original cell</th></tr></thead></table>",
                    []
                ),
                1
            );

            expect(state.selection.$from.node().type.name).toBe("paragraph");

            state = runCommand(state, insertTableRowBeforeCommand, false);
        });
    });

    describe("insertTableColumn command", () => {
        it("should insert a column after the currently selected one", () => {
            let state = applySelection(
                createState(
                    `<table>
                    <thead><tr><th>X</th></tr></thead>
                    <tbody>
                        <tr><td>A</td></tr>
                        <tr><td>B</td></tr>
                    </tbody>
                </table>`,
                    []
                ),
                11
            );

            expect(state.selection.$from.node().textContent).toBe("A");

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
            let state = applySelection(
                createState(
                    `<table>
                    <thead><tr><th>X</th></tr></thead>
                    <tbody>
                        <tr><td>A</td></tr>
                        <tr><td>B</td></tr>
                    </tbody>
                </table>`,
                    []
                ),
                11
            );

            expect(state.selection.$from.node().textContent).toBe("A");

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
            let state = applySelection(
                createState(
                    "<p>some paragraph</p><table><thead><tr><th>original cell</th></tr></thead></table>",
                    []
                ),
                1
            );

            expect(state.selection.$from.node().type.name).toBe("paragraph");

            state = runCommand(state, insertTableColumnAfterCommand, false);
        });
    });

    describe("removeRow command", () => {
        it("should remove currently selected row", () => {
            let state = applySelection(
                createState(
                    `<table>
                    <thead><tr><th>X</th></tr></thead>
                    <tbody>
                        <tr><td>A</td></tr>
                        <tr><td>B</td></tr>
                    </tbody>
                </table>`,
                    []
                ),
                11
            );

            expect(state.selection.$from.node().textContent).toBe("A");

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
            let state = applySelection(
                createState(
                    `<table><thead><tr><th>X</th></tr></thead><tbody><tr><td>A</td></tr></tbody></table>`,
                    []
                ),
                11
            );

            expect(state.selection.$from.node().textContent).toBe("A");

            state = runCommand(state, removeRowCommand);

            expect(state.doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [{ "type.name": "paragraph" }],
            });
        });
    });

    describe("removeColumn command", () => {
        it("should remove currently selected column", () => {
            let state = applySelection(
                createState(
                    `<table>
                    <thead><tr><th>X</th><th>Y</th></tr></thead>
                    <tbody>
                        <tr><td>A</td><td>B</td></tr>
                        <tr><td>C</td><td>D</td></tr>
                    </tbody>
                </table>`,
                    []
                ),
                13
            );

            expect(state.selection.$from.node().textContent).toBe("A");

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
            let state = applySelection(
                createState(
                    `<table><thead><tr><th>A</th></tr></thead></table>`,
                    []
                ),
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
            let state = applySelection(createState(`some text`, []), 2);
            expect(state.selection.$from.node().type.name).toBe("paragraph");

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
            let state = applySelection(
                createState(
                    `<table><thead><tr><th>A</th></tr></thead></table>`,
                    []
                ),
                4
            );

            expect(state.selection.$from.node().type.name).toBe("table_header");

            const before = state.doc;
            state = runCommand(state, insertTableCommand, false);

            expect(before.nodeSize).toEqual(state.doc.nodeSize);
            expect(state.doc.eq(before)).toBe(true);
        });
    });

    describe("table movement commands", () => {
        it("should move selection into next table cell", () => {
            let state = applySelection(
                createState(
                    `
            <table>
                <thead>
                    <tr>
                        <th>A</th>
                        <th>B</th>
                    </tr>
                </thead>
            </table>`,
                    []
                ),
                4
            );
            expect(state.selection.$from.node().textContent).toBe("A");

            state = runCommand(state, moveToNextCellCommand);

            expect(state.selection.$from.node().textContent).toBe("B");
        });

        it("should move selection into next table row if at last cell of row", () => {
            let state = applySelection(
                createState(
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
                    []
                ),
                16
            );
            expect(state.selection.$from.node().textContent).toBe("B");

            state = runCommand(state, moveToNextCellCommand);

            expect(state.selection.$from.node().textContent).toBe("C");
        });

        it("should move selection into previous table cell", () => {
            let state = applySelection(
                createState(
                    `
            <table>
                <thead>
                    <tr>
                        <th>A</th>
                        <th>B</th>
                    </tr>
                </thead>
            </table>`,
                    []
                ),
                7
            );
            expect(state.selection.$from.node().textContent).toBe("B");

            state = runCommand(state, moveToPreviousCellCommand);

            expect(state.selection.$from.node().textContent).toBe("A");
        });

        it("should move selection into previous table row if at first cell of row", () => {
            let state = applySelection(
                createState(
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
                    []
                ),
                13
            );
            expect(state.selection.$from.node().textContent).toBe("C");

            state = runCommand(state, moveToPreviousCellCommand);

            expect(state.selection.$from.node().textContent).toBe("B");
        });

        it("should do nothing when inside a table", () => {
            let state = applySelection(
                createState(
                    `<p>some paragraph</p><table><thead><tr><th>A</td></th></thead></table>`,
                    []
                ),
                4
            );

            expect(state.selection.$from.node().textContent).toBe(
                "some paragraph"
            );

            state = runCommand(state, moveToNextCellCommand, false);

            expect(state.selection.$from.node().textContent).toBe(
                "some paragraph"
            );
        });
    });

    describe("command validity", () => {
        it.todo("should show the table dropdown when inside a table");
        it.todo("should show enable column commands when inside a table");
        it.todo("should show only enable row commands in valid rows");
    });
});
