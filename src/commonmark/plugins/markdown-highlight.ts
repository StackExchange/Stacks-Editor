import {
    MarkdownExtension,
    parser,
    Strikethrough,
    Table,
} from "@lezer/markdown";
import { styleTags, tags, tagHighlighter, Tag } from "@lezer/highlight";
import { highlightPlugin } from "prosemirror-lezer";
import { CommonmarkParserFeatures } from "../../shared/view";

/**
 * Plugin that highlights markdown syntax using {@link @lezer/highlight}.
 * @param parserFeatures The additional parser features to add syntax highlighting for
 */
export function markdownHighlightPlugin(
    parserFeatures: CommonmarkParserFeatures
) {
    /**
     * Custom classes for rendered tokens to match the hljs classes;
     * supports all tokens added by @lezer/highlight along with the ones we add in parser.configure below
     * @see {@link https://github.com/lezer-parser/markdown/blob/3c5f5dc3b5be08e19c32f0f7fac6f3619a58c911/src/markdown.ts#L1833}
     * Original class names can be found in {@link @lezer/highlight.classHighlighter}
     */
    const highlighter = tagHighlighter([
        // commonmark standard
        { tag: tags.quote, class: "hljs-quote" },
        { tag: tags.contentSeparator, class: "hljs-built_in" },
        { tag: tags.heading1, class: "hljs-section" },
        { tag: tags.heading2, class: "hljs-section" },
        { tag: tags.heading3, class: "hljs-section" },
        { tag: tags.heading4, class: "hljs-section" },
        { tag: tags.heading5, class: "hljs-section" },
        { tag: tags.heading6, class: "hljs-section" },
        { tag: tags.comment, class: "hljs-comment" },
        { tag: tags.escape, class: "hljs-literal" },
        { tag: tags.character, class: "hljs-symbol" },
        { tag: tags.emphasis, class: "hljs-emphasis" },
        { tag: tags.strong, class: "hljs-strong" },
        { tag: tags.link, class: "hljs-string" },
        { tag: tags.monospace, class: "hljs-code" },
        { tag: tags.url, class: "hljs-link" },
        { tag: tags.processingInstruction, class: "hljs-symbol" },
        { tag: tags.labelName, class: "hljs-string" },
        { tag: tags.string, class: "hljs-string" },
        { tag: tags.tagName, class: "hljs-tag" },
        // commonmark extensions
        { tag: tags.strikethrough, class: "tok-strike" },
        { tag: tags.heading, class: "hljs-strong" },
        // no highlighting
        { tag: tags.content, class: "" },
        { tag: tags.list, class: "" },
    ]);

    // extensions to the default commonmark parser/highlighter
    const extensions: MarkdownExtension[] = [];
    const extensionProps: Record<string, Tag> = {};

    if (parserFeatures.extraEmphasis) {
        extensions.push(Strikethrough);
    }

    if (parserFeatures.tables) {
        extensions.push(Table);
    }

    if (parserFeatures.html) {
        extensionProps["HTMLBlock HTMLTag"] = tags.tagName;
    }

    return highlightPlugin(
        {
            "*": parser.configure([
                {
                    props: [styleTags(extensionProps)],
                },
                ...extensions,
            ]),
        },
        ["code_block"],
        null,
        highlighter
    );
}
