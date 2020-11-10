import MarkdownIt from "markdown-it/lib";
import StateInline from "markdown-it/lib/rules_inline/state_inline";

function tag_link(state: StateInline, silent: boolean) {
    // quick fail on first character
    if (state.src.charCodeAt(state.pos) !== 0x5b /* [ */) {
        return false;
    }

    if (
        state.src.slice(state.pos, state.pos + 5) !== "[tag:" &&
        state.src.slice(state.pos, state.pos + 10) !== "[meta-tag:"
    ) {
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const labelEnd = state.md.helpers.parseLinkLabel(
        state,
        state.pos + 1,
        false
    );

    // could not find the label end
    if (labelEnd < 0) {
        return false;
    }

    if (!silent) {
        const totalContent = state.src.slice(state.pos, labelEnd + 1);
        const isMeta = totalContent.slice(0, 10) === "[meta-tag:";
        const tagName = totalContent.slice(isMeta ? 10 : 5, -1);

        let token = state.push("tag_link_open", "a", 1);
        token.attrSet("tagName", tagName);
        token.attrSet("tagType", isMeta ? "meta-tag" : "tag");
        token.content = totalContent;

        token = state.push("text", "", 0);
        token.content = tagName;

        token = state.push("tag_link_close", "a", -1);
    }

    state.pos = labelEnd + 1;

    return true;
}

/**
 * Parses [tag:FOO] and [meta-tag:FOO] links
 * @param md
 */
export function tagLinks(md: MarkdownIt): void {
    md.inline.ruler.push("tag_link", tag_link);
}
