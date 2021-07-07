import {
    InputRule,
    inputRules,
    textblockTypeInputRule,
    wrappingInputRule,
} from "prosemirror-inputrules";
import { MarkType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { richTextSchema as schema } from "../shared/schema";
import { validateLink } from "../shared/utils";

const blockquoteInputRule = wrappingInputRule(
    /^\s*>\s$/,
    schema.nodes.blockquote
);
const spoilerInputRule = wrappingInputRule(/^\s*>!\s$/, schema.nodes.spoiler);
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

const inlineCodeRegex = /`(\S(?:|.*?\S))`$/;
const boldRegex = /\*\*(\S(?:|.*?\S))\*\*$/;
const emphasisRegex = /(?<!\*)\*([^*\s](?:|.*?[^*\s]))\*$/;
const boldUnderlineRegex = /__(\S(?:|.*?\S))__$/;
const emphasisUnderlineRegex = /(?<!_)_([^_\s](?:|.*?[^*\s]))_$/;
const linkRegex = /\[(.+)\]\((.+)\)$/;

const inlineCodeRule = markInputRule(inlineCodeRegex, schema.marks.code);
const boldRule = markInputRule(boldRegex, schema.marks.strong);
const emphasisRule = markInputRule(emphasisRegex, schema.marks.em);
const boldUnderlineRule = markInputRule(
    boldUnderlineRegex,
    schema.marks.strong
);
const emphasisUnderlineRule = markInputRule(
    emphasisUnderlineRegex,
    schema.marks.em
);
const linkRule = markInputRule(
    linkRegex,
    schema.marks.link,
    (match: RegExpMatchArray) => {
        return { href: match[2] };
    },
    (match) => validateLink(match[2]) // only apply link input rule, if the matched URL is valid
);

/**
 * Create an input rule that applies a mark to the text matched by a regular expression.
 * @param regexp The regular expression to match the text. The text to be wrapped in a mark needs to be marked by the _first_ capturing group.
 * @param markType The mark type to apply
 * @param getAttrs A function returning the attributes to be applied to the node
 * @param matchValidator An optional function that allows validating the match before applying the mark
 * @returns A mark input rule
 */
function markInputRule(
    regexp: RegExp,
    markType: MarkType,
    getAttrs?: (p: string[]) => { [key: string]: unknown } | null | undefined,
    matchValidator?: (match: RegExpMatchArray) => boolean
) {
    return new InputRule(
        regexp,
        (
            state: EditorState,
            match: RegExpMatchArray,
            start: number,
            end: number
        ) => {
            const attrs = getAttrs ? getAttrs(match) : {};
            const tr = state.tr;

            // if the current node doesn't allow this mark, don't attempt to transform
            if (
                !state.doc.resolve(start).parent.type.allowsMarkType(markType)
            ) {
                return null;
            }

            // validate the match if a validator is given
            // and skip applying the mark if the validation fails
            if (matchValidator && !matchValidator(match)) {
                return null;
            }

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
 * Examples:
 *      * starting a line with "# " will turn the line into a headline
 *      * starting a line with "> " will insert a new blockquote in place
 */
export const richTextInputRules = inputRules({
    rules: [
        blockquoteInputRule,
        spoilerInputRule,
        headingInputRule,
        codeBlockRule,
        unorderedListRule,
        orderedListRule,
        inlineCodeRule,
        boldRule,
        boldUnderlineRule,
        emphasisRule,
        emphasisUnderlineRule,
        linkRule,
    ],
});
