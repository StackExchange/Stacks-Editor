import MarkdownIt from "markdown-it";
import State from "markdown-it/lib/rules_core/state_core";
import Token from "markdown-it/lib/token";

function tightenList(tokens: Token[]) {
    let iteratedElements = 0;
    let insideListItem = false;
    let isTight = false;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (
            token.type === "bullet_list_open" ||
            token.type === "ordered_list_open"
        ) {
            const result = tightenList(tokens.slice(i + 1));

            if (result.isTight) {
                token.attrSet("tight", result.isTight.toString());
            }

            // all the content from the current index to the close tag is taken care of
            // skip to the next node
            i += result.iteratedElements + 1;
            continue;
        } else if (token.type.startsWith("list_item_")) {
            insideListItem = token.type.endsWith("open");
        } else if (
            token.type.startsWith("paragraph_") &&
            insideListItem &&
            token.hidden
        ) {
            isTight = true;
        } else if (
            token.type === "bullet_list_close" ||
            token.type === "ordered_list_close"
        ) {
            // we found the end of this list, stop here
            iteratedElements = i;
            break;
        }
    }

    return {
        iteratedElements,
        isTight,
    };
}

/**
 * Searches for and marks tight lists with a "tight" attribute
 */
export function tight_list(md: MarkdownIt): void {
    md.core.ruler.push("tight-list", function (state: State) {
        tightenList(state.tokens);
        return false;
    });
}
