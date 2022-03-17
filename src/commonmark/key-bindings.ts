import { keymap } from "prosemirror-keymap";
import { redo, undo } from "prosemirror-history";
import {
    boldCommand,
    emphasisCommand,
    inlineCodeCommand,
    indentCommand,
    insertLinkCommand,
    blockquoteCommand,
    insertImageCommand,
    orderedListCommand,
    unorderedListCommand,
    headerCommand,
    insertHorizontalRuleCommand,
    insertCodeblockCommand,
    insertTableCommand,
    selectAllTextCommand,
} from "./commands";
import type { CommonmarkParserFeatures } from "../shared/view";
import { baseKeymap } from "prosemirror-commands";
import type { Plugin } from "prosemirror-state";

export function allKeymaps(parserFeatures: CommonmarkParserFeatures): Plugin[] {
    const commonmarkKeymap = keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Mod-Shift-z": redo,
        "Tab": indentCommand,
        "Shift-Tab": indentCommand,
        "Mod-b": boldCommand,
        "Mod-i": emphasisCommand,
        "Mod-l": insertLinkCommand,
        "Ctrl-q": blockquoteCommand,
        "Mod-k": inlineCodeCommand,
        "Mod-g": insertImageCommand,
        "Ctrl-g": insertImageCommand,
        "Mod-o": orderedListCommand,
        "Mod-u": unorderedListCommand,
        "Mod-h": headerCommand,
        "Mod-r": insertHorizontalRuleCommand,
        "Mod-m": insertCodeblockCommand,
        // selectAll selects the outermost node and messes up our other commands
        "Mod-a": selectAllTextCommand,
    });

    const tableKeymap = keymap({
        "Mod-e": insertTableCommand,
    });

    const keymaps = [commonmarkKeymap, keymap(baseKeymap)];

    if (parserFeatures.tables) {
        keymaps.unshift(tableKeymap);
    }

    return keymaps;
}
