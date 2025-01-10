import MarkdownIt from "markdown-it/lib";
import Token from "markdown-it/lib/token";
import { defaultMarkdownParser, MarkdownParser } from "prosemirror-markdown";
import { NodeType, Schema } from "prosemirror-model";
import { IExternalPluginProvider } from "./editor-plugin";
import { log } from "./logger";
import { hardbreak_markup } from "./markdown-it/hardbreak-markup";
import { html } from "./markdown-it/html";
import { reference_link } from "./markdown-it/reference-link";
import { spoiler } from "./markdown-it/spoiler";
import { stackLanguageComments } from "./markdown-it/stack-language-comments";
import { tagLinks } from "./markdown-it/tag-link";
import { tight_list } from "./markdown-it/tight-list";
import type { CommonmarkParserFeatures } from "./view";

// extend the default markdown parser's tokens and add our own
const customMarkdownParserTokens: MarkdownParser["tokens"] = {
    ...defaultMarkdownParser.tokens,
    pre: { block: "pre" },
    kbd: { mark: "kbd" },
    sup: { mark: "sup" },
    sub: { mark: "sub" },

    html_inline: {
        node: "html_inline",
        getAttrs: (token: Token) => ({
            content: token.content,
        }),
    },

    html_block: {
        node: "html_block",
        getAttrs: (token: Token) => ({
            content: token.content,
        }),
    },
    html_block_container: {
        block: "html_block_container",
        getAttrs: (token: Token) => ({
            contentOpen: token.attrGet("contentOpen"),
            contentClose: token.attrGet("contentClose"),
        }),
    },

    // don't map our intermediary "stack_language*_comment" tokens. These are stripped from the stream, so they shouldn't be coming back anyways
    stack_language_comment: { ignore: true },
    stack_language_all_comment: { ignore: true },

    bullet_list: {
        block: "bullet_list",
        getAttrs: (tok: Token) => ({
            tight: tok.attrGet("tight") === "true",
        }),
    },
    ordered_list: {
        block: "ordered_list",
        getAttrs: (tok: Token) => ({
            order: +tok.attrGet("start") || 1,
            tight: tok.attrGet("tight") === "true",
        }),
    },

    code_block: {
        block: "code_block",
        noCloseToken: true,
        getAttrs: (tok: Token) => ({
            params: tok.info || "",
            markup: tok.markup || "indented",
        }),
    },
    fence: {
        block: "code_block",
        getAttrs: (tok: Token) => ({
            params: tok.info || "",
        }),
        noCloseToken: true,
    },

    // add support for the strike mark
    s: {
        mark: "strike",
    },

    table: {
        block: "table",
    },

    thead: {
        block: "table_head",
    },

    tbody: {
        block: "table_body",
    },

    th: {
        block: "table_header",
        getAttrs: (tok: Token) => ({
            style: tok.attrGet("style"),
        }),
    },

    tr: {
        block: "table_row",
    },

    td: {
        block: "table_cell",
        getAttrs: (tok: Token) => ({
            style: tok.attrGet("style"),
        }),
    },

    // override the default image parser so we can add our own extended attributes
    image: {
        node: "image",
        getAttrs: (tok: Token) => {
            const attrs: Record<string, string> = {
                src: tok.attrGet("src"),
                width: tok.attrGet("width"),
                height: tok.attrGet("height"),
                alt: tok.attrGet("alt") || tok.children?.[0]?.content || null,
                title: tok.attrGet("title"),
            };

            if (tok.markup === "reference") {
                const meta = tok.meta as {
                    reference?: { type: string; label: string };
                };
                attrs.referenceType = meta?.reference?.type;
                attrs.referenceLabel = meta?.reference?.label;
            }

            return attrs;
        },
    },

    tag_link: {
        block: "tagLink",
        getAttrs: (tok: Token) => ({
            tagName: tok.attrGet("tagName"),
            tagType: tok.attrGet("tagType"),
        }),
    },

    spoiler: {
        block: "spoiler",
    },

    // support <code>foo</code> which parses differently from `bar`
    code_inline_split: {
        mark: "code",
    },
};

// add tag attribute support to all the marks like we did in schema
// this allows us to map the original tags to / from markdown
Object.keys(customMarkdownParserTokens).forEach((k) => {
    const token = customMarkdownParserTokens[k];

    // if an existing getAttrs function exists, make sure we wrap it and add our attributes in
    if (token.getAttrs) {
        const origGetAttrs = token.getAttrs.bind(token);

        // reference links require special handling
        if (k === "link") {
            token.getAttrs = (tok: Token, stream, index) => {
                const attrs = { ...origGetAttrs(tok, stream, index) };
                attrs.markup = tok.markup;

                if (tok.markup === "reference") {
                    const meta = tok.meta as {
                        reference?: { type: string; label: string };
                    };
                    attrs.referenceType = meta?.reference?.type;
                    attrs.referenceLabel = meta?.reference?.label;
                }

                return attrs;
            };
        } else {
            token.getAttrs = (tok: Token, stream, index) => ({
                markup: tok.markup,
                ...origGetAttrs(tok, stream, index),
            });
        }

        return;
    }

    // set a getAttrs function that returns the tag attribute
    token.getAttrs = (tok: Token) => ({
        markup: tok.markup,
    });
});

