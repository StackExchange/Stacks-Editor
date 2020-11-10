import { DOMParser } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { RichTextEditor } from "../../src/rich-text/editor";

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
        [`<pre><code>test</code></pre>`, "```\ntest\n```"],
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
        [`test<br>test`, `test\\\ntest`],
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
     * Represents different types of data that were rendered differently in markup
     * [markupInput, markupOutput]
     */
    const markupSerializeData = [
        // NOTE: all commented items are test fails...
        /* Nodes */
        [`plain text`, `plain text`],
        [`> blockquote`, `> blockquote`],
        // [
        //     `<blockquote>html blockquote</blockquote>`,
        //     `<blockquote>html blockquote</blockquote>`,
        // ],
        //["    test", "    test"],
        ["```\ntest\n```", "```\ntest\n```"],
        ["```js\ntest\n```", "```js\ntest\n```"],
        ["~~~\ntest\n~~~", "~~~\ntest\n~~~"],
        //[`<pre><code>test</code></pre>`, `<pre><code>test</code></pre>`],
        [`# ATX heading`, `# ATX heading`],
        //[`Setext heading\n===`, `Setext heading\n===`],
        //[`<h1>html heading</h1>`, `<h1>html heading</h1>`],
        [`***`, `***`],
        [`---`, `---`],
        [`___`, `___`],
        [`******`, `******`],
        [`<hr>`, `<hr>`],
        [`<hr/>`, `<hr/>`],
        [`<hr />`, `<hr />`],
        // [`- li1\n- li2\n- li3`, `- li1\n- li2\n- li3`],
        // [`+ li1\n+ li2\n+ li3`, `+ li1\n+ li2\n+ li3`],
        // [`* li1\n* li2\n* li3`, `* li1\n* li2\n* li3`],
        // [
        //     `<ul><li>li1</li><li>li2</li></ul>`,
        //     `<ul><li>li1</li><li>li2</li></ul>`,
        // ],
        // [`1. li1\n1. li2\n1. li3`, `1. li1\n1. li2\n1. li3`],
        // [`1. li1\n2. li2\n3. li3`, `1. li1\n2. li2\n3. li3`],
        // [`1) li1\n2) li2\n3) li3`, `1) li1\n2) li2\n3) li3`],
        // [
        //     `<ol><li>li1</li><li>li2</li></ol>`,
        //     `<ol><li>li1</li><li>li2</li></ol>`,
        // ],
        [`![alt1](src1 "title1")`, `![alt1](src1 "title1")`],
        // [
        //     `<img src="src1" alt="alt1" title="title1">`,
        //     `<img src="src1" alt="alt1" title="title1">`,
        // ],
        // [
        //     `<img src="src1" alt="alt1" title="title1"/>`,
        //     `<img src="src1" alt="alt1" title="title1"/>`,
        // ],
        // [
        //     `<img src="src1" alt="alt1" title="title1" />`,
        //     `<img src="src1" alt="alt1" title="title1" />`,
        // ],
        // [
        //     `<img src="src1" height="10" width="10" />`,
        //     `<img src="src1" height="10" width="10" />`,
        // ],
        [`test\ntest`, `test\ntest`],
        //[`test  \ntest`, `test  \ntest`],
        [`test\n\ntest`, `test\n\ntest`],
        // [`test<br>test`, `test<br>test`],
        // [`test<br/>test`, `test<br/>test`],
        // [`test<br />test`, `test<br />test`],
        // TODO html_inline, html_block, html_block_container
        // TODO stack_snippet, softbreak, table, taglink, spoiler
        /* Marks */
        [`*test*`, `*test*`],
        [`_test_`, `_test_`],
        [`<em>test</em>`, `<em>test</em>`],
        [`<i>test</i>`, `<i>test</i>`],
        [`**test**`, `**test**`],
        [`__test__`, `__test__`],
        [`<b>test</b>`, `<b>test</b>`],
        [`<strong>test</strong>`, `<strong>test</strong>`],
        [`~~test~~`, `~~test~~`],
        [`<s>test</s>`, `<s>test</s>`],
        [`<del>test</del>`, `<del>test</del>`],
        [`<strike>test</strike>`, `<strike>test</strike>`],
        [`<kbd>test</kbd>`, `<kbd>test</kbd>`],
        [`<sup>test</sup>`, `<sup>test</sup>`],
        [`<sub>test</sub>`, `<sub>test</sub>`],
        ["`test`", "`test`"],
        //[`<code>test</code>`, "<code>test</code>"],
        [
            `[test](https://www.example.com "title1")`,
            `[test](https://www.example.com "title1")`,
        ],
        [`<https://www.example.com>`, `<https://www.example.com>`],
        [`https://www.example.com`, `https://www.example.com`],
        // TODO reference links
    ];

    it.each(markupSerializeData)(
        "should serialize elements with different source markup correctly (test #%#)",
        (input, output) => {
            const view = richView(input);
            expect(view.content).toBe(output);
        }
    );

    const escapeData = [String.raw`¯\\\_(ツ)\_/¯`];

    it.each(escapeData)(
        "should escape plain-text containing markdown characters",
        (input) => {
            const view = richView(input);
            expect(view.content).toBe(input);
        }
    );
});
