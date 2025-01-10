import MarkdownIt from "markdown-it";
import { StateCore, Token }  from "markdown-it";

function addHardbreakMarkup(tokens: Token[], parent: Token = null) {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.children) {
            addHardbreakMarkup(token.children, token);
        }

        if (token.type !== "hardbreak") {
            continue;
        }

        if (/\s\s\n/.test(parent?.content)) {
            token.markup = "  \n";
        } else if (/\\\n/.test(parent?.content)) {
            token.markup = "\\\n";
        }
    }
}

/**
 * Adds markup to differentiate between doublespace/backslash hardbreaks
 * TODO UPSTREAM
 */
export function hardbreak_markup(md: MarkdownIt): void {
    md.core.ruler.push("hardbreak-markup", function (state: StateCore) {
        addHardbreakMarkup(state.tokens);
        return false;
    });
}
