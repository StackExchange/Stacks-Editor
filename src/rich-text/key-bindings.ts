import {
    toggleMark,
    wrapIn,
    setBlockType,
    exitCode,
    baseKeymap,
} from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { undoInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import {
    liftListItem,
    sinkListItem,
    splitListItem,
} from "prosemirror-schema-list";
import type { Plugin } from "prosemirror-state";
import { bindLetterKeymap } from "../shared/utils";
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
    indentCodeBlockLinesCommand,
    unindentCodeBlockLinesCommand,
    toggleHeadingLevel,
    toggleTagLinkCommand,
} from "./commands";

export function allKeymaps(
    schema: Schema,
    parserFeatures: CommonmarkParserFeatures
): Plugin[] {
    const codeBlockKeymap = keymap({
        "Tab": indentCodeBlockLinesCommand,
        "Shift-Tab": unindentCodeBlockLinesCommand,
        "Mod-]": indentCodeBlockLinesCommand,
        "Mod-[": unindentCodeBlockLinesCommand,
    });

    const tableKeymap = keymap({
        ...bindLetterKeymap("Mod-e", insertTableCommand),
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
        ...bindLetterKeymap("Mod-z", undo),
        ...bindLetterKeymap("Mod-y", redo),
        ...bindLetterKeymap("Mod-Shift-z", redo),
        "Backspace": undoInputRule,
        "Enter": splitListItem(schema.nodes.list_item),
        "Tab": sinkListItem(schema.nodes.list_item),
        "Shift-Tab": liftListItem(schema.nodes.list_item),
        "Mod-Enter": exitBlockCommand,
        "Shift-Enter": exitBlockCommand,
        ...bindLetterKeymap("Mod-b", toggleMark(schema.marks.strong)),
        ...bindLetterKeymap("Mod-i", toggleMark(schema.marks.em)),
        ...bindLetterKeymap("Mod-l", insertLinkCommand),
        ...bindLetterKeymap("Ctrl-q", wrapIn(schema.nodes.blockquote)),
        ...bindLetterKeymap("Mod-k", toggleMark(schema.marks.code)),
        ...bindLetterKeymap("Mod-g", insertImageCommand),
        ...bindLetterKeymap("Ctrl-g", insertImageCommand),
        ...bindLetterKeymap("Mod-o", wrapIn(schema.nodes.ordered_list)),
        ...bindLetterKeymap("Mod-u", wrapIn(schema.nodes.bullet_list)),
        ...bindLetterKeymap("Mod-h", toggleHeadingLevel()),
        ...bindLetterKeymap("Mod-r", insertHorizontalRuleCommand),
        ...bindLetterKeymap("Mod-m", setBlockType(schema.nodes.code_block)),
        ...bindLetterKeymap(
            "Mod-[",
            toggleTagLinkCommand(parserFeatures.tagLinks.validate, false)
        ),
        ...bindLetterKeymap(
            "Mod-]",
            toggleTagLinkCommand(parserFeatures.tagLinks.validate, true)
        ),
        ...bindLetterKeymap("Mod-/", wrapIn(schema.nodes.spoiler)),
        ...bindLetterKeymap("Mod-,", toggleMark(schema.marks.sub)),
        ...bindLetterKeymap("Mod-.", toggleMark(schema.marks.sup)),
        ...bindLetterKeymap("Mod-'", toggleMark(schema.marks.kbd)),

        // users expect to be able to leave certain blocks/marks using the arrow keys
        "ArrowRight": exitInclusiveMarkCommand,
        "ArrowDown": exitCode,
    });

    const keymaps = [richTextKeymap, keymap(baseKeymap), codeBlockKeymap];

    if (parserFeatures.tables) {
        keymaps.unshift(tableKeymap);
    }

    return keymaps;
}
