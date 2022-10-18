import { keymap } from "prosemirror-keymap";
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
import { bindLetterKeymap } from "../shared/utils";

export function allKeymaps(parserFeatures: CommonmarkParserFeatures): Plugin[] {
    const commonmarkKeymap = keymap({
        ...bindLetterKeymap("Mod-z", undo),
        ...bindLetterKeymap("Mod-y", redo),
        ...bindLetterKeymap("Mod-Shift-z", redo),
        "Tab": indentCommand,
        "Shift-Tab": indentCommand,
        ...bindLetterKeymap("Mod-b", boldCommand),
        ...bindLetterKeymap("Mod-i", emphasisCommand),
        ...bindLetterKeymap("Mod-l", insertCommonmarkLinkCommand),
        ...bindLetterKeymap("Ctrl-q", blockquoteCommand),
        ...bindLetterKeymap("Mod-k", inlineCodeCommand),
        ...bindLetterKeymap("Mod-g", insertCommonmarkImageCommand),
        ...bindLetterKeymap("Ctrl-g", insertCommonmarkImageCommand),
        ...bindLetterKeymap("Mod-o", orderedListCommand),
        ...bindLetterKeymap("Mod-u", unorderedListCommand),
        ...bindLetterKeymap("Mod-h", headerCommand),
        ...bindLetterKeymap("Mod-r", insertCommonmarkHorizontalRuleCommand),
        ...bindLetterKeymap("Mod-m", insertCodeblockCommand),
        ...bindLetterKeymap(
            "Mod-[",
            insertTagLinkCommand(parserFeatures.tagLinks, false)
        ),
        ...bindLetterKeymap(
            "Mod-]",
            insertTagLinkCommand(parserFeatures.tagLinks, true)
        ),
        ...bindLetterKeymap("Mod-/", spoilerCommand),
        ...bindLetterKeymap("Mod-,", subCommand),
        ...bindLetterKeymap("Mod-.", supCommand),
        ...bindLetterKeymap("Mod-'", kbdCommand),
        // selectAll selects the outermost node and messes up our other commands
        ...bindLetterKeymap("Mod-a", selectAllTextCommand),
    });

    const tableKeymap = keymap({
        ...bindLetterKeymap("Mod-e", insertCommonmarkTableCommand),
    });

    const keymaps = [commonmarkKeymap, keymap(baseKeymap)];

    if (parserFeatures.tables) {
        keymaps.unshift(tableKeymap);
    }

    return keymaps;
}
