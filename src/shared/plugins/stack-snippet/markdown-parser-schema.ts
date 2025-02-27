import {MarkdownParser} from "prosemirror-markdown";
import {Token} from "markdown-it";

export const stackSnippetParserTokens: MarkdownParser["tokens"] = {
    stack_snippet: {
        block: "stack_snippet",
        getAttrs: (tok: Token) => ({
            hide: tok.attrGet("hide"),
            console: tok.attrGet("console"),
            babel: tok.attrGet("babel"),
            babelPresetReact: tok.attrGet("babelPresetReact"),
            babelPresetTS: tok.attrGet("babelPresetTS"),
        }),
    },

    stack_snippet_lang: {
        block: "stack_snippet_lang",
        noCloseToken: true,
        getAttrs: (tok: Token) => ({
            language: tok.attrGet("language"),
        }),
    }
}
