import MarkdownIt from "markdown-it/lib";
import StateBlock from "markdown-it/lib/rules_block/state_block";
import State from "markdown-it/lib/rules_core/state_core";

function langCommentParser(
    matcher: RegExp,
    tokenType: string,
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
) {
    const pos = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    // Check start
    if (state.src.charCodeAt(pos) !== 0x3c /* < */ || pos + 2 >= max) {
        return false;
    }

    // Quick fail on second char
    const ch = state.src.charCodeAt(pos + 1);
    if (ch !== 0x21 /* ! */) {
        return false;
    }

    // match the opener
    const lineText = state.src.slice(pos, max);
    const matches = matcher.exec(lineText);

    if (!matches?.length) {
        return false;
    }

    if (silent) {
        return true;
    }

    const nextLine = startLine + 1;

    state.line = nextLine;
    const newToken = state.push(tokenType, "", 0);
    newToken.map = [startLine, nextLine];
    newToken.content = state.getLines(
        startLine,
        nextLine,
        state.blkIndent,
        true
    );
    newToken.attrSet("language", matches[1]);

    return true;
}

/**
 * Parser rule for stack_snippet lang, partial based / piecemealed from other markdown-it block rules
 * @param state
 * @param startLine
 * @param endLine
 * @param silent
 */
function stack_language_comment(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
) {
    return langCommentParser(
        /<!-- language: lang-(.+?) -->/,
        "stack_language_comment",
        state,
        startLine,
        endLine,
        silent
    );
}

function stack_lang_all(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
) {
    return langCommentParser(
        /<!-- language-all: lang-(.+?) -->/,
        "stack_language_all_comment",
        state,
        startLine,
        endLine,
        silent
    );
}

// TODO document what the language-all rules are
function sanitizeCodeBlockLangs(state: State) {
    // keep track of which "language-all" has been set
    let currentLanguageAll: string = null;

    // first, do a pass to detect the first stack_language_all_comment for use in unmarked code_blocks preceding a `language-all` comment
    // TODO we need to support a default language at either parse or render time, will revisit this later in a separate plugin
    for (const token of state.tokens) {
        if (token.type === "stack_language_all_comment") {
            currentLanguageAll = token.attrGet("language");
            break;
        }
    }

    // second, check for stack_language_comment and apply languages (including language-all) to all code blocks
    for (let i = 0, len = state.tokens.length; i < len; i++) {
        const currentBlock = state.tokens[i];
        const nextBlock = state.tokens[i + 1];

        // if this is a language comment and the next block is a code block, set the value
        if (
            currentBlock.type === "stack_language_comment" &&
            nextBlock?.type === "code_block"
        ) {
            const language = currentBlock.attrGet("language");

            // the "info string" for code fences gets set into Token.info, so reuse that
            nextBlock.info = language;
        }
        // later language-all blocks reset the "default" language for all following code_blocks
        else if (currentBlock.type === "stack_language_all_comment") {
            currentLanguageAll = currentBlock.attrGet("language");
        }
        // set the language value on unmarked code blocks if we have a default language set
        else if (
            currentBlock.type === "code_block" &&
            !currentBlock.info &&
            currentLanguageAll
        ) {
            // the "info string" for code fences gets set into Token.info, so reuse that
            currentBlock.info = currentLanguageAll;
        }
    }

    // last, strip out all the stack_language_comment* tokens entirely
    state.tokens = state.tokens.filter(
        (t) => !t.type.startsWith("stack_language")
    );

    return false;
}

/**
 * Parses out `<!-- language: lang-* -->` and `<!-- langauge-all -->` comments and applies to the targeted code_block tokens
 * @param md
 */
export function stackLanguageComments(md: MarkdownIt): void {
    md.block.ruler.before(
        "html_block",
        "stack_language_comment",
        stack_language_comment
    );
    md.block.ruler.before(
        "html_block",
        "stack_language_all_comment",
        stack_lang_all
    );

    // strip out the stack_snippet_lang and directly modify the code blocks themselves
    md.core.ruler.push("so-sanitize-code-lang", sanitizeCodeBlockLangs);
}
