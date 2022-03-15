import { DOMParser } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { RichTextEditor } from "../../src/rich-text/editor";
import { crazyTestUrl } from "./test-helpers";

function richView(markdownInput: string) {
    return new RichTextEditor(document.createElement("div"), markdownInput, {});
}

/**
 * Creates a new rich view, but without anything from a serialized markdown document,
 * such as `markup` on each node, `attributes`, etc; used to simulate an editor whose entire
 * contents were typed, rather than loaded
 */
function nonMarkdownRichView(domstringInput: string) {
    const editor = richView("");
    const oldState = editor.editorView.state;
    const doc = document.createElement("div");
    // NOTE: tests only, no XSS danger
    // eslint-disable-next-line no-unsanitized/property
    doc.innerHTML = domstringInput;
    editor.editorView.updateState(
        EditorState.create({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            schema: oldState.schema,
            doc: DOMParser.fromSchema(oldState.schema).parse(doc),
            plugins: oldState.plugins,
        })
    );

    return editor;
}

describe("markdown-serializer", () => {
    /**
     * Represents input that was *typed* into the editor, not converted from markdown
     * [inputDomString, outputMarkdownString]
     */
    const typedSerializeData = [
        /* Nodes */
        [`plain text`, `plain text`],
        [`<blockquote><p>test</p></blockquote>`, `> test`],
        [`<pre><code>test</code></pre>`, "    test"],
        [`<h1>test</h1>`, `# test`],
        [`<h2>test</h2>`, `## test`],
        [`<h3>test</h2>`, `### test`],
        [`<h4>test</h3>`, `#### test`],
        [`<h5>test</h4>`, `##### test`],
        [`<h6>test</h5>`, `###### test`],
        [`<hr>`, `----------`],
        [`<ul><li>test1</li><li>test2</li></ul>`, `- test1\n\n- test2`],
        [`<ol><li>test1</li><li>test2</li></ol>`, `1. test1\n\n2. test2`],
        [`<p>test</p>`, `test`],
        [
            `<img src="src1" title="title1" alt="alt1" />`,
            `![alt1](src1 "title1")`,
        ],
        [`test<br>test`, `test  \ntest`],
        // TODO html_inline, html_block, html_block_container, stack_snippet, softbreak? Can't be typed, but could be pasted...
        // TODO table, taglink, spoiler
        /* Marks */
        [`<em>test</em>`, `*test*`],
        [`<strong>test</strong>`, `**test**`],
        [`<del>test</del>`, `~~test~~`],
        [`<kbd>test</kbd>`, `<kbd>test</kbd>`],
        [`<sup>test</sup>`, `<sup>test</sup>`],
        [`<sub>test</sub>`, `<sub>test</sub>`],
        [`<code>test</code>`, "`test`"],
        [
            `<a href="https://www.example.com" title="title1">test</a>`,
            `[test](https://www.example.com "title1")`,
        ],
        [
            `<a href="https://www.example.com">https://www.example.com</a>`,
            `<https://www.example.com>`,
        ],
    ];

    it.each(typedSerializeData)(
        "should serialize typed elements correctly %s",
        (domInput: string, output: string) => {
            const view = nonMarkdownRichView(domInput);
            expect(view.content).toBe(output);
        }
    );

    /**
     * Represents different types of data that were rendered differently in markup.
     * All entries should render exactly the same before and after rich-text conversion.
     */
    const markupSerializeData = [
        /* Nodes */
        `plain text`,
        `> blockquote`,
        `<blockquote>html blockquote</blockquote>`,
        "    test",
        "    test\n    test2",
        `<p>html paragraph</p>`,
        "```js\ntest\n```",
        "~~~\ntest\n~~~",
        `<pre><code>test</code></pre>`,
        `# ATX heading`,
        //`Setext heading\n===`,
        `<h1>html heading</h1>`,
        `<h2>html heading</h2>`,
        `<h3>html heading</h3>`,
        `<h4>html heading</h4>`,
        `<h5>html heading</h5>`,
        `<h6>html heading</h6>`,
        `***`,
        `---`,
        `___`,
        `******`,
        `<hr>`,
        `<hr/>`,
        `<hr />`,
        /* Lists */
        // tight lists
        `- li1\n- li2\n- li3`,
        `+ li1\n+ li2\n+ li3`,
        `* li1\n* li2\n* li3`,
        `<ul><li>li1</li><li>li2</li></ul>`,
        //`1. li1\n1. li2\n1. li3`,
        `1. li1\n2. li2\n3. li3`,
        `1) li1\n2) li2\n3) li3`,
        `<ol><li>li1</li><li>li2</li></ol>`,
        //loose lists
        `- li1\n\n- li2\n\n- li3`,
        `1. li1\n\n2. li2\n\n3. li3`,
        // nested lists
        `- li1\n- li2\n  - nl1\n  - nl2\n- li3`,
        `- li1\n- li2\n  - nl1\n\n  - nl2\n- li3`,
        /* Images */
        `![alt1](${crazyTestUrl} "title1")`,
        `<img alt="alt1" src="src1" title="title1">`,
        `<img alt="alt1" src="src1" title="title1"/>`,
        `<img alt="alt1" src="src1" title="title1" />`,
        `<img height="10" src="src1" width="10" />`,
        // TODO attributes render in alpha order
        //[`<img src="src1" width="10" height="10" />`, `<img src="src1" height="10" width="10" />`],
        /* Soft/Hard breaks */
        `test\ntest`,
        `test\n\ntest`,
        //`test\\\ntest`,
        `test  \ntest`,
        `test<br>test`,
        `test<br/>test`,
        `test<br />test`,
        // TODO html_inline, html_block, html_block_container
        // TODO stack_snippet, softbreak, table, taglink, spoiler
        /* Marks */
        `*test*`,
        `_test_`,
        `<em>test</em>`,
        `<i>test</i>`,
        `**test**`,
        `__test__`,
        `<b>test</b>`,
        `<strong>test</strong>`,
        `~~test~~`,
        `<s>test</s>`,
        `<del>test</del>`,
        `<strike>test</strike>`,
        `<kbd>test</kbd>`,
        `<sup>test</sup>`,
        `<sub>test</sub>`,
        "`test`",
        "<code>test</code>",
        `[test](${crazyTestUrl} "title1")`,
        `<${crazyTestUrl}>`,
        `${crazyTestUrl}`,
        // TODO reference links
    ];

    it.each(markupSerializeData)(
        "should serialize elements with different source markup correctly (test #%#)",
        (input) => {
            const view = richView(input);
            expect(view.content).toBe(input);
        }
    );

    it.todo("should serialize elements from complex html markup");

    // TODO lots of complicated cases in the spec
    // see https://spec.commonmark.org/0.30/#reference-link
    // see https://spec.commonmark.org/0.30/#link-reference-definitions
    const linkReferencesMarkupData = [
        // full
        [
            `[foo][bar]\n\n[bar]: /url "title"`,
            `[foo][bar]\n\n[BAR]: /url "title"`,
        ],
        // collapsed
        [`[foo][]\n\n[foo]: /url "title"`, `[foo][]\n\n[FOO]: /url "title"`],
        // shortcut
        [`[foo]\n\n[foo]: /url "title"`, `[foo]\n\n[FOO]: /url "title"`],
        // mixed content
        [
            `[ShortCut]: https://stackoverflow.com

This is a test. I want to link to [foo][1] as a full reference link.

I also would like to use a collapsed reference link like [this][], but placing it somewhere other than at the very bottom of the page.

[THIS]: https://google.com

And finally, how about a [shortcut] link? I'm placing this one all the way at the top. For fun.

[1]: https://example.com`,
            `This is a test. I want to link to [foo][1] as a full reference link.

I also would like to use a collapsed reference link like [this][], but placing it somewhere other than at the very bottom of the page.

And finally, how about a [shortcut] link? I'm placing this one all the way at the top. For fun.

[1]: https://example.com
[SHORTCUT]: https://stackoverflow.com
[THIS]: https://google.com`,
        ],
    ];
    it.each(linkReferencesMarkupData)(
        "should serialize link references markup",
        (input, output) => {
            const view = richView(input);
            expect(view.content).toBe(output);
        }
    );

    const escapeData = [
        String.raw`¯\\\_(ツ)\_/¯`,
        String.raw`\_not-emphasized\_`,
        String.raw`_intra_text_underscores_are_not_emphasized_`,
        String.raw`http://www.example.com/dont_emphasize_urls`,
        String.raw`\<Not html\>`,
    ];

    it.each(escapeData)(
        "should escape plain-text containing markdown characters",
        (input) => {
            const view = richView(input);
            expect(view.content).toBe(input);
        }
    );
});
