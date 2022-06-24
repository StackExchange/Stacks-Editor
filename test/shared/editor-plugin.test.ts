import MarkdownIt from "markdown-it";
import { Plugin } from "prosemirror-state";
import { ExternalPluginProvider } from "../../src/shared/editor-plugin";

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

        it.todo("should getFinalizedSchema");

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

        it.todo("should getFinalizedMenu");
    });
});
