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
import { bindLetterKeymap } from "../shared/utils";
import { toggleTagCommand } from "../rich-text/commands";

export function allKeymaps(parserFeatures: CommonmarkParserFeatures): Plugin[] {
    const commonmarkKeymap = keymap({
        ...bindLetterKeymap("Mod-z", undo),
        ...bindLetterKeymap("Mod-y", redo),
        ...bindLetterKeymap("Mod-Shift-z", redo),
        "Tab": indentCommand,
        "Shift-Tab": indentCommand,
        ...bindLetterKeymap("Mod-b", boldCommand),
        ...bindLetterKeymap("Mod-i", emphasisCommand),
        ...bindLetterKeymap("Mod-l", insertLinkCommand),
        ...bindLetterKeymap("Ctrl-q", blockquoteCommand),
        ...bindLetterKeymap("Mod-k", inlineCodeCommand),
        ...bindLetterKeymap("Mod-g", insertImageCommand),
        ...bindLetterKeymap("Ctrl-g", insertImageCommand),
        ...bindLetterKeymap("Mod-o", orderedListCommand),
        ...bindLetterKeymap("Mod-u", unorderedListCommand),
        ...bindLetterKeymap("Mod-h", headerCommand),
        ...bindLetterKeymap("Mod-r", insertHorizontalRuleCommand),
        ...bindLetterKeymap("Mod-m", insertCodeblockCommand),
        // selectAll selects the outermost node and messes up our other commands
        ...bindLetterKeymap("Mod-a", selectAllTextCommand),
        ...bindLetterKeymap("Ctrl-[", toggleTagCommand),
    });

    const tableKeymap = keymap({
        ...bindLetterKeymap("Mod-e", insertTableCommand),
    });

    const keymaps = [commonmarkKeymap, keymap(baseKeymap)];

    if (parserFeatures.tables) {
        keymaps.unshift(tableKeymap);
    }

    return keymaps;
}
