import { toggleMark, wrapIn, exitCode, baseKeymap } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { undoInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import {
    liftListItem,
    sinkListItem,
    splitListItem,
} from "prosemirror-schema-list";
import type { Plugin } from "prosemirror-state";
import { richTextSchema as schema } from "../shared/schema";
import type { CommonmarkParserFeatures } from "../shared/view";
import {
    insertLinkCommand,
    insertImageCommand,
    insertHorizontalRuleCommand,
    exitBlockCommand,
    removeTableContentCommand,
    moveToNextCellCommand,
    moveToPreviousCellCommand,
    moveSelectionAfterTableCommand,
    insertTableCommand,
    exitInclusiveMarkCommand,
    toggleBlockType,
    cycleThroughHeadings,
} from "./commands";

export function allKeymaps(parserFeatures: CommonmarkParserFeatures): Plugin[] {
    const tableKeymap = keymap({
        "Mod-e": insertTableCommand,
        "Mod-Enter": moveSelectionAfterTableCommand,
        "Shift-Enter": moveSelectionAfterTableCommand,
        "Enter": moveToNextCellCommand,
        "Backspace": removeTableContentCommand,
        "Delete": removeTableContentCommand,
        "Mod-Backspace": removeTableContentCommand,
        "Mod-Delete": removeTableContentCommand,
        "Tab": moveToNextCellCommand,
        "Shift-Tab": moveToPreviousCellCommand,
    });

    const richTextKeymap = keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Mod-Shift-z": redo,
        "Backspace": undoInputRule,
        "Enter": splitListItem(schema.nodes.list_item),
        "Tab": sinkListItem(schema.nodes.list_item),
        "Shift-Tab": liftListItem(schema.nodes.list_item),
        "Mod-Enter": exitBlockCommand,
        "Shift-Enter": exitBlockCommand,
        "Mod-b": toggleMark(schema.marks.strong),
        "Mod-i": toggleMark(schema.marks.em),
        "Mod-l": insertLinkCommand,
        "Ctrl-q": wrapIn(schema.nodes.blockquote),
        "Mod-k": toggleMark(schema.marks.code),
        "Mod-g": insertImageCommand,
        "Ctrl-g": insertImageCommand,
        "Mod-o": wrapIn(schema.nodes.ordered_list),
        "Mod-u": wrapIn(schema.nodes.bullet_list),
        "Mod-h": cycleThroughHeadings(schema.nodes.heading),
        "Mod-r": insertHorizontalRuleCommand,
        "Mod-m": toggleBlockType(schema.nodes.code_block),
        // users expect to be able to leave certain blocks/marks using the arrow keys
        "ArrowRight": exitInclusiveMarkCommand,
        "ArrowDown": exitCode,
    });

    const keymaps = [richTextKeymap, keymap(baseKeymap)];

    if (parserFeatures.tables) {
        keymaps.unshift(tableKeymap);
    }

    return keymaps;
}
