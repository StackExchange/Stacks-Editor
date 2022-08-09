import MarkdownIt from "markdown-it/lib";
import StateBlock from "markdown-it/lib/rules_block/state_block";

const HTML_COMMENT_OPEN_TAG = /<!--/;
const HTML_COMMENT_CLOSE_TAG = /-->/;

function getLineText(state: StateBlock, line: number): string {
    const pos = state.bMarks[line] + state.tShift[line];
    const max = state.eMarks[line];
    return state.src.slice(pos, max).trim();
}

function html_comment(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
) {
    if (!state.md.options.html) {
        return false;
    }

    let lineText = getLineText(state, startLine);

    // check if the open tag "<!--" is the first element in the line
    if (!HTML_COMMENT_OPEN_TAG.test(lineText.slice(0, 4))) {
        return false;
    }

    let nextLine = startLine + 1;
    while (nextLine < endLine) {
        if (HTML_COMMENT_CLOSE_TAG.test(lineText)) {
            break;
        }
        lineText = getLineText(state, nextLine);
        nextLine++;
    }

    // check if the first close tag "-->" occurence is the last element in the line
    if (HTML_COMMENT_CLOSE_TAG.exec(lineText).index + 3 !== lineText.length) {
        return false;
    }

    if (silent) {
        return true;
    }

    state.line = nextLine;

    const token = state.push("html_comment", "", 0);
    token.map = [startLine, nextLine];
    token.content = state.getLines(startLine, nextLine, state.blkIndent, true);

    return true;
}

/**
 * Parses out HTML comments blocks
 * (HTML comments inlined with other text/elements are not parsed by this plugin)
 * @param md
 */
export function htmlComment(md: MarkdownIt): void {
    md.block.ruler.before("html_block", "html_comment", html_comment);
}
