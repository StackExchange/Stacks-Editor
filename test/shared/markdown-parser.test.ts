/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Mark } from "prosemirror-model";
import { buildMarkdownParser } from "../../src/shared/markdown-parser";
import { stackOverflowValidateLink } from "../../src/shared/utils";
import { CommonmarkParserFeatures } from "../../src/shared/view";
import { testRichTextSchema } from "../rich-text/test-helpers";
import { externalPluginProvider } from "../test-helpers";

// mark features as required to ensure our tests have all the features set
const features: Required<CommonmarkParserFeatures> = {
    snippets: true,
    html: true,
    extraEmphasis: true,
    tables: true,
    tagLinks: {},
    validateLink: stackOverflowValidateLink,
};

const markdownParser = buildMarkdownParser(
    features,
    testRichTextSchema,
    externalPluginProvider()
);

describe("SOMarkdownParser", () => {
    describe("html support", () => {
        it.skip("should support inline html", () => {
            const doc = markdownParser.parse("<strong>test</strong>");

            expect(doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                        "content": [
                            {
                                "type.name": "html_inline",
                                "childCount": 1,
                                "content": [
                                    {
                                        "isText": true,
                                        "text": "test",
                                        "marks.length": 1,
                                        "marks.0.type.name": "strong",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("should support html comments", () => {
            const doc = markdownParser.parse(`<!-- an html comment -->`);
            expect(doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "html_comment",
                        "attrs.content": "<!-- an html comment -->",
                    },
                ],
            });
        });

        it.skip("should support single block html without nesting", () => {
            const doc = markdownParser.parse("<h1>test</h1>");

            expect(doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "html_block",
                        "childCount": 1,
                        "content": [
                            {
                                "type.name": "heading",
                                "childCount": 1,
                                "content": [
                                    {
                                        isText: true,
                                        text: "test",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        //const doc = markdownParser.parse("<h1><em>test</em></h1>");
        it.todo("should support block html with inline nesting");

        //const doc = markdownParser.parse("<ul><li>test</li></ul>");
        it.todo("should support block html with block nesting");

        // const doc = markdownParser.parse("<h1><strong>str</strong><p>test</p></h1>");
        it.todo("should support block html with mixed nesting");

        //const doc = markdownParser.parse("<ul><li><em>test</em></li></ul>");
        it.todo("should support block html with deep nesting");
    });

    // NOTE: detailed / edge case testing is done in the plugin specific tests,
    // these tests simply check that the correct Prosemirror nodes are generated for use in the editor
    describe("custom markdown plugins", () => {
        it.skip("should support stack snippets", () => {
            const doc = markdownParser.parse(`
<!-- begin snippet: js hide: true console: true babel: true -->

\`\`\`html
<h1>test</h1>
\`\`\`

\`\`\`css
h1 {
    color: red;
}
\`\`\`

\`\`\`js
console.log("test");
\`\`\`

<!-- end snippet -->
            `);

            expect(doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "stack_snippet",
                        "childCount": 3,
                        "attrs.data": "js hide: true console: true babel: true",
                        "content": [
                            {
                                "type.name": "code_block",
                                "attrs.params": "html",
                                "childCount": 1,
                                "content": [
                                    {
                                        "type.name": "text",
                                        "text": "<h1>test</h1>",
                                    },
                                ],
                            },
                            {
                                "type.name": "code_block",
                                "attrs.params": "css",
                                "childCount": 1,
                                "content": [
                                    {
                                        "type.name": "text",
                                        "text": "h1 {\n    color: red;\n}",
                                    },
                                ],
                            },
                            {
                                "type.name": "code_block",
                                "attrs.params": "js",
                                "childCount": 1,
                                "content": [
                                    {
                                        "type.name": "text",
                                        "text": 'console.log("test");',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("should support stack language(-all) comments", () => {
            const doc = markdownParser.parse(`
<!-- language-all: lang-python -->
<!-- language: lang-js -->
    console.log("test");
            `);

            expect(doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "code_block",
                        "attrs.params": "js",
                        "childCount": 1,
                        "content": [
                            {
                                "type.name": "text",
                                "text": 'console.log("test");',
                            },
                        ],
                    },
                ],
            });
        });

        it("should parse tag links", () => {
            const doc = markdownParser.parse("[tag:python]");

            expect(doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                        "content": [
                            {
                                "type.name": "tagLink",
                                "childCount": 1,
                                "content": [{ text: "python" }],
                            },
                        ],
                    },
                ],
            });
        });

        it("should not parse tag links", () => {
            const mdParserWithoutTagLinks = buildMarkdownParser(
                {},
                testRichTextSchema,
                externalPluginProvider()
            );
            const doc = mdParserWithoutTagLinks.parse("[tag:python]");

            expect(doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "paragraph",
                        "childCount": 1,
                        "content": [
                            {
                                "type.name": "text",
                                "text": "[tag:python]",
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("softbreaks", () => {
        it("should be parsed as nodes containing a space", () => {
            const doc = markdownParser.parse("test1\ntest2");

            expect(doc).toMatchNodeTree({
                childCount: 1,
                content: [
                    {
                        "type.name": "paragraph",
                        "childCount": 3,
                        "content": [
                            {
                                isText: true,
                                text: "test1",
                            },
                            {
                                "type.name": "softbreak",
                                "childCount": 1,
                                "content": [
                                    {
                                        "type.name": "text",
                                        "text": " ",
                                    },
                                ],
                            },
                            {
                                isText: true,
                                text: "test2",
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("autolinking", () => {
        it.each([
            "https://www.test.com/?param=test",
            "mailto:test@example.com",
            "ftp://example.com/path/to/file",
        ])("should autolink valid links (%s)", (input) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const doc = markdownParser.parse(input).toJSON();
            expect(doc.content[0].type).toBe("paragraph");
            expect(doc.content[0].content).toHaveLength(1);
            expect(doc.content[0].content[0].text).toBe(input);
            expect(doc.content[0].content[0].marks[0].type).toBe("link");
        });

        it.each([
            "file://invalid",
            "://inherit_scheme.com",
            "invalid.com",
            "test@example.com",
            "127.0.0.1",
        ])("should not autolink invalid links (%s)", (input) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const doc = markdownParser.parse(input).toJSON();
            expect(doc.content[0].type).toBe("paragraph");
            expect(doc.content[0].content).toHaveLength(1);
            expect(doc.content[0].content[0].text).toBe(input);
            expect(doc.content[0].content[0].marks).toBeUndefined();
        });
    });

    describe("lists", () => {
        it.each([
            ["- test1\n- test2", true],
            ["- test1\n\n- test2", false],
            ["1. test1\n1. test2", true],
            ["1. test1\n\n1. test2", false],
        ])("should parse tight/loose lists", (input, isTight) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const doc = markdownParser.parse(input).toJSON();
            expect(doc.content[0].type).toContain("_list");
            expect(doc.content[0].attrs.tight).toBe(isTight);
        });

        it.each([
            [`- > blockquote in list`, "bullet_list>list_item>blockquote"],
            [`- paragraph in list`, "bullet_list>list_item>paragraph"],
            [`- # heading in list`, "bullet_list>list_item>heading"],
            [
                `- ~~~\n  code in list\n  ~~~`,
                "bullet_list>list_item>code_block",
            ],
            [`- - list in list`, "bullet_list>list_item>bullet_list"],
        ])(
            "should parse lists with direct block children",
            (input, expected) => {
                const doc = markdownParser.parse(input);
                expect(doc).toMatchNodeTreeString(expected);
            }
        );
    });

    describe("reference links", () => {
        const referenceLinkData = [
            // full
            [`[foo][bar]\n\n[bar]: /url "title"`, "full", "bar"],
            [`[foo][BaR]\n\n[bar]: /url "title"`, "full", "BaR"],
            // collapsed
            [`[foo][]\n\n[foo]: /url "title"`, "collapsed", "foo"],
            // shortcut
            [`[foo]\n\n[foo]: /url "title"`, "shortcut", "foo"],
        ];
        it.each(referenceLinkData)(
            "should add reference attributes to reference links",
            (input, type, label) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const doc = markdownParser.parse(input).toJSON();
                expect(doc.content[0].type).toBe("paragraph");
                expect(doc.content[0].content).toHaveLength(1);

                const mark = doc.content[0].content[0].marks[0] as Mark;
                expect(mark.type).toBe("link");
                expect(mark.attrs.referenceType).toBe(type);
                expect(mark.attrs.referenceLabel).toBe(label);
            }
        );

        const referenceImageData = [
            // full
            [`![foo][bar]\n\n[bar]: /url "title"`, "full", "bar"],
            [`![foo][BaR]\n\n[bar]: /url "title"`, "full", "BaR"],
            // collapsed
            [`![foo][]\n\n[foo]: /url "title"`, "collapsed", "foo"],
            // shortcut
            [`![foo]\n\n[foo]: /url "title"`, "shortcut", "foo"],
        ];
        it.each(referenceImageData)(
            "should add reference attributes to reference images",
            (input, type, label) => {
                const doc = markdownParser.parse(input);

                expect(doc).toMatchNodeTree({
                    content: [
                        {
                            "type.name": "paragraph",
                            "content": [
                                {
                                    "type.name": "image",
                                    "attrs.referenceType": type,
                                    "attrs.referenceLabel": label,
                                },
                            ],
                        },
                    ],
                });
            }
        );
    });

    describe("parserFeatures", () => {
        it("should allow a custom validateLink", () => {
            const mdParser = buildMarkdownParser(
                {
                    ...features,
                    // only allow links from www.example.com
                    validateLink: (url) => /www.example.com/.test(url),
                },
                testRichTextSchema,
                externalPluginProvider()
            );
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const doc = mdParser
                .parse(
                    "[foo](www.example.com/test1) [bar](www.notexample.com/test2)"
                )
                .toJSON();
            expect(doc.content[0].content).toHaveLength(2);
            expect(doc.content[0].content[0].text).toBe("foo");
            expect(doc.content[0].content[0].marks[0].type).toBe("link");
            expect(doc.content[0].content[1].text).toBe(
                " [bar](www.notexample.com/test2)"
            );
            expect(doc.content[0].content[1].marks).toBeUndefined();
        });
    });

    describe("headings", () => {
        it.each([
            // hard breaks
            ["# heading <br> test", ["text", "hard_break", "text"]],
            ["heading  \ntest\n---", ["text", "hard_break", "text"]],
            // soft breaks
            ["heading\ntest\n---", ["text", "softbreak", "text"]],
            // images
            [
                "# heading ![alt](http://www.example.com/image.png)",
                ["text", "image"],
            ],
        ])("should allow all inline nodes", (input, childNodeTypes) => {
            const doc = markdownParser.parse(input);

            expect(doc).toMatchNodeTree({
                "type.name": "doc",
                "content": [
                    {
                        "type.name": "heading",
                        "content": [
                            ...childNodeTypes.map((t) => ({
                                "type.name": t,
                            })),
                        ],
                    },
                ],
            });
        });
    });

    describe("code blocks", () => {
        it.each([
            ["    indented code", { markup: "indented", params: "" }],
            ["```\nfence 1\n```", { markup: "```", params: "" }],
            ["~~~\nfence 2\n~~~", { markup: "~~~", params: "" }],
            ["```js\nfence with lang\n```", { markup: "```", params: "js" }],
        ])(
            "should parse indented code and code fences (%#)",
            (input, attrs) => {
                const doc = markdownParser.parse(input);

                expect(doc).toMatchNodeTree({
                    "type.name": "doc",
                    "content": [
                        {
                            "type.name": "code_block",
                            "attrs.markup": attrs.markup,
                            "attrs.params": attrs.params,
                        },
                    ],
                });
            }
        );
    });
});
