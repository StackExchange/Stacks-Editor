import { RichTextEditor } from "../../src/rich-text/editor";
import * as mdp from "../../src/shared/markdown-parser";
import { externalPluginProvider, normalize } from "../test-helpers";

// mock the markdown-parser for testing
jest.mock("../../src/shared/markdown-parser");

// set the typings for easy function mocking
const mockedMdp = jest.mocked(mdp, { shallow: false });

// import the "actual" buildMarkdownParser function to use in our mock implementations
const { buildMarkdownParser } = jest.requireActual<typeof mdp>(
    "../../src/shared/markdown-parser"
);

// we need to mock buildMarkdownParser for only a single test, so set default "mock" to the actual function
mockedMdp.buildMarkdownParser.mockImplementation(buildMarkdownParser);

function editorDom(editorView: RichTextEditor): string {
    return editorView.dom.innerHTML;
}

function richView(markdownInput: string) {
    return new RichTextEditor(
        document.createElement("div"),
        markdownInput,
        externalPluginProvider(),
        {}
    );
}

describe("rich text editor view", () => {
    const markdownRenderingTestData = [
        ["bold", "**bold**", "<p><strong>bold</strong></p>"],
        ["emphasis", "*emphasized*", "<p><em>emphasized</em></p>"],
        [
            "bold + emphasis",
            "***bold and emphasized***",
            "<p><em><strong>bold and emphasized</strong></em></p>",
        ],
        ["bold with underscore", "__bold__", "<p><strong>bold</strong></p>"],
        [
            "emphasis with underscore",
            "_emphasized_",
            "<p><em>emphasized</em></p>",
        ],
        [
            "bold + emphasis with underscore",
            "___bold and emphasized___",
            "<p><em><strong>bold and emphasized</strong></em></p>",
        ],
        [
            "links, non-oneboxed",
            'here is [a link](https://example.com "link title here")',
            '<p>here is <a href="https://example.com" title="link title here">a link</a></p>',
        ],
        [
            "inline code",
            "some `code` here",
            "<p>some <code>code</code> here</p>",
        ],
        [
            "strikethrough",
            "~~strikethrough~~",
            "<p><del>strikethrough</del></p>",
        ],
        ["headlines 1", "# headline", `<h1>headline</h1>`],
        ["headlines 2", "## headline", `<h2>headline</h2>`],
        ["headlines 3", "### headline", `<h3>headline</h3>`],
        ["headlines 4", "#### headline", `<h4>headline</h4>`],
        ["headlines 5", "##### headline", `<h5>headline</h5>`],
        ["headlines 6", "###### headline", `<h6>headline</h6>`],
        [
            "blockquotes",
            "> blockquote",
            "<blockquote><p>blockquote</p></blockquote>",
        ],
        [
            "ordered lists",
            "1. some\n2. list",
            `<ol data-tight="true"><li><p>some</p></li><li><p>list</p></li></ol>`,
        ],
        [
            "unordered lists",
            "- some\n- list",
            `<ul data-tight="true"><li><p>some</p></li><li><p>list</p></li></ul>`,
        ],

        [
            "softbreaks",
            "test1\ntest2",
            // TODO there should be a space inside the softbreak, but the normalizer kills it
            '<p>test1<span softbreak=""> </span>test2</p>',
        ],
    ];

    describe("markdown rendering", () => {
        it.each(markdownRenderingTestData)(
            "should render %s",
            (name, markdown, expectedHtml) => {
                const richEditorView = richView(markdown);

                expect(editorDom(richEditorView)).toEqual(
                    normalize(expectedHtml)
                );
            }
        );

        it("should render images as node view", () => {
            const markdown =
                '![some image](https://example.com/some.png "image title here")';

            const richEditorView = richView(markdown);
            const img = richEditorView.dom.querySelector("img");

            expect(img.alt).toBe("some image");
            expect(img.src).toBe("https://example.com/some.png");
            expect(img.title).toBe("image title here");
        });

        it("should render code blocks as node view", () => {
            const markdown = '```\nconsole.log("hello, world!")\n```';

            const richEditorView = richView(markdown);

            const preElement = richEditorView.dom.querySelector("pre");
            const expectedCodeHtml = `<code class="content-dom"><span class="hljs-built_in">console</span>.<span class="hljs-built_in">log</span>(<span class="hljs-string">"hello, world!"</span>)</code>`;
            expect(preElement.innerHTML).toEqual(normalize(expectedCodeHtml));
        });
    });

    // see https://meta.stackexchange.com/questions/1777/what-html-tags-are-allowed-on-stack-`exchange-sites
    const supportedHtmlTagsTestData = [
        [
            "a",
            "link here: <a href='https://example.com'>link</a>",
            `<p>link here: <a href='https://example.com'>link</a></p>`,
        ],
        ["b", "<b>bold</b>", `<p><strong>bold</strong></p>`],
        [
            "blockquote",
            "<blockquote>quote here</blockquote>",
            `<blockquote><p>quote here</p></blockquote>`,
        ],
        ["code", "<code>rm -rf /</code>", `<p><code>rm -rf /</code></p>`],
        ["del", "<del>deleted</del>", `<p><del>deleted</del></p>`],
        ["em", "<em>emphasis</em>", `<p><em>emphasis</em></p>`],
        ["h1", "<h1>text</h1>", `<h1>text</h1>`],
        ["h2", "<h2>text</h2>", `<h2>text</h2>`],
        ["h3", "<h3>text</h3>", `<h3>text</h3>`],
        ["h4", "<h4>text</h4>", `<h4>text</h4>`],
        ["h5", "<h5>text</h5>", `<h5>text</h5>`],
        ["h6", "<h6>text</h6>", `<h6>text</h6>`],
        ["i", "<i>emphasis</i>", `<p><em>emphasis</em></p>`],
        ["kbd", "<kbd>Enter</kbd>", `<p><kbd>Enter</kbd></p>`],
        [
            "ul, li",
            "<ul><li>item</li></ul>",
            `<div class="html_block ProseMirror-widget">
                <ul>
                    <li>item</li>
                </ul>
            </div>`,
        ],
        [
            "ol, li",
            "<ol><li>item</li></ol>",
            `<div class="html_block ProseMirror-widget">
                <ol>
                    <li>item</li>
                </ol>
            </div>`,
        ],
        ["p", "<p>paragraph</p>", `<p>paragraph</p>`],
        ["pre", "<pre>test</pre>", `<pre><p>test</p></pre>`],
        ["s", "<s>deleted</s>", `<p><del>deleted</del></p>`],
        ["sub", "<sub>subscript</sub>", `<p><sub>subscript</sub></p>`],
        ["sup", "<sup>superscript</sup>", `<p><sup>superscript</sup></p>`],
        ["strong", "<strong>strong</strong>", `<p><strong>strong</strong></p>`],
        ["strike", "<strike>text</strike>", `<p><del>text</del></p>`],
        ["br", "<br>", `<p><br><br class="ProseMirror-trailingBreak"></p>`],
        ["hr", "<hr>", `<div><hr></div>`],
    ];

    describe("html in markdown mode", () => {
        it.each(supportedHtmlTagsTestData)(
            "should render %s tag (test #%#)",
            (name, markdown, expectedHtml) => {
                const richEditorView = richView(markdown);
                const expected = normalize(expectedHtml);
                const actual = normalize(editorDom(richEditorView));

                expect(actual).toEqual(expected);
            }
        );

        it("should escape unrecognized/unsupported inline elements as plain text", () => {
            const markdown = `<fake>not real</fake>`;

            const richEditorView = richView(markdown);

            const expectedHtml = normalize(
                `<p>&lt;fake&gt;not real&lt;/fake&gt;</p>`
            );
            expect(editorDom(richEditorView)).toEqual(expectedHtml);
        });

        // TODO html_block
        it.skip("should escape unsupported html_block elements as plain text", () => {
            const markdown = `<div style="font-size: 10em;">huge text</div>`;

            const richEditorView = richView(markdown);

            const expectedHtml = normalize(
                `<div class="html_block">&lt;div style="font-size: 10em;"&gt;huge text&lt;/div&gt;<br></div>`
            );
            expect(editorDom(richEditorView)).toEqual(expectedHtml);
        });

        it("should parse complex/split html block structures", () => {
            // since there's a newline, the html block will be interrupted (splitting it!)
            // it'll instead look like: [html_block, p(inline(em, text, softbreak, html_inline)), html_block]
            // therefore, the `**Hello**` will NOT be parsed, but the `_world_` WILL be
            const markdown = `
<blockquote>
<pre>
**Hello**,

_world_.
</pre>Some text to prevent addition of browser hack nodes
</blockquote>`;

            const richEditorView = richView(markdown);

            const expectedHtml = normalize(
                `<div class="html_block_container ProseMirror-widget"><blockquote>\n<pre>**Hello**,\n<div class="ProseMirror-contentdom"><p><em>world</em>.<span softbreak=""> </span><span class="html_inline">&lt;/pre&gt;</span>Some text to prevent addition of browser hack nodes</p></div></pre></blockquote></div>`
            );
            expect(normalize(editorDom(richEditorView))).toEqual(expectedHtml);
        });

        it("should allow nested HTML", () => {
            const markdown = "<strong><em><del>wtf?</del></em></strong>";
            const richEditorView = richView(markdown);

            const expectedHtml = `<p><em><strong><del>wtf?</del></strong></em></p>`;
            expect(editorDom(richEditorView)).toEqual(normalize(expectedHtml));
        });

        it("should render markdown within inline HTML", () => {
            const markdown = "<em>**text**</em>";
            const richEditorView = richView(markdown);

            const expectedHtml = `<p><em><strong>text</strong></em></p>`;
            expect(editorDom(richEditorView)).toEqual(normalize(expectedHtml));
        });

        it("should render markdown within block HTML as plain text", () => {
            const markdown = "<blockquote>**text**</blockquote>";
            const richEditorView = richView(markdown);

            const expectedHtml = `<blockquote><p>**text**</p></blockquote>`;
            expect(editorDom(richEditorView)).toEqual(normalize(expectedHtml));
        });
    });

    describe("tables", () => {
        it("should render tables", () => {
            const markdown = `
| Table      | With        | Alignments |
| ---------- |:-----------:| ----------:|
| left       | center      | right      |
| also left  | also center | also right |
`;

            const richEditorView = richView(markdown);

            const table = richEditorView.dom;
            expect(table.querySelectorAll("tr")).toHaveLength(3);
            expect(table.querySelectorAll("th")).toHaveLength(3);
            expect(table.querySelectorAll("td")).toHaveLength(6);

            expect(table.querySelectorAll("td")[1].style.textAlign).toBe(
                "center"
            );

            expect(table.querySelectorAll("td")[2].style.textAlign).toContain(
                "right"
            );
        });
    });

    describe("general", () => {
        it.each(["", "# testing some *stuff*"])(
            "should get and set content",
            (content) => {
                const baseContent = "# Here is _some_\n\n> **base** content";
                const view = richView(baseContent);
                // check the initial value
                expect(view.content).toBe(baseContent);

                // set it
                view.content = content;

                // check that the new value is correct
                expect(view.content).toBe(content);
            }
        );

        it("should recover from catastrophic markdown parse crashes", () => {
            // update the mock of buildMarkdownParser to add in a faulty md plugin
            mockedMdp.buildMarkdownParser.mockImplementation((...args) => {
                // go ahead and get the usual parser
                const parser = buildMarkdownParser.call(
                    null,
                    ...args
                ) as ReturnType<typeof buildMarkdownParser>;

                // add our purposefully busted plugin to force a crash
                parser.tokenizer.use((md) => {
                    md.core.ruler.push("crash_me", () => {
                        throw "sucks to be you";
                    });
                });

                return parser;
            });

            const editor = new RichTextEditor(
                document.createElement("div"),
                "*This* is some **test** content",
                externalPluginProvider()
            );

            // on a catastrophic crash, the raw string content gets
            // added into a code_block with a warning to the user attached
            expect(editor.document).toMatchNodeTree({
                childCount: 2,
                content: [
                    {
                        "type.name": "heading",
                        "childCount": 1,
                        "content": [
                            {
                                "type.isText": true,
                                "text": "WARNING! There was an error parsing the document",
                            },
                        ],
                    },
                    {
                        "type.name": "code_block",
                        "childCount": 1,
                        "content": [
                            {
                                "type.isText": true,
                                "text": "*This* is some **test** content",
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("external plugins", () => {
        it.todo("should do all the things");
    });
});
