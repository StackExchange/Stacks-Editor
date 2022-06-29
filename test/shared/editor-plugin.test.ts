import MarkdownIt from "markdown-it";
import { Plugin } from "prosemirror-state";
import { EditorType } from "../../src";
import { ExternalPluginProvider } from "../../src/shared/editor-plugin";
import { testRichTextSchema } from "../rich-text/test-helpers";

const fake1 = <T>() => null as T;
const fake2 = <T>() => null as T;
const fake3 = <T>() => null as T;
const fake4 = <T>() => null as T;
const fake5 = <T>() => null as T;

describe("editor-plugin", () => {
    describe("ExternalPluginProvider", () => {
        it("should construct", () => {
            expect(() => {
                new ExternalPluginProvider(null, null);
            }).not.toThrow();
        });

        it("should aggregate codeblock processors", () => {
            const provider = new ExternalPluginProvider(
                [
                    () => ({}),
                    () => ({
                        codeBlockProcessors: [],
                    }),
                    () => ({
                        codeBlockProcessors: [
                            { lang: "lang1", callback: fake1 },
                            { lang: "lang1", callback: fake5 },
                            { lang: "*", callback: fake2 },
                        ],
                    }),
                    () => ({
                        codeBlockProcessors: [
                            { lang: "lang2", callback: fake3 },
                            { lang: "*", callback: fake4 },
                        ],
                    }),
                ],
                null
            );

            expect(provider.codeblockProcessors).toEqual({
                "lang1": [fake1, fake5],
                "lang2": [fake3],
                "*": [fake2, fake4],
            });
        });

        it("should aggregate EditorView plugins", () => {
            const plugin1 = new Plugin({});
            const plugin2 = new Plugin({});
            const plugin3 = new Plugin({});
            const plugin4 = new Plugin({});

            const provider = new ExternalPluginProvider(
                [
                    () => ({}),
                    () => ({
                        commonmark: {},
                        richText: {},
                    }),
                    () => ({
                        commonmark: { plugins: [plugin1] },
                        richText: { plugins: [plugin2] },
                    }),
                    () => ({
                        commonmark: { plugins: [plugin3] },
                        richText: { plugins: [plugin4] },
                    }),
                    () => ({
                        commonmark: { plugins: [plugin2] },
                    }),
                    () => ({
                        richText: { plugins: [plugin1] },
                    }),
                ],
                null
            );

            expect(provider.plugins.commonmark).toEqual([
                plugin1,
                plugin3,
                plugin2,
            ]);
            expect(provider.plugins.richText).toEqual([
                plugin2,
                plugin4,
                plugin1,
            ]);
        });

        it("should aggregate nodeViews", () => {
            const provider = new ExternalPluginProvider(
                [
                    () => ({}),
                    () => ({
                        richText: {
                            nodeViews: {
                                node1: fake1,
                            },
                        },
                    }),
                    () => ({
                        richText: {
                            nodeViews: {
                                node2: fake2,
                            },
                        },
                    }),
                    () => ({
                        richText: {
                            nodeViews: {
                                node1: fake3,
                            },
                        },
                    }),
                ],
                null
            );

            expect(provider.nodeViews).toEqual({
                node1: fake3,
                node2: fake2,
            });
        });

        it("should aggregate markdown props", () => {
            const provider = new ExternalPluginProvider(
                [
                    () => ({
                        markdown: {
                            parser: {},
                            serializers: {
                                nodes: {},
                                marks: {},
                            },
                        },
                    }),
                    () => ({
                        markdown: {
                            parser: {
                                node1: fake1,
                                node2: fake2,
                            },
                            serializers: {
                                nodes: {
                                    node1: fake1,
                                    node2: fake2,
                                },
                                marks: {
                                    mark1: fake1,
                                    mark2: fake2,
                                },
                            },
                        },
                    }),
                    () => ({
                        markdown: {
                            parser: {
                                node1: fake3,
                                node3: fake4,
                            },
                            serializers: {
                                nodes: {
                                    node1: fake3,
                                    node3: fake4,
                                },
                                marks: {
                                    mark1: fake3,
                                    mark3: fake4,
                                },
                            },
                        },
                    }),
                ],
                null
            );

            expect(provider.markdownProps).toEqual({
                parser: {
                    node1: fake3,
                    node2: fake2,
                    node3: fake4,
                },
                serializers: {
                    nodes: {
                        node1: fake3,
                        node2: fake2,
                        node3: fake4,
                    },
                    marks: {
                        mark1: fake3,
                        mark2: fake2,
                        mark3: fake4,
                    },
                },
            });
        });

        it("should getFinalizedSchema", () => {
            const provider = new ExternalPluginProvider(
                [
                    () => ({
                        extendSchema: (schema) => {
                            expect(schema.nodes.size).toBe(0);

                            // add a new rule for the next to pick up
                            schema.nodes = schema.nodes.addToEnd("node1", {});

                            return schema;
                        },
                    }),
                    () => ({
                        extendSchema: (schema) => {
                            expect(schema.nodes.size).toBe(1);
                            expect(schema.nodes.get("node1")).toBeDefined();

                            return schema;
                        },
                    }),
                ],
                null
            );

            provider.getFinalizedSchema({
                nodes: {},
                marks: {},
            });
        });

        it("should alterMarkdownIt", () => {
            const provider = new ExternalPluginProvider(
                [
                    () => ({
                        markdown: {
                            parser: null,
                            serializers: null,
                            alterMarkdownIt: (instance) => {
                                // bare markdown-it instance only has the "text" inline rule
                                const rules =
                                    instance.inline.ruler.getRules("");
                                expect(rules).toHaveLength(1);

                                // add a new rule for the next to pick up
                                instance.use((plugin) => {
                                    plugin.inline.ruler.push("fake1", fake1);
                                });
                            },
                        },
                    }),
                    () => ({
                        markdown: {
                            parser: null,
                            serializers: null,
                            alterMarkdownIt: (instance) => {
                                // should see the added rule
                                const rules =
                                    instance.inline.ruler.getRules("");
                                expect(rules).toHaveLength(2);
                                expect(rules[1].name).toBe("fake1");
                            },
                        },
                    }),
                ],
                null
            );

            provider.alterMarkdownIt(new MarkdownIt("zero"));
        });

        it("should getFinalizedMenu", () => {
            const provider = new ExternalPluginProvider(
                [
                    () => ({
                        menuItems: () => [
                            {
                                name: "block1",
                                priority: Infinity,
                                entries: [
                                    {
                                        key: "entry1",
                                        richText: fake1,
                                        commonmark: fake2,
                                        label: "entry1",
                                    },
                                ],
                            },
                        ],
                    }),
                    () => ({
                        menuItems: () => [
                            {
                                name: "block1",
                                priority: -100,
                                entries: [
                                    {
                                        key: "entry2",
                                        richText: fake3,
                                        commonmark: fake4,
                                        label: "entry2",
                                    },
                                ],
                            },
                            {
                                name: "block2",
                                priority: 100,
                                entries: [
                                    {
                                        key: "entry3",
                                        richText: fake5,
                                        commonmark: fake1,
                                        label: "entry3",
                                    },
                                ],
                            },
                        ],
                    }),
                ],
                null
            );

            let menu = provider.getFinalizedMenu(
                [],
                EditorType.Commonmark,
                testRichTextSchema
            );
            expect(menu).toHaveLength(4);
            expect(menu[0]).toMatchObject({
                key: "entry3",
                command: fake1,
            });
            expect(menu[1]).toMatchObject({
                key: "spacer",
            });
            expect(menu[2]).toMatchObject({
                key: "entry1",
                command: fake2,
            });
            expect(menu[3]).toMatchObject({
                key: "entry2",
                command: fake4,
            });

            menu = provider.getFinalizedMenu(
                [],
                EditorType.RichText,
                testRichTextSchema
            );
            expect(menu).toHaveLength(4);
            expect(menu[0]).toMatchObject({
                key: "entry3",
                command: fake5,
            });
            expect(menu[1]).toMatchObject({
                key: "spacer",
            });
            expect(menu[2]).toMatchObject({
                key: "entry1",
                command: fake1,
            });
            expect(menu[3]).toMatchObject({
                key: "entry2",
                command: fake3,
            });
        });
    });
});