// TODO typings for private internals of MarkdownParser
interface MarkdownParserState {
    openNode(nodeType: NodeType, attrs: Record<string, unknown>): void;
    parseTokens(tokens: Token[]): void;
    closeNode(): void;
    addText(content: string): void;
}

// TODO can we do this more cleanly?
/**
 * Custom MarkdownParser that manually adds a low-level handler for `html_inline`.
 * We do this because we need some special functionality that is not exposed by default with the existing
 * handler generation code (from adding tokens)
 */
class SOMarkdownParser extends MarkdownParser {
    // TODO map the (private?) backing property not exposed by the typings
    declare tokenizer: MarkdownIt;

    // TODO map the (private?) backing property not exposed by the typings
    declare tokenHandlers: {
        [key: string]: (state: MarkdownParserState, tok: Token) => void;
    };

    // TODO map the (private?) backing property not exposed by the typings
    declare schema: Schema;

    // TODO the types are wrong on this one...
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    tokens: MarkdownParser["tokens"];

    constructor(
        schema: Schema,
        tokenizer: MarkdownIt,
        tokens: MarkdownParser["tokens"]
    ) {
        super(schema, tokenizer, tokens);

        // prosemirror visually preserves the \n from a softbreak (whitespace: pre-wrap),
        // so replace with " " (space) to be commonmark compliant
        this.tokenHandlers.softbreak = (state) => {
            const nodeType = this.schema.nodes["softbreak"];
            state.openNode(nodeType, {});
            state.addText(" ");
            state.closeNode();
        };
    }
}

/**
 * Extended MarkdownIt so we can peek into the tokens during parse
 * TODO we can likely remove this extended version now that we've moved internal items to plugins
 */
class SOMarkdownIt extends MarkdownIt {
    constructor(
        presetName: MarkdownIt.PresetName,
        options?: MarkdownIt.Options
    ) {
        super(presetName, options);
    }

    parse(src: string, env: unknown) {
        const parsed = super.parse(src, env);
        log("Sanitized markdown token tree", parsed);
        return parsed;
    }
}

/**
 * Creates a MarkdownIt instance with default properties
 * @param features The features to toggle on/off
 * @param externalPluginProvider The external plugin provider TODO should not be optional
 */
export function createDefaultMarkdownItInstance(
    features: CommonmarkParserFeatures,
    externalPluginProvider?: IExternalPluginProvider
): SOMarkdownIt {
    const defaultMarkdownItInstance = new SOMarkdownIt("default", {
        html: features.html, // we can allow the markdown parser to send through arbitrary HTML, but only because we're gonna whitelist it later
        linkify: true, // automatically link plain URLs
    });

    if (!features.tables) {
        defaultMarkdownItInstance.disable("table");
    }

    // match features to Markdig's extra emphasis plugin
    // https://github.com/lunet-io/markdig/blob/master/src/Markdig.Tests/Specs/EmphasisExtraSpecs.md
    if (!features.extraEmphasis) {
        defaultMarkdownItInstance.disable("strikethrough");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    defaultMarkdownItInstance.linkify.set({
        fuzzyLink: false, // disable autolinking of anything that comes without protocol prefix (e.g. https://)
        fuzzyEmail: false, // disable email address (without mailto:) autolinking
    });

    // use a custom link validator that's closer to Stack Overflow's backend validation
    defaultMarkdownItInstance.validateLink = features.validateLink;

    // start adding in the parser plugins, NOTE: order matters!

    // parse/sanitize html
    if (features.html) {
        defaultMarkdownItInstance.use((md) => html(md));
    }

    // map language html comments to code blocks like code fences
    defaultMarkdownItInstance.use(stackLanguageComments);

    // parse tag links
    if (features.tagLinks) {
        defaultMarkdownItInstance.use(tagLinks, features.tagLinks);
    }

    // parse spoilers
    defaultMarkdownItInstance.use(spoiler);

    // ensure lists are tightened up for parsing into the doc
    defaultMarkdownItInstance.use(tight_list);

    // ensure links are have their references properly referenced
    defaultMarkdownItInstance.use(reference_link);

    // ensure we can tell the difference between the different types of hardbreaks
    defaultMarkdownItInstance.use(hardbreak_markup);

    // TODO should always exist, so remove the check once the param is made non-optional
    externalPluginProvider?.alterMarkdownIt(defaultMarkdownItInstance);

    return defaultMarkdownItInstance;
}

/**
 * Builds a custom markdown parser with the passed features toggled
 * @param features The features to toggle on/off
 * @param schema The finalized schema to use
 * @param externalPluginProvider The external plugin provider to use
 */
export function buildMarkdownParser(
    features: CommonmarkParserFeatures,
    schema: Schema,
    externalPluginProvider: IExternalPluginProvider
): SOMarkdownParser {
    const defaultMarkdownItInstance = createDefaultMarkdownItInstance(
        features,
        externalPluginProvider
    );

    return new SOMarkdownParser(schema, defaultMarkdownItInstance, {
        ...customMarkdownParserTokens,
        ...externalPluginProvider?.markdownProps.parser,
    });
}
