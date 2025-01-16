import MarkdownIt, {StateInline} from "markdown-it";

function buildPreserveEscapeFn(md: MarkdownIt): MarkdownIt.ParserInline.RuleInline {
    const [escapeFn] = md.inline.ruler.getRules('')
        .filter(r => r.name === "escape");

    const noop = (): boolean => false;
    //The "escape" rule has been disabled or otherwise removed; so there's nothing to replace here.
    if(escapeFn.length === 0){
        return noop;
    }
    return function preserveEscapeFn(state: StateInline, silent: boolean): boolean {
        const escRet = escapeFn(state, silent);

        //If the rule did nothing (returned false or is running in silent mode) there's nothing to fix
        if(silent || escRet === false) return escRet;

        //The escape rule, if executed, always adds a 'text_special' node to the end, and we're going to work on that.
        const [escapeToken] = state.tokens.slice(-1);

        //Now we want to retag the type so that
        // - the escape token is ignored by the text_merge
        // - We can enact custom rendering later
        escapeToken.type = 'escape';
        console.log(escapeToken);

        return escRet;
    }
}

export function preserve_escape(md: MarkdownIt): void {
    const preserveEscapeTokens = buildPreserveEscapeFn(md);
    md.inline.ruler.at("escape", preserveEscapeTokens);
}
