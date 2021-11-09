/**
 * Describes the supported html tags
 * @see {@link https://meta.stackexchange.com/questions/1777/what-html-tags-are-allowed-on-stack-exchange-sites|Supported tags}
 */
export enum TagType {
    // Uncategorized
    unknown,
    comment,

    // Inline items
    strike, //<del>, <s>, <strike>
    strong, //<b>, <strong>
    emphasis, //<i>, <em>
    hardbreak, //<br>, <br/> (space agnostic)
    code,
    link, // <a> [href] [title]
    image, // <img /> [src] [width] [height] [alt] [title]
    keyboard,
    pre,
    sup,
    sub,

    // Block items
    heading, // <h1>, <h2>, <h3>, <h4>, <h5>, <h6> (support full set of valid h tags)
    paragraph,
    horizontal_rule,
    blockquote,
    list_item,
    ordered_list,
    unordered_list,

    //TODO not yet implemented (needs added to schema in prosemirror)
    dd,
    dl,
    dt,
}

/**
 * Describes the supported attributes for each html tag
 * @see {@link https://meta.stackexchange.com/questions/1777/what-html-tags-are-allowed-on-stack-exchange-sites|Supported tags}
 */
export const supportedTagAttributes: { [key in TagType]?: string[] } = {
    [TagType.link]: ["href", "title"],
    [TagType.image]: ["alt", "height", "src", "title", "width"],
};

/**
 * Collection of elements that are counted as "block" level elements
 * TODO change to a map for fast lookup?
 */
export const blockElements = [
    TagType.blockquote,
    TagType.heading,
    TagType.list_item,
    TagType.ordered_list,
    TagType.unordered_list,
    TagType.dd,
    TagType.dl,
    TagType.dt,
    TagType.paragraph,
    TagType.horizontal_rule,
    TagType.pre,
];

/**
 * Collection of elements that are self-closing (e.g. <br/>)
 * TODO change to a map for fast lookup?
 */
export const selfClosingElements = [
    TagType.hardbreak,
    TagType.image,
    TagType.horizontal_rule,
];
