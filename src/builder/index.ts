import { Schema } from "prosemirror-model";
import { basePlugin } from "../plugins/base";
import { stacksPlugin } from "../plugins/stacks-plugin";
import { deepMerge } from "../shared/utils";
import { BaseEditor } from "./internal/base-editor";
import {
    AggregatedEditorPlugin,
    BaseOptions,
    EditorConstructor,
    EditorPlugin,
    MenuBlock,
} from "./types";

export class EditorBuilder<TOptions extends BaseOptions> {
    private addedPlugins: Map<string, EditorPlugin>;

    constructor() {
        this.addedPlugins = new Map<string, EditorPlugin>();
    }

    public add<T>(
        name: string,
        plugin: EditorPlugin<T>
    ): EditorBuilder<{
        [Prop in keyof (TOptions & T)]: (TOptions & T)[Prop];
    }> {
        this.addedPlugins.set(name, plugin);
        return this;
    }

    // TODO remove options
    public remove(name: string): EditorBuilder<TOptions> {
        this.addedPlugins.delete(name);
        return this;
    }

    // TODO
    public build(): EditorConstructor<TOptions> {
        const plugin = EditorBuilder.aggregatePlugins(this.addedPlugins);

        return BaseEditor.bind(null, plugin) as EditorConstructor<TOptions>;
    }

    private static aggregatePlugins<T>(
        addedPlugins: Map<string, EditorPlugin<unknown>>
    ): AggregatedEditorPlugin<T> {
        type X = Omit<
            MakeArray<EditorPlugin<T>>,
            "optionDefaults" | "events"
        > & { optionDefaults: unknown } & {
            events: MakeArray<EditorPlugin<T>["events"]>;
        };

        const aggregatedProps: X = Array.from(addedPlugins)
            .map((kv) => kv[1])
            .reduce(
                (p, n) => {
                    p.optionDefaults = deepMerge(
                        p.optionDefaults,
                        n.optionDefaults
                    );

                    p.richText.push(n.richText);
                    p.commonmark.push(n.commonmark);
                    p.menu.push(n.menu);
                    p.configureMarkdownIt.push(n.configureMarkdownIt);
                    p.markdownParser.push(n.markdownParser);
                    p.markdownSerializers.push(n.markdownSerializers);
                    p.schema.push(n.schema); // TODO
                    p.events.onEnable.push(n.events?.onEnable);
                    p.events.onDisable.push(n.events?.onDisable);
                    p.postProcess.push(n.postProcess);

                    return p;
                },
                {
                    optionDefaults: EditorBuilder.getBaseOptionDefaults(),
                    richText: [],
                    commonmark: [],
                    menu: [],
                    configureMarkdownIt: [],
                    markdownParser: [],
                    markdownSerializers: [],
                    schema: [],
                    events: {
                        onEnable: [],
                        onDisable: [],
                    },
                    postProcess: [],
                }
            );

        const schema = new Schema(wrapCallEach(aggregatedProps.schema)(null));

        const ret: AggregatedEditorPlugin<T> = {
            optionDefaults:
                aggregatedProps.optionDefaults as AggregatedEditorPlugin<T>["optionDefaults"],
            richText: aggregateRichTextEditorSettings(aggregatedProps.richText),
            commonmark: aggregateCommonmarkEditorSettings(
                aggregatedProps.commonmark
            ),
            menu: aggregateMenu(aggregatedProps.menu),
            configureMarkdownIt: wrapCallEach(
                aggregatedProps.configureMarkdownIt
            ),
            markdownParser: aggregateMarkdownParser(
                aggregatedProps.markdownParser
            ),
            markdownSerializers: null,
            schema: schema,
            events: {
                onEnable: wrapCallEach(aggregatedProps.events.onEnable),
                onDisable: wrapCallEach(aggregatedProps.events.onEnable),
            },
        };

        return ret;
    }

    private static getBaseOptionDefaults(): BaseOptions {
        return {};
    }
}

type MakeArray<T> = {
    [Prop in keyof T]: T[Prop][];
};

function wrapCallEach<T extends (...args: unknown[]) => unknown>(fns: T[]) {
    return (...args: Parameters<T>) => {
        let ret: ReturnType<T> = undefined;

        for (const fn of fns) {
            if (fn) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                ret = fn(...args);
            }

            if (ret !== undefined) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                args = [ret];
            }
        }

        return ret;
    };
}

function aggregateRichTextEditorSettings(
    m: EditorPlugin["richText"][]
): EditorPlugin["richText"] {
    return (opts) => {
        let ret: ReturnType<EditorPlugin["richText"]> = {
            plugins: [],
            nodeViews: {},
            inputRules: [],
        };

        for (const fn of m) {
            if (fn) {
                const newRet = fn(opts);
                ret = {
                    plugins: [...ret.plugins, ...newRet.plugins],
                    nodeViews: {
                        ...ret.nodeViews,
                        ...newRet.nodeViews,
                    },
                    inputRules: [...ret.inputRules, ...newRet.inputRules],
                };
            }
        }

        return ret;
    };
}

function aggregateCommonmarkEditorSettings(
    m: EditorPlugin["commonmark"][]
): EditorPlugin["commonmark"] {
    return (opts) => {
        let ret: ReturnType<EditorPlugin["commonmark"]> = {
            plugins: [],
        };

        for (const fn of m) {
            if (fn) {
                const newRet = fn(opts);
                ret = {
                    plugins: [...ret.plugins, ...newRet.plugins],
                };
            }
        }

        return ret;
    };
}

function aggregateMarkdownParser(
    m: EditorPlugin["markdownParser"][]
): EditorPlugin["markdownParser"] {
    return (opts) => {
        let ret: ReturnType<EditorPlugin["markdownParser"]> = {
            tokens: {},
            plugins: [],
        };

        for (const fn of m) {
            if (fn) {
                const newRet = fn(opts);
                ret = {
                    tokens: {
                        ...ret.tokens,
                        ...newRet.tokens,
                    },
                    plugins: [...ret.plugins, ...newRet.plugins],
                };
            }
        }

        return ret;
    };
}

function aggregateMenu(m: EditorPlugin["menu"][]): EditorPlugin["menu"] {
    return (opts) => {
        const existingBlocks: Record<string, MenuBlock> = {};

        for (const fn of m) {
            if (!fn) {
                continue;
            }

            const blocks = fn(opts);

            for (const block of blocks) {
                if (!block.name) {
                    block.name = "";
                }

                if (!block.priority) {
                    block.priority = 0;
                }

                if (!existingBlocks[block.name]) {
                    existingBlocks[block.name] = block;
                    continue;
                }
                const items = existingBlocks[block.name].entries;

                existingBlocks[block.name].entries = items.concat(
                    block.entries
                );
            }
        }

        const menu = Object.values(existingBlocks).sort((a, b) => {
            if (a.priority === b.priority) {
                if (a.name > b.name) {
                    return 1;
                } else if (a.name < b.name) {
                    return -1;
                } else {
                    return 0;
                }
            }

            return a.priority - b.priority;
        });

        return menu;
    };
}

export const StacksEditor = new EditorBuilder()
    .add("base", basePlugin)
    .add("stacks", stacksPlugin)
    .build();
