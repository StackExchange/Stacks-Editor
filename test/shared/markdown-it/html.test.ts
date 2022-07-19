import MarkdownIt from "markdown-it";
import { html } from "../../../src/shared/markdown-it/html";

describe("html markdown-it plugin", () => {
    const instance = new MarkdownIt("default", { html: true });
    instance.use(html);

    describe("html_inline", () => {
        /**
         * Data for html_inline sanitization
         * [markdown, markupInternal, ...expectedTypes]
         */
        const htmlInlineSanitizationData = [
            // basic cases + variants
            [`<del>test</del>`, `del`, `s_open`, `s_close`],
            [`<s>test</s>`, `s`, `s_open`, `s_close`],
            [`<strike>test</strike>`, `strike`, `s_open`, `s_close`],
            [`<i>test</i>`, `i`, `em_open`, `em_close`],
            [`<em>test</em>`, `em`, `em_open`, `em_close`],
            [
                `<code>test</code>`,
                `code`,
                `code_inline_split_open`,
                `code_inline_split_close`,
            ],
            [`<a>test</a>`, `a`, `link_open`, `link_close`],
            [`<kbd>test</kbd>`, `kbd`, `kbd_open`, `kbd_close`],
            [`<sup>test</sup>`, `sup`, `sup_open`, `sup_close`],
            [`<sub>test</sub>`, `sub`, `sub_open`, `sub_close`],
            // self-closed elements are parsed as html_block
            [`<img />`, `img /`, `image`],
            [`<img/>`, `img/`, `image`],
            [`<img>`, `img`, `image`],
            [`<br />`, `br /`, `hardbreak`],
            [`<br/>`, `br/`, `hardbreak`],
            [`<br>`, `br`, `hardbreak`],
        ];

        it.each(htmlInlineSanitizationData)(
            "should sanitize html_inline (test #%#)",
            (
                markdown: string,
                markupInternal: string,
                ...expectedValues: string[]
            ) => {
                const originalTokens = instance.parse(markdown, {});
                let tokens = originalTokens;

                const inlineTokens = tokens.filter((t) => t.type === "inline");

                expect(inlineTokens).toHaveLength(1);
                const parsedHtmlContent = inlineTokens[0].children;

                let expectedLength = expectedValues.length;

                // add 1 to the expected to account for the {text} token on non self-closing tags
                if (expectedValues.length > 1) {
                    expectedLength = expectedValues.length + 1;
                }

                expect(parsedHtmlContent).toHaveLength(expectedLength);

                tokens = parsedHtmlContent;

                let seenIndex = 0;
                for (let i = 0, len = tokens.length; i < len; i++) {
                    const token = tokens[i];

                    if (token.type === "text") {
                        continue;
                    }

                    const expected = expectedValues[seenIndex];

                    const closing = token.nesting === -1 ? "/" : "";
                    const markup = `<${closing}${markupInternal}>`;

                    expect(token.type).toBe(expected);
                    expect(token.markup).toBe(markup);

                    seenIndex += 1;
                }
            }
        );

        /**
         * Data for html_inline sanitization w/ attributes
         * [markdown, ...expected attribute key/value]
         */
        const htmlInlineAttributesData = [
            // supported image tag with all the fixin's
            [
                `<img width=10 height="10" style="background: red; padding: 20px;" alt="testme" src="something" title="testalso">`,
                ["src", "something"],
                ["height", "10"],
                ["width", ""],
                ["alt", "testme"],
                ["title", "testalso"],
            ],
            // supported image tag, but vary the self closing to attempt to trip up detection
            [
                `<img height="10" >`,
                ["src", ""],
                ["height", "10"],
                ["width", ""],
                ["alt", ""],
                ["title", ""],
            ],
            [
                `<img height="10" />`,
                ["src", ""],
                ["height", "10"],
                ["width", ""],
                ["alt", ""],
                ["title", ""],
            ],
            [
                `<img height="10"/>`,
                ["src", ""],
                ["height", "10"],
                ["width", ""],
                ["alt", ""],
                ["title", ""],
            ],
            // supported a tag with all the fixin's ("inline_html" is added by the sanitizer)
            [
                `<a href="#" title="test" bad="notreal">test</a>`,
                ["href", "#"],
                ["title", "test"],
                ["inline_html", "true"],
            ],
            // supported tag, duplicate values (first declared "wins")
            [
                `<a href="#1" href="#2">test</a>`,
                ["href", "#1"],
                ["title", ""],
                ["inline_html", "true"],
            ],
        ];

        it.each(htmlInlineAttributesData)(
            "should parse markdown with specific attributes (test #%#)",
            (markdown: string, ...attributes: Array<[string, string]>) => {
                const tokens = instance.parse(markdown, {});

                // tokens will look like [p, inline{children: [target, ...]}, p]
                const target = tokens?.[1]?.children?.[0];

                expect(target).not.toBeNull();

                expect(target.attrs).toHaveLength(attributes.length);
                attributes.forEach((attr) => {
                    expect(target.attrGet(attr[0])).toBe(attr[1]);
                });
            }
        );

        it.todo("should parse markdown inside html_inline");

        it("should handle dangling open/close inline tags", () => {
            // dangling open tag
            let markdown = `<em>test`;
            let tokens = instance.parse(markdown, {});

            expect(tokens).toHaveLength(3);
            expect(tokens[1].type).toBe("inline");
            expect(tokens[1].children).toHaveLength(2);
            expect(tokens[1].children[0].type).toBe("html_inline");
            expect(tokens[1].children[0].content).toBe("<em>");
            expect(tokens[1].children[1].type).toBe("text");
            expect(tokens[1].children[1].content).toBe("test");

            // dangling close tag
            markdown = `test</em>`;
            tokens = instance.parse(markdown, {});

            expect(tokens).toHaveLength(3);
            expect(tokens[1].type).toBe("inline");
            expect(tokens[1].children).toHaveLength(2);
            expect(tokens[1].children[0].type).toBe("text");
            expect(tokens[1].children[0].content).toBe("test");
            expect(tokens[1].children[1].type).toBe("html_inline");
            expect(tokens[1].children[1].content).toBe("</em>");
        });

        it("should only transform inline html all on the same line", () => {
            const markdown = `<sub>\ntest\n</sub>`;
            const tokens = instance.parse(markdown, {});
            expect(tokens).toHaveLength(1);
            expect(tokens[0].type).toBe("html_block");
        });

        it("should handle nested inline tags of the same type", () => {
            const markdown = `<sub>1<sub>2</sub>3</sub>`;
            const tokens = instance.parse(markdown, {});
            expect(tokens).toHaveLength(3);
            const inline = tokens[1];
            expect(inline.type).toBe("inline");
            expect(inline.children).toHaveLength(7);
            expect(inline.children[0].type).toBe("sub_open");
            expect(inline.children[1].type).toBe("text");
            expect(inline.children[2].type).toBe("sub_open");
            expect(inline.children[3].type).toBe("text");
            expect(inline.children[4].type).toBe("sub_close");
            expect(inline.children[5].type).toBe("text");
            expect(inline.children[6].type).toBe("sub_close");
        });
    });

    describe("html_block", () => {
        /**
         * Test data for simple html_block parsing
         * [markdown, markupInternal, ...expectedTypes]
         */
        const htmlSimpleBlockData = [
            [`<h1>test</h1>`, "h1", `heading_open`, `heading_close`],
            [`<h2>test</h2>`, "h2", `heading_open`, `heading_close`],
            [`<h3>test</h3>`, "h3", `heading_open`, `heading_close`],
            [`<h4>test</h4>`, "h4", `heading_open`, `heading_close`],
            [`<h5>test</h5>`, "h5", `heading_open`, `heading_close`],
            [`<h6>test</h6>`, "h6", `heading_open`, `heading_close`],
            [`<p>test</p>`, "p", `paragraph_open`, `paragraph_close`],
            [`<hr />`, "hr /", `hr`],
            [`<hr/>`, "hr/", `hr`],
            [`<hr>`, "hr", `hr`],
            [
                `<blockquote>test</blockquote>`,
                "blockquote",
                `blockquote_open`,
                `blockquote_close`,
            ],
            [
                `<ul>test</ul>`,
                "ul",
                `unordered_list_open`,
                `unordered_list_close`,
            ],
            [`<ol>test</ol>`, "ol", `ordered_list_open`, `ordered_list_close`],
            [`<li>test</li>`, "li", `list_item_open`, `list_item_close`],
            [`<pre>test</pre>`, `pre`, `pre_open`, `pre_close`],
            // TODO dd, dl, dt not implemented as distinct nodes in schema
        ];

        it.each(htmlSimpleBlockData)(
            "should parse simple html_block tokens (test #%#)",
            (
                input: string,
                markupInternal: string,
                ...expectedValues: string[]
            ) => {
                const tokens = instance.parse(input, {});

                // there should be *no* html_block tokens after simple sanitization
                const htmlBlockTokens = tokens.filter((t) =>
                    t.type.includes("html_block")
                );

                expect(htmlBlockTokens).toHaveLength(0);

                let seenIndex = 0;
                for (let i = 0, len = tokens.length; i < len; i++) {
                    const token = tokens[i];

                    if (
                        token.type === "inline" ||
                        token.type.includes("paragraph")
                    ) {
                        continue;
                    }

                    const expected = expectedValues[seenIndex];

                    const closing = token.nesting === -1 ? "/" : "";
                    const markup = `<${closing}${markupInternal}>`;

                    expect(token.type).toBe(expected);
                    expect(token.markup).toBe(markup);

                    seenIndex += 1;
                }
            }
        );

        /**
         * Test data for html_block sanitization
         * [input, ...expected_per_html_block]
         */
        const htmlBlockSanitizationData = [
            // basic test
            [`<div><h1>test</h1></div>`, `<h1>test</h1>`],
            // remove both open and close tags
            [`<div>\n<h1>test</h1>`, `\n<h1>test</h1>`],
            [`<h1>test</h1></div>`, `<h1>test</h1>`],
            // completely sanitized (no html left) returns text (no html_blocks)
            [`<div>test</div>` /*, no output */],
            // no `html_blocks`, nothing is sanitized
            [`` /*, no output */],
            [`<em>test</em>` /*, no output */],
            // don't sanitize supported tags adding text after each so
            // they don't get pre-sanitized by the "simple" block converter
            [`<!-- comment -->asdf`, `<!-- comment -->asdf`],
            [`<h1>test</h1>asdf`, `<h1>test</h1>asdf`],
            [`<h2>test</h2>asdf`, `<h2>test</h2>asdf`],
            [`<h3>test</h3>asdf`, `<h3>test</h3>asdf`],
            [`<h4>test</h4>asdf`, `<h4>test</h4>asdf`],
            [`<h5>test</h5>asdf`, `<h5>test</h5>asdf`],
            [`<h6>test</h6>asdf`, `<h6>test</h6>asdf`],
            [`<p>test</p>asdf`, `<p>test</p>asdf`],
            [`<hr />asdf`, `<hr />asdf`],
            [`<hr/>asdf`, `<hr/>asdf`],
            [`<hr>asdf`, `<hr>asdf`],
            [
                `<blockquote>test</blockquote>asdf`,
                `<blockquote>test</blockquote>asdf`,
            ],
            [`<ul><li>test</li></ul>`, `<ul><li>test</li></ul>`],
            [`<ol><li>test</li></ol>`, `<ol><li>test</li></ol>`],
            [`<ol><li>test</li></ol>`, `<ol><li>test</li></ol>`],
            [
                `<dl><dt>test</dt><dd>test</dd></dl>`,
                `<dl><dt>test</dt><dd>test</dd></dl>`,
            ],
            // remove tags with attributes, etc
            [
                `<div class="yo" data-test="note the trailing space!" ><h1>test</h1></div>`,
                `<h1>test</h1>`,
            ],
            // remove invalid end tags
            [`<div>test</div lol="gotcha">` /*, no content */],
            [`<div><h1>test</h1 lol="gotcha"></div>`, `<h1>test</h1>`],
            // remove repeated tags
            [
                `<div>test</div>\n<h1>test</h1>\n<div>this</div>`,
                `test\n<h1>test</h1>\nthis`,
            ],
            // remove unknown block tags (multiline)
            [
                `<div>\n*test*\n</div>\n<blockquote>also a test</blockquote>`,
                `\n*test*\n\n<blockquote>also a test</blockquote>`,
            ],
            // remove unknown inline tags (inside blocks)
            [
                `<div>\n<span>*test*</span>\n</div>\n<blockquote>also a test</blockquote>`,
                `\n*test*\n\n<blockquote>also a test</blockquote>`,
            ],
            // sanitize `html_block_container`s
            [
                `<blockquote><div><pre>*test*\n\n_hello world_.\n</pre>\n</div>\n</blockquote>`,
                `<blockquote><pre>*test*\n`,
                `\n</blockquote>`,
            ],
        ];

        it.each(htmlBlockSanitizationData)(
            "should sanitize invalid html_block tags (test #%#)",
            (markdown: string, ...expectedValues: string[]) => {
                const tokens = instance.parse(markdown, {});
                // only the html_block* tokens get sanitized, ignore any others
                const blockTokensOnly = tokens.filter(
                    (t) => t.type.indexOf("html_block") === 0
                );

                expect(blockTokensOnly).toHaveLength(expectedValues.length);

                for (
                    let i = 0, j = 0, len = blockTokensOnly.length;
                    i < len;
                    i++, j++
                ) {
                    const token = blockTokensOnly[i];

                    // HACK it's easier to do this since the logic is in a for loop and can differ per item
                    /* eslint-disable jest/no-conditional-expect */
                    if (token.type === "html_block") {
                        expect(token.content).toBe(expectedValues[j]);
                    } else if (token.type === "html_block_container_open") {
                        expect(token.attrGet("contentOpen")).toBe(
                            expectedValues[j]
                        );
                        expect(token.attrGet("contentClose")).toBe(
                            expectedValues[j + 1]
                        );
                        j++;
                    }
                    /* eslint-enable jest/no-conditional-expect */
                }
            }
        );

        /**
         * Test data for html_block attribute sanitization
         * [markdown, expected html_block.content]
         * values are wrapped in <p>s to force "complex" html_block parsing
         */
        const htmlBlockAttributeSanitizationData = [
            // supported image tag w/ mix of (un)supported attributes
            [
                `<p><img width=10 height="10" style="background: red; padding: 20px;" alt="testme" src="something" title="testalso"></p>`,
                `<p><img height="10" alt="testme" src="something" title="testalso"></p>`,
            ],
            // supported image tag, but vary the self closing to attempt to trip up detection
            [`<p><img width=10 height="10" ></p>`, `<p><img height="10" ></p>`],
            [
                `<p><img width=10 height="10" /></p>`,
                `<p><img height="10" /></p>`,
            ],
            [`<p><img width=10 height="10"/></p>`, `<p><img height="10"/></p>`],
            // supported a tag w/ mix of (un)supported attributes
            [
                `<p><a href=# href="#" href="test" title="asdf">test</a></p>`,
                `<p><a href="#" href="test" title="asdf">test</a></p>`,
            ],
            // supported tag w/ no supported attributes
            [
                `<p><h1 attr1="aaa" title="check">test</h1></p>`,
                `<p><h1>test</h1></p>`,
            ],
            // unsupported tag
            [
                `<div attr1="aaa" title="check"><h1>test</h1></div>`,
                `<h1>test</h1>`,
            ],
        ];

        it.each(htmlBlockAttributeSanitizationData)(
            "should sanitize attributes on tags within html_block content (test #%#)",
            (markdown: string, content: string) => {
                const tokens = instance.parse(markdown, {});

                expect(tokens).toHaveLength(1);
                expect(tokens[0].type).toBe("html_block");
                expect(tokens[0].content).toBe(content);
            }
        );

        it("should change to text if no html is left after sanitization", () => {
            const markdown = "<div>test</div>";
            const tokens = instance.parse(markdown, {});

            expect(tokens).toHaveLength(3);
            expect(tokens[0].type).toBe("paragraph_open");
            expect(tokens[1].type).toBe("inline");
            expect(tokens[1].children).toHaveLength(1);
            expect(tokens[1].children[0].type).toBe("text");
            expect(tokens[1].children[0].content).toBe("test");
            expect(tokens[2].type).toBe("paragraph_close");
        });

        it("should remove the block if nothing is left after sanitization", () => {
            const markdown = "<div></div>";
            const tokens = instance.parse(markdown, {});

            expect(tokens).toHaveLength(0);
        });
    });

    describe("html_block_container", () => {
        const htmlBlockData = [
            `<p>asdf</p>\n`,
            `<p>\n`,
            `</p>`,
            `<p`,
            `<!--\n\nasdf\n\n-->`,
        ];

        it.each(htmlBlockData)(
            "should not mistake html_block for html_block_container (test #%#)",
            (markdown) => {
                const tokens = instance.parse(markdown, {});
                expect(tokens).toHaveLength(1);
                expect(tokens[0].type).toBe("html_block");
            }
        );

        it("should parse and coerce complex/split html_blocks", () => {
            // since there's a newline, the html block will be interrupted (splitting it! see unalteredInstance result below)
            // therefore, the `**Hello**` will NOT be parsed, but the `_world_` WILL be
            const markdown = `
<blockquote>
<pre>
**Hello**,

_world_.
</pre>
</blockquote>`;

            // first, parse without our html plugin to confirm that the blocks do indeed split
            const unalteredInstance = new MarkdownIt("default", { html: true });
            let tokens = unalteredInstance.parse(markdown, {});

            expect(tokens).toHaveLength(5);
            expect(tokens[0].type).toBe("html_block");
            expect(tokens[0].content).toBe("<blockquote>\n<pre>\n**Hello**,\n");
            expect(tokens[1].type).toBe("paragraph_open");
            expect(tokens[2].type).toBe("inline");
            expect(tokens[2].content).toBe("_world_.\n</pre>");
            expect(tokens[3].type).toBe("paragraph_close");
            expect(tokens[4].type).toBe("html_block");
            expect(tokens[4].content).toBe("</blockquote>");

            // expect the tokens to be grouped under a container
            tokens = instance.parse(markdown, {});
            expect(tokens).toHaveLength(5);
            expect(tokens[0].type).toBe("html_block_container_open");
            expect(tokens[0].attrGet("contentOpen")).toBe(
                "<blockquote>\n<pre>\n**Hello**,\n"
            );
            expect(tokens[1].type).toBe("paragraph_open");
            expect(tokens[2].type).toBe("inline");
            expect(tokens[2].content).toBe("_world_.\n</pre>");
            expect(tokens[3].type).toBe("paragraph_close");
            expect(tokens[4].type).toBe("html_block_container_close");
            expect(tokens[0].attrGet("contentClose")).toBe("</blockquote>");
        });

        enum HtmlBlockType {
            Block,
            ContainerOpen,
            ContainerClose,
        }

        /** Data is of format [description (for logging), entry markdown, ordering] */
        const splitHtmlTestData = [
            [
                "one block, no interruptions",
                `<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>`,
                [HtmlBlockType.Block],
            ],
            [
                "one block, interrupted",
                `<blockquote>
<pre>
**Hello**,

_world_.
</pre>
</blockquote>`,
                [HtmlBlockType.ContainerOpen, HtmlBlockType.ContainerClose],
            ],
            [
                `"two" blocks, uninterrupted`,
                `<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>
<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>`,
                [HtmlBlockType.Block],
            ],
            [
                "two distinct blocks",
                `<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>

<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>`,
                [HtmlBlockType.Block, HtmlBlockType.Block],
            ],
            [
                "three distinct blocks (non-paired)",
                `<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>

<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>

<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>`,
                [HtmlBlockType.Block, HtmlBlockType.Block, HtmlBlockType.Block],
            ],
            [
                "one distinct block (prepended), one interrupted",
                `<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>

<blockquote>
<pre>
**Hello**,

_world_.
</pre>
</blockquote>`,
                [
                    HtmlBlockType.Block,
                    HtmlBlockType.ContainerOpen,
                    HtmlBlockType.ContainerClose,
                ],
            ],
            [
                "one distinct block (appended), one interrupted",
                `<blockquote>
<pre>
**Hello**,

_world_.
</pre>
</blockquote>

<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>`,
                [
                    HtmlBlockType.ContainerOpen,
                    HtmlBlockType.ContainerClose,
                    HtmlBlockType.Block,
                ],
            ],
            [
                "one interrupted containing one distinct",
                `<blockquote>
<pre>
**Hello**,

<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>

_world_.
</pre>
</blockquote>`,
                [
                    HtmlBlockType.ContainerOpen,
                    HtmlBlockType.Block,
                    HtmlBlockType.ContainerClose,
                ],
            ],
            [
                "one distinct followed by non-html paragraph (followed by distinct so pairing kicks in)",
                `<blockquote>
<pre>
**Hello**,
_world_.
</pre>
</blockquote>

some text

</blockquote>`,
                [HtmlBlockType.Block, HtmlBlockType.Block],
            ],
        ];

        it.each(splitHtmlTestData)(
            "should correctly differentiate split/non-split html_blocks: %s",
            (_: string, markdown: string, ordering: HtmlBlockType[]) => {
                const tokens = instance.parse(markdown, {});

                const receivedOrdering: HtmlBlockType[] = [];

                tokens.forEach((t) => {
                    if (t.type === "html_block") {
                        receivedOrdering.push(HtmlBlockType.Block);
                    } else if (t.type === "html_block_container_open") {
                        receivedOrdering.push(HtmlBlockType.ContainerOpen);
                    } else if (t.type === "html_block_container_close") {
                        receivedOrdering.push(HtmlBlockType.ContainerClose);
                    }
                });

                expect(receivedOrdering).toEqual(ordering);
            }
        );
    });
});
