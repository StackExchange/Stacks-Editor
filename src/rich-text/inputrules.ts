import {
    ellipsis,
    emDash,
    inputRules,
    smartQuotes,
    textblockTypeInputRule,
    wrappingInputRule,
    InputRule,
} from "prosemirror-inputrules";
import { MarkType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
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
    /^\s*\d\.\s$/,
    schema.nodes.ordered_list,
    (match) => ({ order: +match[1] }),
    (match, node) => node.childCount + <number>node.attrs.order == +match[1]
);

const inlineCodeRule = markInputRule(
    /`(\S(?:|.*?\S))`$/,
    schema.marks.code,
    {}
);
const boldRule = markInputRule(
    /\*\*(\S(?:|.*?\S))\*\*$/,
    schema.marks.strong,
    {}
);

const linkRule = markInputRule(
    /\[(.+)\]\((.+)\)$/,
    schema.marks.link,
    (match: RegExpMatchArray) => {
        return { href: match[2] };
    }
);

function markInputRule(
    regexp: RegExp,
    markType: MarkType,
    getAttrs:
        | { [key: string]: any }
        | ((p: string[]) => { [key: string]: any } | null | undefined)
) {
    return new InputRule(
        regexp,
        (
            state: EditorState,
            match: RegExpMatchArray,
            start: number,
            end: number
        ) => {
            const attrs =
                getAttrs instanceof Function ? getAttrs(match) : getAttrs;
            const tr = state.tr;
            if (match[1]) {
                const textStart = start + match[0].indexOf(match[1]);
                const textEnd = textStart + match[1].length;
                if (textEnd < end) tr.delete(textEnd, end);
                if (textStart > start) tr.delete(start, textStart);
                end = start + match[1].length;
            }
            tr.addMark(start, end, markType.create(attrs));
            tr.removeStoredMark(markType); // Do not continue with mark.
            return tr;
        }
    );
}

/**
 * Defines all input rules we're using in our rich-text editor.
 * Input rules are formatting operations that trigger as you type based on regular expressions
 *
 * We're reusing some of the built-in input rules like "smart quotes" or "ellipsis".
 *
 * Examples:
 *      * starting a line with "# " will turn the line into a headline
 *      * starting a line with "> " will insert a new blockquote in place
 */
export const richTextInputRules = inputRules({
    rules: [
        emDash,
        ellipsis,
        ...smartQuotes,
        blockquoteInputRule,
        headingInputRule,
        codeBlockRule,
        unorderedListRule,
        orderedListRule,
        inlineCodeRule,
        boldRule,
        linkRule,
    ],
});
