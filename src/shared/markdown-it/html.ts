import MarkdownIt from "markdown-it";
import State from "markdown-it/lib/rules_core/state_core";
import Token from "markdown-it/lib/token";
import {
    blockElements,
    selfClosingElements,
    supportedTagAttributes,
    TagType,
} from "../html-helpers";

interface TagInfo {
    type: TagType;
    isSelfClosing: boolean;
    isClosing: boolean;
    isBlock: boolean;
    tagName: string;
    attributes: { [name: string]: string };
    markup: string;
}

/**
 * Detects what supported type this tag is
 * @param tag The raw html tag to categorize eg <strong>, </strong>, <br>, <br />
 * @see {@link https://meta.stackexchange.com/questions/1777/what-html-tags-are-allowed-on-stack-exchange-sites|Supported tags}
 */
function getTagInfo(tag: string): TagInfo {
    if (!tag) {
        return {
            type: TagType.unknown,
            isSelfClosing: false,
            isClosing: false,
            isBlock: false,
            tagName: null,
            attributes: {},
            markup: null,
        };
    }

    let tagType = TagType.unknown;
    // check if this tag looks like `</div>` or `</div malformed>`
    const isClosingTag = /^<\/\S+?.*?>$/.test(tag);

    // strip away all html characters and potential attributes
    const tagName = tag.replace(/[<>/]/g, "").trim().split(/\s/)[0];

    if (["del", "strike", "s"].includes(tagName)) {
        tagType = TagType.strike;
    } else if (["b", "strong"].includes(tagName)) {
        tagType = TagType.strong;
    } else if (["em", "i"].includes(tagName)) {
        tagType = TagType.emphasis;
    } else if (tagName === "code") {
        tagType = TagType.code;
    } else if (tagName === "br") {
        tagType = TagType.hardbreak;
    } else if (tagName === "blockquote") {
        tagType = TagType.blockquote;
    } else if (tagName === "a") {
        tagType = TagType.link;
    } else if (tagName === "img") {
        tagType = TagType.image;
    } else if (/h[1,2,3,4,5,6]/.test(tagName)) {
        // NOTE: no need to set the level, the default `heading` generates this from the `tag` property
        tagType = TagType.heading;
    } else if (tagName === "kbd") {
        tagType = TagType.keyboard;
    } else if (tagName === "pre") {
        tagType = TagType.pre;
    } else if (tagName === "sup") {
        tagType = TagType.sup;
    } else if (tagName === "sub") {
        tagType = TagType.sub;
    } else if (tagName === "ul") {
        tagType = TagType.unordered_list;
    } else if (tagName === "ol") {
        tagType = TagType.ordered_list;
    } else if (tagName === "li") {
        tagType = TagType.list_item;
    } else if (tagName === "p") {
        tagType = TagType.paragraph;
    } else if (tagName === "hr") {
        tagType = TagType.horizontal_rule;
    } else if (tagName === "dd") {
        tagType = TagType.description_details;
    } else if (tagName === "dl") {
        tagType = TagType.description_list;
    } else if (tagName === "dt") {
        tagType = TagType.description_term;
    } else {
        tagType = TagType.unknown;
    }

    let markup = tagName ? `<${isClosingTag ? "/" : ""}${tagName}>` : "";

    const isSelfClosing = selfClosingElements.includes(tagType);
    if (isSelfClosing) {
        // sanitize the original markup for output
        // <img title="asdfas" src="asdfasdf" /> becomes <img />
        // the `s` flag makes `.` match newlines, while `[^\S\r\n]` is `\s` without newline matches
        // this essentially strips out extraneous newlines that are found intertwined with the rest of the attributes
        markup = tag.replace(/^(<[a-z]+).*?([^\S\r\n]?\/?>)$/is, "$1$2");
    }

    const attributes: { [name: string]: string } = {};
    const supportedAttrs = supportedTagAttributes[tagType];
    if (supportedAttrs?.length) {
        for (const attr of supportedAttrs) {
            attributes[attr] =
                new RegExp(`${attr}=["'](.+?)["']`).exec(tag)?.[1] || "";
        }
    }

    return {
        type: tagType,
        isSelfClosing: isSelfClosing,
        isClosing: isClosingTag,
        isBlock: blockElements.includes(tagType),
        tagName: tagName,
        attributes: attributes,
        markup: markup,
    };
}

