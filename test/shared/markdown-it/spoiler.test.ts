import MarkdownIt from "markdown-it";
import { spoiler } from "../../../src/shared/markdown-it/spoiler";
import { normalize } from "../../test-helpers";

describe("tagLinks markdown-it plugin", () => {
    const instance = new MarkdownIt("default", { html: true });
    instance.use(spoiler);

    // test cases taken from markdown-it, which in turn were taken from commonmark's spec
    // https://github.com/markdown-it/markdown-it/blob/master/test/fixtures/commonmark/good.txt
    const spoilerTests = [
        [">! foo\n---", "<spoiler><p>foo</p></spoiler><hr />"],
        [">! foo\nbar\n===", "<spoiler><p>foo\nbar\n===</p></spoiler>"],
        [">! foo\n-----", "<spoiler><p>foo</p></spoiler><hr />"],
        [
            ">! ```\n>! aaa\n\nbbb",
            "<spoiler><pre><code>aaa</code></pre></spoiler><p>bbb</p>",
        ],
        [">! <div>\n>! foo\n\nbar", "<spoiler><div>foo</spoiler><p>bar</p>"],
        [
            "# [Foo]\n[foo]: /url\n>! bar",
            '<h1><a href="/url">Foo</a></h1><spoiler><p>bar</p></spoiler>',
        ],
        [
            "[foo]\n>! [foo]: /url",
            '<p><a href="/url">foo</a></p><spoiler></spoiler>',
        ],
        [
            ">! # Foo\n>! bar\n>! baz",
            "<spoiler><h1>Foo</h1><p>bar\nbaz</p></spoiler>",
        ],
        [
            "   >!# Foo\n   >!bar\n >! baz",
            "<spoiler><h1>Foo</h1><p>bar\nbaz</p></spoiler>",
        ],
        [
            "    >! # Foo\n    >! bar\n    >! baz",
            "<pre><code>&gt;! # Foo\n&gt;! bar\n&gt;! baz</code></pre>",
        ],
        [
            ">! # Foo\n>! bar\nbaz",
            "<spoiler><h1>Foo</h1><p>bar\nbaz</p></spoiler>",
        ],
        [">! bar\nbaz\n>! foo", "<spoiler><p>bar\nbaz\nfoo</p></spoiler>"],
        [
            ">! - foo\n- bar",
            "<spoiler><ul><li>foo</li></ul></spoiler><ul><li>bar</li></ul>",
        ],
        [
            ">!     foo\n    bar",
            "<spoiler><pre><code>foo</code></pre></spoiler><pre><code>bar</code></pre>",
        ],
        [
            ">! ```\nfoo\n```",
            "<spoiler><pre><code></code></pre></spoiler><p>foo</p><pre><code></code></pre>",
        ],
        [">! foo\n    - bar", "<spoiler><p>foo\n- bar</p></spoiler>"],
        [">!", "<spoiler></spoiler>"],
        [">!\n>!\n>!", "<spoiler></spoiler>"],
        [">!\n>! foo\n>!", "<spoiler><p>foo</p></spoiler>"],
        [
            ">! foo\n\n>! bar",
            "<spoiler><p>foo</p></spoiler><spoiler><p>bar</p></spoiler>",
        ],
        [">! foo\n>! bar", "<spoiler><p>foo\nbar</p></spoiler>"],
        [">! foo\n>!\n>! bar", "<spoiler><p>foo</p><p>bar</p></spoiler>"],
        ["foo\n>! bar", "<p>foo</p><spoiler><p>bar</p></spoiler>"],
        [
            ">! foo\n***\n>! bar",
            "<spoiler><p>foo</p></spoiler><hr /><spoiler><p>bar</p></spoiler>",
        ],
        [">! foo\nbar", "<spoiler><p>foo\nbar</p></spoiler>"],
        [">! bar\n\nbaz", "<spoiler><p>bar</p></spoiler><p>baz</p>"],
        [">! bar\n>!\nbaz", "<spoiler><p>bar</p></spoiler><p>baz</p>"],
        [
            ">! >! >! foo\nbar",
            "<spoiler><spoiler><spoiler><p>foo\nbar</p></spoiler></spoiler></spoiler>",
        ],
        [
            ">!>!>! foo\n>! bar\n>!>!baz",
            "<spoiler><spoiler><spoiler><p>foo\nbar\nbaz</p></spoiler></spoiler></spoiler>",
        ],
        [
            ">!     code\n\n>!    not code",
            "<spoiler><pre><code>code</code></pre></spoiler><spoiler><p>not code</p></spoiler>",
        ],
        [
            "A paragraph\nwith two lines.\n\n    indented code\n\n>! A spoiler.",
            "<p>A paragraph\nwith two lines.</p><pre><code>indented code\n</code></pre><spoiler><p>A spoiler.</p></spoiler>",
        ],
        [
            "1.  A paragraph\n    with two lines.\n\n        indented code\n\n    >! A spoiler.",
            "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code\n</code></pre><spoiler><p>A spoiler.</p></spoiler></li></ol>",
        ],
        [
            "   >! >! 1. one\n>!>!\n>!>!    two",
            "<spoiler><spoiler><ol><li><p>one</p><p>two</p></li></ol></spoiler></spoiler>",
        ],
        [
            ">!>!- one\n>!>!\n  >!  >! two",
            "<spoiler><spoiler><ul><li>one</li></ul><p>two</p></spoiler></spoiler>",
        ],
        [
            "1.  foo\n\n    ```\n    bar\n    ```\n\n    baz\n    >! bam",
            "<ol><li><p>foo</p><pre><code>bar</code></pre><p>baz</p><spoiler><p>bam</p></spoiler></li></ol>",
        ],
        [
            "  1.  A paragraph\n      with two lines.\n\n          indented code\n\n      >! A spoiler.",
            "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><spoiler><p>A spoiler.</p></spoiler></li></ol>",
        ],
        [
            "  1.  A paragraph\n      with two lines.\n\n          indented code\n\n      >! A spoiler.",
            "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><spoiler><p>A spoiler.</p></spoiler></li></ol>",
        ],
        [
            "   1.  A paragraph\n       with two lines.\n\n           indented code\n\n       >! A spoiler.",
            "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><spoiler><p>A spoiler.</p></spoiler></li></ol>",
        ],
        [
            ">! 1. >! Spoiler\ncontinued here.",
            "<spoiler><ol><li><spoiler><p>Spoiler\ncontinued here.</p></spoiler></li></ol></spoiler>",
        ],
        [
            ">! 1. >! Spoiler\n>! continued here.",
            "<spoiler><ol><li><spoiler><p>Spoiler\ncontinued here.</p></spoiler></li></ol></spoiler>",
        ],
        [
            "* a\n  >! b\n  >!\n* c",
            "<ul><li>a\n<spoiler><p>b</p></spoiler></li><li>c</li></ul>",
        ],
        [
            "- a\n  >! b\n  ```\n  c\n  ```\n- d",
            "<ul><li>a\n<spoiler><p>b</p></spoiler><pre><code>c\n</code></pre></li><li>d</li></ul>",
        ],
    ];

    it.each(spoilerTests)(
        'should behave like blockquote: "%s"',
        (markdown, expected) => {
            let rendered = instance.render(markdown);
            // TODO is whitespace important? should we not be stripping it?
            expect(normalize(rendered)).toBe(normalize(expected));

            // now, replace the `>!` and `spoiler` with `>` and `blockquote` since we also modified the existing blockquote rule
            rendered = instance.render(markdown.replace(/>!/g, ">"));
            expect(normalize(rendered)).toBe(
                normalize(
                    expected
                        .replace(/<(\/?)spoiler>/g, "<$1blockquote>")
                        .replace(/&gt;!/g, "&gt;")
                )
            );
        }
    );

    const blockquoteTests = [
        [
            ">! foo\n> bar\n>! baz",
            "<spoiler><p>foo</p></spoiler><blockquote><p>bar</p></blockquote><spoiler><p>baz</p></spoiler>",
        ],
    ];

    it.each(blockquoteTests)(
        "should not combine with blockquotes",
        (markdown, expected) => {
            const rendered = instance.render(markdown);
            expect(normalize(rendered)).toBe(normalize(expected));
        }
    );
});
