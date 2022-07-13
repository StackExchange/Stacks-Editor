import MarkdownIt from "markdown-it/lib";
import StateInline from "markdown-it/lib/rules_inline/state_inline";
import type { TagLinkOptions } from "../view";

function parse_tag_link(
    state: StateInline,
    silent: boolean,
    options: TagLinkOptions
) {
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

    const totalContent = state.src.slice(state.pos, labelEnd + 1);
    const isMeta = totalContent.slice(0, 10) === "[meta-tag:";

    if (isMeta && !options.allowMetaTags) {
        return false;
    }

    const tagName = totalContent.slice(isMeta ? 10 : 5, -1).trim();

    // check that the tag name follows specific rules TODO better docs
    const validationRegex = options.allowNonAscii
        ? /([a-z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF#+.-]+)/i
        : /([a-z0-9#+.-]+)/i;

    if (!validationRegex.exec(tagName)) {
        return false;
    }

    if (!silent) {
        let token = state.push("tag_link_open", "a", 1);
        token.attrSet("tagName", tagName);
        token.attrSet("tagType", isMeta ? "meta-tag" : "tag");

        // call the renderer as if it exists
        if (options.renderer) {
            const rendered = options.renderer(tagName, isMeta);

            if (rendered && rendered.link) {
                const additionalClasses = rendered.additionalClasses || [];
                token.attrSet("href", rendered.link);
                token.attrSet("title", rendered.linkTitle);
                token.attrSet("additionalClasses", additionalClasses.join(" "));
            } else {
                // We don't want to crash the parsing process here since we can still display a passable version of the tag link.
                // However, we should at least log a console error.
                // eslint-disable-next-line no-console
                console.error(
                    `Unable to fully render taglink for [${tagName}] due to invalid response from options.renderer.`
                );
            }
        }

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
export function tagLinks(md: MarkdownIt, options: TagLinkOptions): void {
    // MarkdownIt appears to take the name of the rule-defining function as the rule name
    // and ignores the ruleName parameter. We are relying on the rule name in tests to
    // verify that it was appropriately defined.
    md.inline.ruler.push("tag_link", function tag_link(state, silent) {
        return parse_tag_link(state, silent, options);
    });
    // TODO make sure tag links are not in links
}
