import MarkdownIt from "markdown-it/lib";
import StateBlock, {
    ParentType,
} from "markdown-it/lib/rules_block/state_block";
import { isSpace } from "markdown-it/lib/common/utils";

type BlockquoteExtOptions = {
    followingCharRegex: RegExp;
    markup: string;
    name: string;
};

// TODO unfortunately, we cannot reliably extend blockquote since it is hardcoded to search for `>` characters
// In addition, we cannot just call "blockquote" inside spoiler, because it does a lookahead for `>` characters and leaves our `!`s behind, potentially causing parsing issues
// The official advice is to just "copy paste then edit" "extended" rules...
// see https://github.com/markdown-it/markdown-it/blob/master/docs/development.md#general-considerations-for-plugins
// see also https://github.com/markdown-it/markdown-it/issues/46#issuecomment-73125248
function blockquoteExt(
    options: BlockquoteExtOptions,
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
): boolean {
    // NOTE: we're keeping the source as close to upstream as possible, so ignore errors like this
    // eslint-disable-next-line no-var
    var adjustTab,
        ch,
        i,
        initial,
        l,
        lastLineEmpty,
        lines: [number, number],
        nextLine,
        offset,
        oldBMarks,
        oldBSCount,
        oldIndent,
        oldParentType: ParentType,
        oldSCount,
        oldTShift,
        spaceAfterMarker,
        terminate,
        terminatorRules,
        token,
        wasOutdented,
        oldLineMax = state.lineMax,
        pos = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    // if it's indented more than 3 spaces, it should be a code block
    if (state.sCount[startLine] - state.blkIndent >= 4) {
        return false;
    }

    // check the block quote marker
    if (
        state.src.charCodeAt(pos) !== 0x3e /* > */ ||
        !options.followingCharRegex.test(state.src[pos + 1])
    ) {
        return false;
    }

    pos += options.markup.length;

    // we know that it's going to be a valid blockquote,
    // so no point trying to find the end of it in silent mode
    if (silent) {
        return true;
    }

    // skip spaces after ">" and re-calculate offset
    initial = offset =
        state.sCount[startLine] +
        pos -
        (state.bMarks[startLine] + state.tShift[startLine]);

    // skip one optional space after '>'
    if (state.src.charCodeAt(pos) === 0x20 /* space */) {
        // ' >   test '
        //     ^ -- position start of line here:
        pos++;
        initial++;
        offset++;
        adjustTab = false;
        spaceAfterMarker = true;
    } else if (state.src.charCodeAt(pos) === 0x09 /* tab */) {
        spaceAfterMarker = true;

        if ((state.bsCount[startLine] + offset) % 4 === 3) {
            // '  >\t  test '
            //       ^ -- position start of line here (tab has width===1)
            pos++;
            initial++;
            offset++;
            adjustTab = false;
        } else {
            // ' >\t  test '
            //    ^ -- position start of line here + shift bsCount slightly
            //         to make extra space appear
            adjustTab = true;
        }
    } else {
        spaceAfterMarker = false;
    }

    oldBMarks = [state.bMarks[startLine]];
    state.bMarks[startLine] = pos;

    while (pos < max) {
        ch = state.src.charCodeAt(pos);

        if (isSpace(ch)) {
            if (ch === 0x09) {
                offset +=
                    4 -
                    ((offset + state.bsCount[startLine] + (adjustTab ? 1 : 0)) %
                        4);
            } else {
                offset++;
            }
        } else {
            break;
        }

        pos++;
    }

    oldBSCount = [state.bsCount[startLine]];
    state.bsCount[startLine] =
        state.sCount[startLine] + 1 + (spaceAfterMarker ? 1 : 0);

    lastLineEmpty = pos >= max;

    oldSCount = [state.sCount[startLine]];
    state.sCount[startLine] = offset - initial;

    oldTShift = [state.tShift[startLine]];
    state.tShift[startLine] = pos - state.bMarks[startLine];

    terminatorRules = state.md.block.ruler.getRules("spoiler");

    oldParentType = state.parentType;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TODO adding a new parent type here...
    state.parentType = "spoiler";
    wasOutdented = false;

    // Search the end of the block
    //
    // Block ends with either:
    //  1. an empty line outside:
    //     ```
    //     > test
    //
    //     ```
    //  2. an empty line inside:
    //     ```
    //     >
    //     test
    //     ```
    //  3. another tag:
    //     ```
    //     > test
    //      - - -
    //     ```
    for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
        // check if it's outdented, i.e. it's inside list item and indented
        // less than said list item:
        //
        // ```
        // 1. anything
        //    > current blockquote
        // 2. checking this line
        // ```
        if (state.sCount[nextLine] < state.blkIndent) wasOutdented = true;

        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];

        if (pos >= max) {
            // Case 1: line is not inside the blockquote, and this line is empty.
            break;
        }

        pos += options.markup.length;

        if (
            state.src.charCodeAt(pos - options.markup.length) ===
                0x3e /* > */ &&
            options.followingCharRegex.test(
                state.src[pos - options.markup.length + 1]
            ) &&
            !wasOutdented
        ) {
            // This line is inside the blockquote.

            // skip spaces after ">" and re-calculate offset
            initial = offset =
                state.sCount[nextLine] +
                pos -
                (state.bMarks[nextLine] + state.tShift[nextLine]);

            // skip one optional space after '>'
            if (state.src.charCodeAt(pos) === 0x20 /* space */) {
                // ' >   test '
                //     ^ -- position start of line here:
                pos++;
                initial++;
                offset++;
                adjustTab = false;
                spaceAfterMarker = true;
            } else if (state.src.charCodeAt(pos) === 0x09 /* tab */) {
                spaceAfterMarker = true;

                if ((state.bsCount[nextLine] + offset) % 4 === 3) {
                    // '  >\t  test '
                    //       ^ -- position start of line here (tab has width===1)
                    pos++;
                    initial++;
                    offset++;
                    adjustTab = false;
                } else {
                    // ' >\t  test '
                    //    ^ -- position start of line here + shift bsCount slightly
                    //         to make extra space appear
                    adjustTab = true;
                }
            } else {
                spaceAfterMarker = false;
            }

            oldBMarks.push(state.bMarks[nextLine]);
            state.bMarks[nextLine] = pos;

            while (pos < max) {
                ch = state.src.charCodeAt(pos);

                if (isSpace(ch)) {
                    if (ch === 0x09) {
                        offset +=
                            4 -
                            ((offset +
                                state.bsCount[nextLine] +
                                (adjustTab ? 1 : 0)) %
                                4);
                    } else {
                        offset++;
                    }
                } else {
                    break;
                }

                pos++;
            }

            lastLineEmpty = pos >= max;

            oldBSCount.push(state.bsCount[nextLine]);
            state.bsCount[nextLine] =
                state.sCount[nextLine] + 1 + (spaceAfterMarker ? 1 : 0);

            oldSCount.push(state.sCount[nextLine]);
            state.sCount[nextLine] = offset - initial;

            oldTShift.push(state.tShift[nextLine]);
            state.tShift[nextLine] = pos - state.bMarks[nextLine];
            continue;
        }

        // Case 2: line is not inside the blockquote, and the last line was empty.
        if (lastLineEmpty) {
            break;
        }

        // Case 3: another tag found.
        terminate = false;
        for (i = 0, l = terminatorRules.length; i < l; i++) {
            if (terminatorRules[i](state, nextLine, endLine, true)) {
                terminate = true;
                break;
            }
        }

        if (terminate) {
            // Quirk to enforce "hard termination mode" for paragraphs;
            // normally if you call `tokenize(state, startLine, nextLine)`,
            // paragraphs will look below nextLine for paragraph continuation,
            // but if blockquote is terminated by another tag, they shouldn't
            state.lineMax = nextLine;

            if (state.blkIndent !== 0) {
                // state.blkIndent was non-zero, we now set it to zero,
                // so we need to re-calculate all offsets to appear as
                // if indent wasn't changed
                oldBMarks.push(state.bMarks[nextLine]);
                oldBSCount.push(state.bsCount[nextLine]);
                oldTShift.push(state.tShift[nextLine]);
                oldSCount.push(state.sCount[nextLine]);
                state.sCount[nextLine] -= state.blkIndent;
            }

            break;
        }

        oldBMarks.push(state.bMarks[nextLine]);
        oldBSCount.push(state.bsCount[nextLine]);
        oldTShift.push(state.tShift[nextLine]);
        oldSCount.push(state.sCount[nextLine]);

        // A negative indentation means that this is a paragraph continuation
        //
        state.sCount[nextLine] = -1;
    }

    oldIndent = state.blkIndent;
    state.blkIndent = 0;

    token = state.push(options.name + "_open", options.name, 1);
    token.markup = options.markup;
    token.map = lines = [startLine, 0];

    state.md.block.tokenize(state, startLine, nextLine);

    token = state.push(options.name + "_close", options.name, -1);
    token.markup = options.markup;

    state.lineMax = oldLineMax;
    state.parentType = oldParentType;
    lines[1] = state.line;

    // Restore original tShift; this might not be necessary since the parser
    // has already been here, but just to make sure we can do that.
    for (i = 0; i < oldTShift.length; i++) {
        state.bMarks[i + startLine] = oldBMarks[i];
        state.tShift[i + startLine] = oldTShift[i];
        state.sCount[i + startLine] = oldSCount[i];
        state.bsCount[i + startLine] = oldBSCount[i];
    }
    state.blkIndent = oldIndent;

    return true;
}

