import { markdownHighlightPlugin } from "../../../src/commonmark/plugins/markdown-highlight";
import { createView } from "../../rich-text/test-helpers";
import { normalize } from "../../test-helpers";
import { createState } from "../test-helpers";

/*
        // commonmark
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
        // extensions
        { tag: tags.strikethrough, class: "tok-strike" },
        { tag: tags.heading, class: "hljs-strong" },
        // no highlighting
        { tag: tags.content, class: "" },
        { tag: tags.list, class: "" },
         */

describe("markdown highlight plugin", () => {
    it.each([
        {
            content: "just text",
            expected: "just text",
        },
        {
            content: "---",
            expected: `<span class="hljs-built_in">---</span>`,
        },
        {
            content: "# h1",
            expected: `<span class="hljs-section hljs-symbol">#</span><span class="hljs-section"> h1</span>`,
        },
        {
            content: "<!-- comment -->",
            expected:
                '<span class="hljs-comment">&lt;!-- comment --&gt;</span>',
        },
        {
            content: "\\*",
            expected: `<span class="hljs-literal">\\*</span>`,
        },
        {
            content: "&nbsp;",
            expected: `<span class="hljs-symbol">&amp;nbsp;</span>`,
        },
        {
            content: "_emphasis_",
            expected: `<span class="hljs-emphasis hljs-symbol">_</span><span class="hljs-emphasis">emphasis</span><span class="hljs-emphasis hljs-symbol">_</span>`,
        },
        {
            content: "**strong**",
            expected: `<span class="hljs-strong hljs-symbol">**</span><span class="hljs-strong">strong</span><span class="hljs-strong hljs-symbol">**</span>`,
        },
        {
            content: "[link](https://example.com)",
            expected: `<span class="hljs-string hljs-symbol">[</span><span class="hljs-string">link</span><span class="hljs-string hljs-symbol">]</span><span class="hljs-string hljs-symbol">(</span><span class="hljs-string hljs-link">https://example.com</span><span class="hljs-string hljs-symbol">)</span>`,
        },
        {
            content: "`code`",
            expected: `<span class="hljs-symbol">\`</span><span class="hljs-code">code</span><span class="hljs-symbol">\`</span>`,
        },
        {
            content: "<kbd>html</kbd>",
            expected: `<span class="hljs-tag">&lt;kbd&gt;</span>html<span class="hljs-tag">&lt;/kbd&gt;</span>`,
        },
        {
            content: "* list\n* list2",
            expected: `<span class="hljs-symbol">*</span> list<span class="hljs-symbol">*</span> list2`,
        },
    ])("should highlight markdown", ({ content, expected }) => {
        const state = createState(content, [markdownHighlightPlugin({})]);
        const view = createView(state);

        expect(normalize(view.dom.innerHTML)).toBe(
            `<pre class="s-code-block markdown"><code>${expected}</code></pre>`
        );
    });

    it.each([
        // disabled
        {
            content: `~~strikethrough~~`,
            expected: `~~strikethrough~~`,
            parserFeatures: {},
        },
        {
            content: `| table |\n| --- |\n| cell |`,
            expected: `| table || --- || cell |`,
            parserFeatures: {},
        },
        // enabled
        {
            content: `~~strikethrough~~`,
            expected: `<span class="tok-strike hljs-symbol">~~</span><span class="tok-strike">strikethrough</span><span class="tok-strike hljs-symbol">~~</span>`,
            parserFeatures: {
                extraEmphasis: true,
            },
        },
        {
            content: `| table |\n| --- |\n| cell |`,
            expected: `<span class="hljs-strong hljs-symbol">|</span><span class="hljs-strong"> table </span><span class="hljs-strong hljs-symbol">|</span><span class="hljs-symbol">| --- |</span><span class="hljs-symbol">|</span> cell <span class="hljs-symbol">|</span>`,
            parserFeatures: {
                tables: true,
            },
        },
    ])(
        "should highlight extensions when enabled in parserFeatures",
        ({ content, expected, parserFeatures }) => {
            const state = createState(content, [
                markdownHighlightPlugin(parserFeatures),
            ]);
            const view = createView(state);

            expect(normalize(view.dom.innerHTML)).toBe(
                `<pre class="s-code-block markdown"><code>${expected}</code></pre>`
            );
        }
    );
});
