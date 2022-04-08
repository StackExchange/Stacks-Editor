import { EditorState } from "prosemirror-state";
import { MenuBlock } from "../../builder/types";
import {
    makeMenuDropdown,
    dropdownSection,
    dropdownItem,
    makeMenuIcon,
} from "../../shared/menu";
import {
    inTable,
    removeColumnCommand,
    insertTableColumnBeforeCommand,
    insertTableColumnAfterCommand,
    removeRowCommand,
    insertTableRowBeforeCommand,
    insertTableRowAfterCommand,
    insertTableCommand,
} from "./commands-richtext";

export function generateTablesMenu(): MenuBlock[] {
    return [
        {
            name: "area2",
            entries: [
                {
                    key: "insertTable",
                    command: insertTableCommand,
                    dom: makeMenuIcon("Table", "Table", "insert-table-btn"),
                    visible: (state: EditorState) => !inTable(state.selection),
                },
                makeMenuDropdown(
                    "Table",
                    "Edit table",
                    "table-dropdown",
                    (state: EditorState) => inTable(state.selection),

                    dropdownSection("Column", "columnSection"),
                    dropdownItem(
                        "Remove column",
                        removeColumnCommand,
                        "remove-column-btn"
                    ),
                    dropdownItem(
                        "Insert column before",
                        insertTableColumnBeforeCommand,
                        "insert-column-before-btn"
                    ),
                    dropdownItem(
                        "Insert column after",
                        insertTableColumnAfterCommand,
                        "insert-column-after-btn"
                    ),

                    dropdownSection("Row", "rowSection"),
                    dropdownItem(
                        "Remove row",
                        removeRowCommand,
                        "remove-row-btn"
                    ),
                    dropdownItem(
                        "Insert row before",
                        insertTableRowBeforeCommand,
                        "insert-row-before-btn"
                    ),
                    dropdownItem(
                        "Insert row after",
                        insertTableRowAfterCommand,
                        "insert-row-after-btn"
                    )
                ),
            ],
        },
    ];
}