function spoilerFn(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
) {
    return blockquoteExt(
        {
            followingCharRegex: /!/,
            markup: ">!",
            name: "spoiler",
        },
        state,
        startLine,
        endLine,
        silent
    );
}

function blockquoteFn(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
) {
    return blockquoteExt(
        {
            followingCharRegex: /[^!]/,
            markup: ">",
            name: "blockquote",
        },
        state,
        startLine,
        endLine,
        silent
    );
}

/**
 * Parses out spoiler `>!` blocks
 * @param md
 */
export function spoiler(md: MarkdownIt): void {
    // TODO necessary?
    // find all blockquote chain rules and update to be part of the spoiler chain as well
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TODO no public way to iterate over all rules; maybe there's a better way?
    (md.block.ruler.__rules__ as { alt: string[] }[]).forEach((r) => {
        const bqIndex = r.alt.indexOf("blockquote");
        if (bqIndex > -1) {
            // add in "spoiler" right before the "blockquote" entry
            r.alt.splice(bqIndex, 0, "spoiler");
        }
    });
    md.block.ruler.before("blockquote", "spoiler", spoilerFn, {
        // TODO stole this from blockquote, dunno what it does...
        alt: ["paragraph", "reference", "spoiler", "blockquote", "list"],
    });

    md.block.ruler.at("blockquote", blockquoteFn, {
        alt: ["paragraph", "reference", "spoiler", "blockquote", "list"],
    });
}
