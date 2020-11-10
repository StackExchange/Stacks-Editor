import { buildMarkdownParser } from "../../src/shared/markdown-parser";
import { richTextSchema } from "../../src/shared/schema";
import "../matchers";

const markdownParser = buildMarkdownParser(
    {
        snippets: true,
        html: true,
    },
    richTextSchema,
    null
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

        it.skip("should support block html with inline nesting", () => {
            //const doc = markdownParser.parse("<h1><em>test</em></h1>");
        });

        it.skip("should support block html with block nesting", () => {
            //const doc = markdownParser.parse("<ul><li>test</li></ul>");
        });

        it.skip("should support block html with mixed nesting", () => {
            // const doc = markdownParser.parse(
            //     "<h1><strong>str</strong><p>test</p></h1>"
            // );
        });

        it.skip("should support block html with deep nesting", () => {
            //const doc = markdownParser.parse("<ul><li><em>test</em></li></ul>");
        });
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
});
