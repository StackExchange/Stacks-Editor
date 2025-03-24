import {
    getSnippetMetadata,
    mapMetaLine,
    MetaLine,
    validateMetaLines
} from "../src/common";
import {
    buildSnippetSchema,
    configureBegin, validBegin, validCss, validEnd, validHtml,
    validJs, validSnippetRenderCases
} from "./stack-snippet-helpers";
import {parseSnippetBlockForProsemirror} from "../src/paste-handler";

describe("common functions", () => {
    const schema = buildSnippetSchema();
    describe("getSnippetMetadata", () => {
        it("should return null if empty node provided", () => {
            expect(getSnippetMetadata(null)).toBeNull();
        });

        it("should return null if non-snippet node provided", () => {
            const node = schema.text("Here's a test text node");

            expect(getSnippetMetadata(node)).toBeNull();
        });

        it("should parse begin correctly", () => {
            const validSnippetRaw =
                configureBegin(true, false, null, true, false) +
                validJs +
                validEnd;
            const validSnippet = parseSnippetBlockForProsemirror(
                schema,
                validSnippetRaw
            );

            const metadata = getSnippetMetadata(validSnippet);

            expect(metadata.hide).toBe("true");
            expect(metadata.console).toBe("false");
            expect(metadata.babel).toBe("null");
            expect(metadata.babelPresetReact).toBe("true");
            expect(metadata.babelPresetTS).toBe("false");
        });

        it("should assign an ID if none available", () => {
            const validSnippetRaw = validBegin + validJs + validEnd;
            const validSnippet = parseSnippetBlockForProsemirror(
                schema,
                validSnippetRaw
            );

            const metadata = getSnippetMetadata(validSnippet);

            expect(metadata.id).toBeDefined();
        });

        it("should use an available ID if provided", () => {
            //Parsing markdown auto-generates an ID.
            // Here we want it specified, so we're creating the block by hand
            const langNode =
                schema.nodes.stack_snippet_lang.createChecked(
                    { language: "js" },
                    schema.text("console.log('test');")
                );
            const validSnippet =
                schema.nodes.stack_snippet.createChecked(
                    {
                        id: "1234",
                        babel: "true",
                        babelPresetReact: "true",
                        babelPresetTS: "null",
                        console: "true",
                        hide: "false",
                    },
                    langNode
                );

            const metadata = getSnippetMetadata(validSnippet);

            expect(metadata.id).toBe("1234");
        });

        it.each(validSnippetRenderCases)(
            "should parse language blocks correctly",
            (markdown: string, langs: string[]) => {
                const validSnippet = parseSnippetBlockForProsemirror(
                    schema,
                    markdown
                );

                const metadata = getSnippetMetadata(validSnippet);

                expect(metadata.langNodes).toHaveLength(langs.length);

                for (const lang of langs) {
                    const [langNode] = metadata.langNodes.filter(
                        (l) => l.metaData.language == lang
                    );
                    expect(langNode).toBeDefined();
                    expect(langNode.content).toBeDefined();
                }
            }
        );
    });

    describe("mapMetaLine", () => {
        it("should map a valid end line", () => {
            expect(mapMetaLine({ line: validEnd, index: 4 })).toStrictEqual(
                {
                    type: "end",
                    index: 4,
                }
            );
        });

        it("should map a valid start line", () => {
            const startLine = configureBegin(
                true,
                false,
                null,
                true,
                false
            );

            expect(
                mapMetaLine({ line: startLine, index: 8 })
            ).toStrictEqual({
                type: "begin",
                index: 8,
                hide: "true",
                console: "false",
                babel: "null",
                babelPresetReact: "true",
                babelPresetTS: "false",
            });
        });

        it("should map a valid js lang line", () => {
            expect(
                mapMetaLine({ line: validJs, index: 213 })
            ).toStrictEqual({
                type: "lang",
                index: 213,
                language: "js",
            });
        });

        it("should map a valid html lang line", () => {
            expect(
                mapMetaLine({ line: validHtml, index: 321 })
            ).toStrictEqual({
                type: "lang",
                index: 321,
                language: "html",
            });
        });

        it("should map a valid css lang line", () => {
            expect(
                mapMetaLine({ line: validCss, index: 123 })
            ).toStrictEqual({
                type: "lang",
                index: 123,
                language: "css",
            });
        });
    });

    describe("validateMetaLines", () => {
        it("should validate multiple language blocks", () => {
            const metaLines: MetaLine[] = [
                {
                    type: "begin",
                    index: 1,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "lang", index: 3, language: "js" },
                { type: "lang", index: 4, language: "html" },
                { type: "lang", index: 5, language: "css" },
                { type: "end", index: 7 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBeNull();
            expect(result.valid).toBe(true);
            expect(result.beginIndex).toBe(1);
            expect(result.jsIndex).toBe(3);
            expect(result.htmlIndex).toBe(4);
            expect(result.cssIndex).toBe(5);
            expect(result.endIndex).toBe(7);
        });

        it("should validate a single language block", () => {
            const metaLines: MetaLine[] = [
                {
                    type: "begin",
                    index: 1,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "lang", index: 4, language: "html" },
                { type: "end", index: 7 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBeNull();
            expect(result.valid).toBe(true);
            expect(result.beginIndex).toBe(1);
            expect(result.htmlIndex).toBe(4);
            expect(result.endIndex).toBe(7);
        });

        it("should return invalid with no language block", () => {
            const metaLines: MetaLine[] = [
                {
                    type: "begin",
                    index: 1,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "end", index: 7 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBe("No code block found");
            expect(result.valid).toBe(false);
        });

        it("should not allow duplicate language blocks", () => {
            const metaLines: MetaLine[] = [
                {
                    type: "begin",
                    index: 1,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "lang", index: 4, language: "html" },
                { type: "lang", index: 5, language: "html" },
                { type: "end", index: 7 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBe("Duplicate HTML block");
            expect(result.valid).toBe(false);
        });

        it("should not allow duplicate begin blocks", () => {
            const metaLines: MetaLine[] = [
                {
                    type: "begin",
                    index: 1,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                {
                    type: "begin",
                    index: 2,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "lang", index: 4, language: "html" },
                { type: "lang", index: 5, language: "html" },
                { type: "end", index: 7 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBe("Duplicate Begin block");
            expect(result.valid).toBe(false);
        });

        it("should not allow duplicate end blocks", () => {
            const metaLines: MetaLine[] = [
                { type: "lang", index: 4, language: "html" },
                { type: "end", index: 7 },
                { type: "end", index: 8 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBe("Duplicate End block");
            expect(result.valid).toBe(false);
        });

        it("should clip a valid selection if there are a begin and end block", () => {
            const metaLines: MetaLine[] = [
                {
                    type: "begin",
                    index: 1,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "lang", index: 4, language: "html" },
                { type: "end", index: 7 },
                {
                    type: "begin",
                    index: 8,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "end", index: 9 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBeNull();
            expect(result.valid).toBe(true);
            expect(result.beginIndex).toBe(1);
            expect(result.htmlIndex).toBe(4);
            expect(result.endIndex).toBe(7);
        });

        it("should validate begin comes before end blocks", () => {
            const metaLines: MetaLine[] = [
                {
                    type: "begin",
                    index: 4,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "lang", index: 3, language: "html" },
                { type: "end", index: 1 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBe("Start/end not in correct order");
            expect(result.valid).toBe(false);
        });

        it("should validate lang blocks comes after start", () => {
            const metaLines: MetaLine[] = [
                {
                    type: "begin",
                    index: 2,
                    babel: "true",
                    babelPresetTS: "true",
                    babelPresetReact: "true",
                    hide: "true",
                    console: "true",
                },
                { type: "lang", index: 1, language: "html" },
                { type: "end", index: 5 },
            ];

            const result = validateMetaLines(metaLines);

            expect(result.reason).toBe(
                "Language blocks not within begin/end blocks"
            );
            expect(result.valid).toBe(false);
        });
    });
});
