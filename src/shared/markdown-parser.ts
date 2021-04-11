import MarkdownIt from "markdown-it/lib";
import Token from "markdown-it/lib/token";
import {
    defaultMarkdownParser,
    MarkdownParser,
    TokenConfig,
} from "prosemirror-markdown";
import { NodeType, Schema } from "prosemirror-model";
import { ExternalEditorPlugin } from "./external-editor-plugin";
import { log } from "./logger";
import { html } from "./markdown-it/html";
import { spoiler } from "./markdown-it/spoiler";
import { stackLanguageComments } from "./markdown-it/stack-language-comments";
import { tagLinks } from "./markdown-it/tag-link";
import { tight_list } from "./markdown-it/tight-list";
import { validateLink } from "./utils";
import type { CommonmarkParserFeatures } from "./view";

// extend the default markdown parser's tokens and add our own
const customMarkdownParserTokens: { [key: string]: TokenConfig } = {
    ...defaultMarkdownParser.tokens,
    ...{
        pre: { block: "pre" },
        kbd: { mark: "kbd" },
        sup: { mark: "sup" },
        sub: { mark: "sub" },

        html_inline: {
            node: "html_inline",
            getAttrs: (token) => ({
                content: token.content,
            }),
        },

        html_block: {
            node: "html_block",
            getAttrs: (token) => ({
                content: token.content,
            }),
        },
        html_block_container: {
            block: "html_block_container",
            getAttrs: (token) => ({
                contentOpen: token.attrGet("contentOpen"),
                contentClose: token.attrGet("contentClose"),
            }),
        },

        // don't map our intermediary "stack_language*_comment" tokens. These are stripped from the stream, so they shouldn't be coming back anyways
        stack_language_comment: { ignore: true },
        stack_language_all_comment: { ignore: true },

        bullet_list: {
            block: "bullet_list",
            getAttrs: (tok) => ({
                tight: tok.attrGet("tight") === "true",
            }),
        },
        ordered_list: {
            block: "ordered_list",
            getAttrs: (tok) => ({
                order: +tok.attrGet("start") || 1,
                tight: tok.attrGet("tight") === "true",
            }),
        },

        code_block: {
            block: "code_block",
            getAttrs: (tok) => ({ params: tok.info || "" }),
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
            getAttrs: (tok) => ({
                style: tok.attrGet("style"),
            }),
        },

        tr: {
            block: "table_row",
        },

        td: {
            block: "table_cell",
            getAttrs: (tok) => ({
                style: tok.attrGet("style"),
            }),
        },

        // override the default image parser so we can add our own extended attributes
        image: {
            node: "image",
            getAttrs: (tok) => ({
                src: tok.attrGet("src"),
                width: tok.attrGet("width"),
                height: tok.attrGet("height"),
                alt: tok.attrGet("alt") || tok.children?.[0]?.content || null,
                title: tok.attrGet("title"),
            }),
        },

        tag_link: {
            block: "tagLink",
            getAttrs: (tok) => ({
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
    },
};

// add tag attribute support to all the marks like we did in schema
// this allows us to map the original tags to / from markdown
Object.keys(customMarkdownParserTokens).forEach((k) => {
    const token = customMarkdownParserTokens[k];

    // if an existing getAttrs function exists, make sure we wrap it and add our attributes in
    if (token.getAttrs) {
        const origGetAttrs = token.getAttrs.bind(
            token
        ) as typeof token.getAttrs;
        token.getAttrs = (tok) => {
            const attrs = origGetAttrs(tok);
            attrs.markup = tok.markup;
            return attrs;
        };

        return;
    }

    // set a getAttrs function that returns the tag attribute
    token.getAttrs = (tok) => ({
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
 * Custom MardownParser that manually adds a low-level handler for `html_inline`.
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
    tokens: { [key: string]: TokenConfig };

    constructor(
        schema: Schema,
        tokenizer: MarkdownIt,
        tokens: { [key: string]: TokenConfig }
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
 * Builds a custom markdown parser with the passed features toggled
 * @param features The features to toggle on/off
 */
export function buildMarkdownParser(
    features: CommonmarkParserFeatures,
    schema: Schema,
    externalPlugins: ExternalEditorPlugin
): SOMarkdownParser {
    if (!features) {
        throw "Cannot build markdown parser without passed features.";
    }

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

    // disable autolinking of anything that comes without protocol prefix (e.g. https://)
    defaultMarkdownItInstance.linkify.set({ fuzzyLink: false });

    // use a custom link validator that's closer to Stack Overflow's backend validation
    defaultMarkdownItInstance.validateLink = validateLink;

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

    // ensure lists are tighted up for parsing into the doc
    defaultMarkdownItInstance.use(tight_list);

    if (externalPlugins?.markdownParser) {
        externalPlugins.markdownParser.plugins.forEach((p) => {
            defaultMarkdownItInstance.use(p);
        });
    }

    return new SOMarkdownParser(schema, defaultMarkdownItInstance, {
        ...customMarkdownParserTokens,
        ...externalPlugins?.markdownParser?.tokens,
    });
}
