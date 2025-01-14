import MarkdownIt, { StateCore, Token } from "markdown-it";

type LinkReference = { title?: string; href?: string };
type LinkReferences = { [key: string]: LinkReference };

// TODO rather than checking all this, it'd be nice if we upstreamed a PR to set a reference attribute at parse time
/** Checks if a single link_open/link_close token is a link reference and sets metadata on it */
function setLinkReference(
    references: LinkReferences,
    token: Token,
    parent: Token
) {
    if (!parent) {
        // this should never happen, but check anyways
        throw new Error("link-reference: parent token is undefined");
    }

    // TODO HACK this is super fragile and definitely doesn't work for anything except the most basic cases
    // try to find any links in the parent's content
    // they'll look like [label], [label][], or [label][id]
    const regex = /\[(.+?)\](?!\()(?:\[\]|\[(.+?)\]|)/g;

    let reference: LinkReference;
    let label: string;

    // TODO I'd much rather use String.matchAll (supported by all supported browsers), but that'd require a change to tsconfig
    let match: RegExpExecArray;
    while ((match = regex.exec(parent.content)) !== null) {
        if (!match?.length) {
            continue;
        }

        // [label], [label][]
        label = match[1];

        // [label][id]
        if (match[2]) {
            label = match[2];
        }

        const normalizedLabel = new MarkdownIt().utils.normalizeReference(
            label
        );
        reference = references[normalizedLabel];
        const href =
            token.type === "image"
                ? token.attrGet("src")
                : token.attrGet("href");

        // if the reference doesn't exist, or if we found the wrong reference, bail
        if (!reference || reference.href !== href) {
            reference = undefined;
            continue;
        }

        break;
    }

    if (!reference) {
        return false;
    }

    const refLinkType = match[2]
        ? "full"
        : match[0].endsWith("[]")
          ? "collapsed"
          : "shortcut";

    token.markup = "reference";
    token.meta = (token.meta as Record<string, unknown>) || {};
    (token.meta as Record<string, unknown>)["reference"] = {
        ...reference,
        label,
        type: refLinkType,
        contentMatch: match[0], // TODO used?
    };

    return true;
}

/** Sets link reference metadata on all applicable link_open/link_close tokens */
function setLinkReferences(
    references: LinkReferences,
    tokens: Token[],
    parent?: Token
) {
    let foundLinkOpen = false;

    // go through the tokens and try to find applicable links
    tokens.forEach((token: Token) => {
        // TODO this runs for every link token_close, which could likely be matched when we have a valid link_open
        // if this is a standard link_open (no html, autolink, etc), try to set the reference
        if (token.type === "link_open" && !token.markup) {
            foundLinkOpen = setLinkReference(references, token, parent);
        }

        // if we found a link_open, set the reference on the matching link_close
        // NOTE: links cannot be embedded inside links, so we don't have to worry about mismatched open/close tokens
        if (token.type === "link_close" && foundLinkOpen) {
            token.markup = "reference";
            foundLinkOpen = false;
        }

        // attempt the find link references for images as well, but don't bother with tracking the result
        if (token.type === "image" && !token.markup) {
            setLinkReference(references, token, parent);
        }

        if (token.children) {
            setLinkReferences(references, token.children, token);
        }
    });
}

/**
 * Searches for and marks links that point to a reference with a "reference" meta data
 */
export function reference_link(md: MarkdownIt): void {
    md.core.ruler.push("link-reference", function (state: StateCore) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const references = state.env?.references as LinkReferences;

        // if there are no references, do nothing
        if (!references || !Object.keys(references).length) {
            return false;
        }

        setLinkReferences(references, state.tokens);
        return false;
    });
}
