import {
    toggleMark,
    wrapIn,
    setBlockType,
    baseKeymap,
} from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { undoInputRule } from "prosemirror-inputrules";
import { Schema } from "prosemirror-model";
import {
    liftListItem,
    sinkListItem,
    splitListItem,
} from "prosemirror-schema-list";
import type { Plugin } from "prosemirror-state";
import { caseNormalizeKeymap } from "../shared/prosemirror-plugins/case-normalize-keymap";
import type { CommonmarkParserFeatures } from "../shared/view";
import {
    insertRichTextLinkCommand,
    insertRichTextImageCommand,
    insertRichTextHorizontalRuleCommand,
    exitBlockCommand,
    removeTableContentCommand,
    moveToNextCellCommand,
    moveToPreviousCellCommand,
    moveSelectionAfterTableCommand,
    insertRichTextTableCommand,
    indentCodeBlockLinesCommand,
    unindentCodeBlockLinesCommand,
    toggleHeadingLevel,
    toggleTagLinkCommand,
    toggleList,
    splitCodeBlockAtStartOfDoc,
    exitInclusiveMarkCommand,
    escapeUnselectableCommand,
    openCodeBlockLanguagePicker,
} from "./commands";

export function allKeymaps(
    schema: Schema,
    parserFeatures: CommonmarkParserFeatures
): Plugin[] {
    const codeBlockKeymap = caseNormalizeKeymap({
        "Tab": indentCodeBlockLinesCommand,
        "Shift-Tab": unindentCodeBlockLinesCommand,
        "Mod-]": indentCodeBlockLinesCommand,
        "Mod-[": unindentCodeBlockLinesCommand,
        "Enter": splitCodeBlockAtStartOfDoc,
        "Mod-;": openCodeBlockLanguagePicker,
    });

    const tableKeymap = caseNormalizeKeymap({
        "Mod-e": insertRichTextTableCommand,
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

    const richTextKeymap = caseNormalizeKeymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Shift-Mod-z": redo,
        "Backspace": undoInputRule,
        "Enter": splitListItem(schema.nodes.list_item),
        "Tab": sinkListItem(schema.nodes.list_item),
        "Shift-Tab": liftListItem(schema.nodes.list_item),
        "Mod-Enter": exitBlockCommand,
        "Shift-Enter": exitBlockCommand,
        "Mod-b": toggleMark(schema.marks.strong),
        "Mod-i": toggleMark(schema.marks.em),
        "Mod-l": insertRichTextLinkCommand,
        "Ctrl-q": wrapIn(schema.nodes.blockquote),
        "Mod-k": toggleMark(schema.marks.code),
        "Mod-g": insertRichTextImageCommand,
        "Ctrl-g": insertRichTextImageCommand,
        "Mod-o": toggleList(schema.nodes.ordered_list, schema.nodes.list_item),
        "Mod-u": toggleList(schema.nodes.bullet_list, schema.nodes.list_item),
        "Mod-h": toggleHeadingLevel(),
        "Mod-r": insertRichTextHorizontalRuleCommand,
        "Mod-m": setBlockType(schema.nodes.code_block),
        "Mod-[": toggleTagLinkCommand(parserFeatures.tagLinks, false),
        "Mod-]": toggleTagLinkCommand(parserFeatures.tagLinks, true),
        "Mod-/": wrapIn(schema.nodes.spoiler),
        "Mod-,": toggleMark(schema.marks.sub),
        "Mod-.": toggleMark(schema.marks.sup),
        "Mod-'": toggleMark(schema.marks.kbd),
        // exit inline code block using the right arrow key
        "ArrowRight": exitInclusiveMarkCommand,
        "ArrowDown": escapeUnselectableCommand,
    });

    const keymaps = [
        richTextKeymap,
        codeBlockKeymap,
        caseNormalizeKeymap(baseKeymap),
    ];

    if (parserFeatures.tables) {
        keymaps.unshift(tableKeymap);
    }

    return keymaps;
}