/**
 * Converts a TagInfo entry into a markdown-it Token, altering an existing one if given
 * @param tagInfo The tagInfo to use
 * @param existing The token to alter; creates a new token if this is empty
 */
function tagInfoToToken(tagInfo: TagInfo, existing?: Token): Token {
    // if a token was not passed in, create a new empty one
    const token = existing || new Token("", "", 0);

    // determine the markdown-it Token type for this tag
    const postfix = tagInfo.isSelfClosing
        ? ""
        : tagInfo.isClosing
        ? "_close"
        : "_open";
    let tokenType = "";

    switch (tagInfo.type) {
        case TagType.unknown:
            tokenType = "text";
            break;
        case TagType.strike:
            tokenType = "s" + postfix;
            break;
        case TagType.emphasis:
            tokenType = "em" + postfix;
            break;
        case TagType.code:
            tokenType = "code_inline_split" + postfix;
            break;
        case TagType.horizontal_rule:
            tokenType = "hr";
            break;
        case TagType.link:
            tokenType = "link" + postfix;
            token.attrSet("href", tagInfo.attributes.href);
            token.attrSet("title", tagInfo.attributes.title);
            break;
        case TagType.image:
            tokenType = "image";
            token.attrSet("src", tagInfo.attributes.src);
            token.attrSet("height", tagInfo.attributes.height);
            token.attrSet("width", tagInfo.attributes.width);
            token.attrSet("alt", tagInfo.attributes.alt);
            token.attrSet("title", tagInfo.attributes.title);
            break;
        case TagType.keyboard:
            tokenType = "kbd" + postfix;
            break;
        default:
            // e.g. TagType.pre becomes "pre" + postfix
            tokenType = TagType[tagInfo.type] + postfix;
            break;
    }

    token.type = tokenType;
    token.markup = tagInfo.markup;
    token.nesting = tagInfo.isClosing ? -1 : 1;

    if (tagInfo.isSelfClosing) {
        token.nesting = 0;
    }

    // make sure to set the original tag name back to the token so we can convert back
    token.tag = tagInfo.tagName || "";

    return token;
}

type parsedBlockTokenInfo = {
    isBlock: boolean;
    tagInfo: (TagInfo | string)[];
};

/**
 * Determines if an html_block is able to be simply parsed
 * @param token The html_block token to parse
 * @returns The parsed info if able, null if unable
 */
function isParseableHtmlBlockToken(token: Token): parsedBlockTokenInfo {
    const content = token.content;
    // checks if a token matches `<open>content</close>` OR `<br />`
    const matches =
        /^(?:(<[a-z0-9]+.*?>)([^<>\n]+?)(<\/[a-z0-9]+>))$|^(<[a-z0-9]+(?:\s.+?)?\s?\/?>)$/i.exec(
            content
        );

    if (!matches) {
        return null;
    }

    // there will always be four matches, only the last will be filled when the second regex kicks in
    const isSelfClosed = !!matches[4];
    const tagInfo: (TagInfo | string)[] = [];
    let isBlock = false;

    if (isSelfClosed) {
        // self closed, just get the info for the tag as a whole
        const info = getTagInfo(content);
        if (info.type !== TagType.unknown) {
            isBlock = info.isBlock;
            tagInfo.push(info);
        }
    } else {
        // block is in the format <tag>text</tag>
        // get the tag info for the open/close tags
        const openTag = getTagInfo(matches[1]);
        const text = matches[2];
        const closeTag = getTagInfo(matches[3]);

        // the tag is only valid if both tags are known and match each other
        if (
            openTag.type !== TagType.unknown &&
            closeTag.type !== TagType.unknown &&
            openTag.type === closeTag.type
        ) {
            isBlock = openTag.isBlock;
            // blockquotes are different...
            tagInfo.push(openTag);
            tagInfo.push(text);
            tagInfo.push(closeTag);
        }
    }

    // we were able to parse the tag if *any* info was returned
    return tagInfo.length > 0 ? { isBlock, tagInfo } : null;
}

