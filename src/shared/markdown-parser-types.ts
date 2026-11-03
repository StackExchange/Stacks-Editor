import type { MarkdownIt, Token } from "markdown-it";
import {
    MarkdownParser as ProseMirrorMarkdownParser,
    defaultMarkdownParser,
    ParseSpec,
} from "prosemirror-markdown";
import type { Attrs, Schema } from "prosemirror-model";

/** ProseMirror token handlers using markdown-it's bundled v15 types. */
export type MarkdownParserTokens = Record<
    string,
    Omit<ParseSpec, "getAttrs"> & {
        getAttrs?: (
            token: Token,
            tokenStream: Token[],
            index: number
        ) => Attrs | null;
    }
>;

export type MarkdownParser = Omit<
    ProseMirrorMarkdownParser,
    "tokenizer" | "tokens"
> & {
    readonly tokenizer: MarkdownIt;
    readonly tokens: MarkdownParserTokens;
};

// ProseMirror still declares markdown-it v14 types. v15 preserves the parser
// runtime API, but allows numeric token attributes and exports different types.
// Keep that upstream declaration mismatch here rather than casting plugin tokens.
export const MarkdownParser = ProseMirrorMarkdownParser as unknown as {
    new (
        schema: Schema,
        tokenizer: MarkdownIt,
        tokens: MarkdownParserTokens
    ): MarkdownParser;
};

export const defaultMarkdownParserTokens: MarkdownParserTokens =
    defaultMarkdownParser.tokens;
