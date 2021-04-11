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
const emphasisRule = markInputRule(
    /(?<!\*)\*([^*\s](?:|[^*]*?[^*\s]))\*$/,
    schema.marks.em,
    {}
);
const linkRule = markInputRule(
    /\[(.+)\]\((.+)\)$/,
    schema.marks.link,
    (match: RegExpMatchArray) => {
        return { href: match[2] };
    }
);

/**
 * Create an input rule that applies a mark to the text matched by a regular expression.
 * @param regexp The regular expression to match the text. The text to be wrapped in a mark needs to be marked by the first capturing group.
 * @param markType The mark type to apply
 * @param getAttrs A static object or a function returning the attributes to be applied to the noe
 * @returns A mark input rule
 */
function markInputRule(
    regexp: RegExp,
    markType: MarkType,
    getAttrs:
        | { [key: string]: any }
        | ((match: string[]) => { [key: string]: any } | null | undefined)
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
            const matchedString = match[0];
            const capturedGroup = match[1];
            if (capturedGroup) {
                const textStart = start + matchedString.indexOf(capturedGroup);
                const textEnd = textStart + capturedGroup.length;

                if (textEnd < end) {
                    tr.delete(textEnd, end);
                }

                if (textStart > start) {
                    tr.delete(start, textStart);
                }

                end = start + capturedGroup.length;
            }
            // add mark to matching text
            tr.addMark(start, end, markType.create(attrs));

            // don't use mark for new text that's gonna follow
            tr.removeStoredMark(markType);
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
        emphasisRule,
        linkRule,
    ],
});