/**
 * Wraps an inline token with another token of type `inline`.
 * Optionally, wraps in `paragraph` tokens if the parent requires a block child
 * @param token The token to wrap
 * @param parentType The type of the token's parent
 */
function wrapBareInlineToken(
    token: Token,
    parentType: TagType | null
): Token[] {
    // don't wrap block tokens
    if (token.block) {
        return [token];
    }

    /** Array of types that take block children (vs inline children only) */
    const takesBlockChildren = [TagType.blockquote, TagType.pre];

    const inlineToken = new Token("inline", "", 0);
    inlineToken.children = [token];

    // if the parent type only takes block children, wrap in a `p` tag
    if (!parentType || takesBlockChildren.includes(parentType)) {
        return [
            new Token("paragraph_open", "p", 1),
            inlineToken,
            new Token("paragraph_close", "p", -1),
        ];
    }

    return [inlineToken];
}

/**
 * Sanitizes a single token if it is of type `html_inline`; otherwise, its children are sanitized
 * @param token The token to sanitize `html_inline` tokens in
 */
function sanitizeHtmlInlineToken(token: Token): Token {
    let tagInfo: TagInfo = null;

    if (token.type === "html_inline") {
        // all html_inline tokens are valid, get their info
        tagInfo = getTagInfo(token.content);
    } else {
        // non-block/inline, just sanitize their children
        if (token.children && token.children.length) {
            token.children = sanitizeInlineHtmlTokens(token.children);
        }
    }

    // if the tagInfo was not populated, then this isn't sanitizable
    if (!tagInfo) {
        return token;
    }

    // this shouldn't happen, but guard against it anyways
    if (tagInfo.isBlock) {
        return token;
    }

    // set all the tagInfo onto the token
    token = tagInfoToToken(tagInfo, token);

    // set the `inline_html` attribute for when we're checking for well formed tokens later
    token.attrSet("inline_html", "true");

    return token;
}

/**
 * Recursively sanitizes all `html_inline` tokens in a Token array, along with making sure
 * that all sanitized tokens are well formed (both an opening and closing pair exists);
 * Can return `html_inline` tokens that were unable to be sanitized or have a missing pair
 * @param tokens The tokens to sanitize
 */
function sanitizeInlineHtmlTokens(tokens: Token[]): Token[] {
    tokens = tokens.map(sanitizeHtmlInlineToken).filter((t) => !!t);
    for (let i = 0, len = tokens.length; i < len; i++) {
        const openToken = tokens[i];

        if (!openToken.attrGet("inline_html")) {
            continue;
        }

        // doesn't have an open tag... change back to html_inline and let the renderer deal with it
        if (openToken.type.includes("_close") && !openToken.attrGet("paired")) {
            openToken.type = "html_inline";
            continue;
        }

        if (!openToken.type.includes("_open")) {
            continue;
        }

        let hasClosingTag = false;

        // look for the closing tag to this opening tag
        for (let j = i + 1, len2 = tokens.length; j < len2; j++) {
            const closeToken = tokens[j];

            // not inline or already paired, skip
            if (
                !closeToken ||
                !closeToken.attrGet("inline_html") ||
                closeToken.attrGet("paired")
            ) {
                continue;
            }

            if (openToken.tag === closeToken.tag) {
                hasClosingTag = true;
                closeToken.attrSet("paired", "true");
                break;
            }
        }

        // doesn't have a close tag... change back to html_inline and let the renderer deal with it
        if (!hasClosingTag) {
            openToken.type = "html_inline";
        }
    }

    return tokens;
}

