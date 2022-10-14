import { redo, undo } from "prosemirror-history";
import {
    boldCommand,
    emphasisCommand,
    inlineCodeCommand,
    indentCommand,
    insertCommonmarkLinkCommand,
    blockquoteCommand,
    insertCommonmarkImageCommand,
    orderedListCommand,
    unorderedListCommand,
    headerCommand,
    insertCommonmarkHorizontalRuleCommand,
    insertCodeblockCommand,
    insertCommonmarkTableCommand,
    selectAllTextCommand,
    insertTagLinkCommand,
    spoilerCommand,
    subCommand,
    supCommand,
    kbdCommand,
} from "./commands";
import type { CommonmarkParserFeatures } from "../shared/view";
import { baseKeymap } from "prosemirror-commands";
import type { Plugin } from "prosemirror-state";
import { caseNormalizeKeymap } from "../shared/prosemirror-plugins/case-normalize-keymap";

export function allKeymaps(parserFeatures: CommonmarkParserFeatures): Plugin[] {
    const commonmarkKeymap = caseNormalizeKeymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Shift-Mod-z": redo,
        "Tab": indentCommand,
        "Shift-Tab": indentCommand,
        "Mod-b": boldCommand,
        "Mod-i": emphasisCommand,
        "Mod-l": insertCommonmarkLinkCommand,
        "Ctrl-q": blockquoteCommand,
        "Mod-k": inlineCodeCommand,
        "Mod-g": insertCommonmarkImageCommand,
        "Ctrl-g": insertCommonmarkImageCommand,
        "Mod-o": orderedListCommand,
        "Mod-u": unorderedListCommand,
        "Mod-h": headerCommand,
        "Mod-r": insertCommonmarkHorizontalRuleCommand,
        "Mod-m": insertCodeblockCommand,
        "Mod-[": insertTagLinkCommand(parserFeatures.tagLinks.validate, false),
        "Mod-]": insertTagLinkCommand(parserFeatures.tagLinks.validate, true),
        "Mod-/": spoilerCommand,
        "Mod-,": subCommand,
        "Mod-.": supCommand,
        "Mod-'": kbdCommand,
        // selectAll selects the outermost node and messes up our other commands
        "Mod-a": selectAllTextCommand,
    });

    const tableKeymap = caseNormalizeKeymap({
        "Mod-e": insertCommonmarkTableCommand,
    });

    const keymaps = [commonmarkKeymap, caseNormalizeKeymap(baseKeymap)];

    if (parserFeatures.tables) {
        keymaps.unshift(tableKeymap);
    }

    return keymaps;
}
