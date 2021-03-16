import {
    inputRules,
    textblockTypeInputRule,
    wrappingInputRule,
} from "prosemirror-inputrules";
import { richTextSchema as schema } from "../shared/schema";

const blockquoteInputRule = wrappingInputRule(
    /^\s*>\s$/,
    schema.nodes.blockquote
);
const headingInputRule = textblockTypeInputRule(
    new RegExp("^(#{1,3})\\s$"),
    schema.nodes.heading,
    (match) => ({ level: match[1].length })
);
const codeBlockRule = textblockTypeInputRule(/^```$/, schema.nodes.code_block);
const unorderedListRule = wrappingInputRule(
    /^\s*[*+-]\s$/,
    schema.nodes.bullet_list
);
const orderedListRule = wrappingInputRule(
    /^\s*\d(\.|\))\s$/,
    schema.nodes.ordered_list,
    (match) => ({ order: +match[1] }),
    (match, node) => node.childCount + <number>node.attrs.order == +match[1]
);

/**
 * Defines all input rules we're using in our rich-text editor.
 * Input rules are formatting operations that trigger as you type based on regular expressions
 *
 * Examples:
 *      * starting a line with "# " will turn the line into a headline
 *      * starting a line with "> " will insert a new blockquote in place
 */
export const richTextInputRules = inputRules({
    rules: [
        blockquoteInputRule,
        headingInputRule,
        codeBlockRule,
        unorderedListRule,
        orderedListRule,
    ],
});