/**
 * Strips a string of all unknown html tags
 * @param content The string to sanitize
 */
function sanitizeHtmlString(content: string) {
    const tags = content.match(/(<\/?[a-z]+.*?>)/gi)?.map((t) => ({
        match: t,
        tagInfo: getTagInfo(t),
    }));

    // no tags in the content... probably should never happen, but check anyways
    if (!tags || !tags.length) {
        return content;
    }

    let newContent = content;

    // replace each invalid tag with a sanitized version
    tags.forEach((t) => {
        let toReplaceWith: string;

        // TODO move logic into its own function?
        if (t.tagInfo.type === TagType.unknown) {
            // unknown tags are removed completely
            toReplaceWith = "";
        } else if (t.tagInfo.type === TagType.image) {
            // image tags have specific allowed attributes
            const attrs = t.match.match(
                /((width|height|src|alt|title)=["'].+?["'])/g
            );
            let insert = t.tagInfo.markup;

            if (attrs?.length) {
                insert = insert.replace("<img", `<img ${attrs.join(" ")}`);
            }
            toReplaceWith = insert;
        } else if (t.tagInfo.type === TagType.link) {
            // link tags have specific allowed attributes
            const attrs = t.match.match(/((href|title)=["'].+?["'])/g);
            let insert = t.tagInfo.markup;

            if (attrs?.length) {
                insert = insert.replace("<a", `<a ${attrs.join(" ")}`);
            }
            toReplaceWith = insert;
        } else {
            // known tags have their attributes wiped out completely
            toReplaceWith = t.tagInfo.markup;
        }

        // replace our matched tag with the updated version
        newContent = newContent.replace(t.match, toReplaceWith);
    });

    return newContent;
}

/**
 * Recursively sanitizes all `html_block` tokens by parsing the ones that are able to be simply parsed
 * @param tokens The tokens to sanitize
 */
function sanitizeSimpleHtmlBlockTokens(tokens: Token[]) {
    const retTokens: Token[] = [];

    tokens.forEach((token) => {
        let parsedInfo: parsedBlockTokenInfo = null;

        if (token.type === "html_block") {
            // we *do* allow parsing some tokens detected as html_block under specific circumstances (br, image)
            parsedInfo = isParseableHtmlBlockToken(token);
        } else if (token.children?.length) {
            // sanitize any children as well
            token.children = sanitizeSimpleHtmlBlockTokens(token.children);
        }

        if (!parsedInfo || !parsedInfo.tagInfo.length) {
            retTokens.push(token);
            return;
        }

        const newTokens: Token[] = [];

        parsedInfo.tagInfo.forEach((tag, i, arr) => {
            const lastInfo = arr[i - 1] as TagInfo;
            const isInline = typeof tag === "string" || !tag.isBlock;
            let tok: Token;

            if (typeof tag === "string") {
                const t = new Token("text", "", 0);
                t.content = tag;

                tok = t;
            } else {
                tok = tagInfoToToken(tag);
            }

            let wrappedTokens = [tok];

            if (isInline) {
                wrappedTokens = wrapBareInlineToken(tok, lastInfo?.type);
            }

            newTokens.push(...wrappedTokens);
        });

        retTokens.push(...newTokens);
    });

    return retTokens;
}

/**
 * Sanitize the content of `html_block` tokens by stripping out all unknown tags
 * @param tokens The tokens to sanitize
 */
function sanitizeBlockHtmlTokens(tokens: Token[]): Token[] {
    const retTokens: Token[] = [];

    tokens.forEach((token) => {
        if (token.children?.length) {
            token.children = sanitizeBlockHtmlTokens(token.children);
        }

        // don't sanitize non-`html_block*` tokens
        if (token.type.indexOf("html_block") !== 0) {
            retTokens.push(token);
            return;
        }

        if (token.type === "html_block") {
            token.content = sanitizeHtmlString(token.content);

            // if the content is completely empty, don't even add the block
            if (!token.content.trim()) {
                return;
            }

            // TODO naive check? try appending to a div and getting innerText instead?
            // there's no more html left after sanitization, return a text node instead
            if (!token.content.includes("<")) {
                const textToken = new Token("text", "", 0);
                textToken.content = token.content;
                const wrappedToken = wrapBareInlineToken(textToken, null);
                retTokens.push(...wrappedToken);
            } else {
                retTokens.push(token);
            }
        } else if (token.type === "html_block_container_open") {
            const contentOpen = token.attrGet("contentOpen");
            const contentClose = token.attrGet("contentClose");

            token.attrSet("contentOpen", sanitizeHtmlString(contentOpen));
            token.attrSet("contentClose", sanitizeHtmlString(contentClose));

            // TODO if both contentOpen and contentClose are empty, remove the container entirely
            retTokens.push(token);
        } else {
            retTokens.push(token);
        }
    });

    return retTokens;
}

/**
 * Attempts to merge `html_block` tokens that were split by a newline character
 * @param tokens The tokens to sanitize
 */
function mergeSplitBlockHtmlTokens(tokens: Token[]): Token[] {
    const returnTokens: Token[] = [];

    let splitCount = 0;
    // get all split html_block indexes
    let blockIndexes = tokens
        .map((t, i) => {
            if (t.type !== "html_block") {
                return null;
            }

            // extremely naive check that assumes open/close tags are balanced
            const openTags =
                t.content.match(/<[a-z]+(\s[a-z0-9\-"'=\s])?>/gi)?.length ?? 0;
            const closeTags = t.content.match(/<\/[a-z]+>/gi)?.length ?? 0;

            // TODO accurate?
            if (openTags > closeTags) {
                splitCount += 1;
                return i;
            }

            // TODO yeah, this is probably not accurate...
            if (openTags < closeTags && splitCount % 2 === 1) {
                splitCount += 1;
                return i;
            }

            return null;
        })
        .filter((t) => t !== null);

    // if there is an odd number of indexes, drop the last one (we only work in pairs)
    if (blockIndexes.length % 2 === 1) {
        blockIndexes = blockIndexes.slice(0, -1);
    }

    let lastOpenToken: Token | null = null;
    tokens.forEach((t, i) => {
        if (t.children && t.children.length) {
            t.children = mergeSplitBlockHtmlTokens(t.children);
        }

        // if the current token is an html_block (and assigned to a pair)
        const isPairedHtmlBlock =
            t.type === "html_block" && blockIndexes.includes(i);

        if (!isPairedHtmlBlock) {
            returnTokens.push(t);
            return;
        }

        const containerToken = new Token(
            "html_block_container_" + (lastOpenToken ? "close" : "open"),
            "",
            lastOpenToken ? -1 : 1
        );

        if (!lastOpenToken) {
            containerToken.attrSet("contentOpen", t.content);
            lastOpenToken = containerToken;
            returnTokens.push(containerToken);
        } else {
            lastOpenToken.attrSet("contentClose", t.content);
            lastOpenToken = null;
            returnTokens.push(containerToken);
        }
    });

    return returnTokens;
}

/**
 * Parses and sanitizes all supported html_block and html_inline tokens
 * @param md
 */
export function html(md: MarkdownIt): void {
    md.core.ruler.push("so-sanitize-html", function (state: State) {
        // TODO there are a lot of loops here. Can we combine a few?
        state.tokens = sanitizeInlineHtmlTokens(state.tokens);
        state.tokens = sanitizeSimpleHtmlBlockTokens(state.tokens);
        state.tokens = mergeSplitBlockHtmlTokens(state.tokens);
        state.tokens = sanitizeBlockHtmlTokens(state.tokens);
        return false;
    });
}
