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
} from "./commands";

export const commonmarkKeymap = keymap({
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
});

export const tableKeymap = keymap({
    "Mod-e": insertTableCommand,
});
