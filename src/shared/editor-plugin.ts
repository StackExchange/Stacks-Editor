import MarkdownIt from "markdown-it";
import OrderedMap from "orderedmap";
import { InputRule } from "prosemirror-inputrules";
import { MarkdownParser } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, SchemaSpec } from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import { EditorProps } from "prosemirror-view";
import {
    MarkdownSerializerMarks,
    MarkdownSerializerNodes,
} from "./markdown-serializer";
import {
    makeMenuDropdown,
    makeMenuIcon,
    makeMenuSpacerEntry,
    MenuCommand,
    MenuCommandEntry,
} from "./menu";
import { EditorType, View } from "./view";

export interface PluginSchemaSpec extends SchemaSpec {
    nodes: OrderedMap<NodeSpec>;
    marks: OrderedMap<MarkSpec>;
}

export interface Editor extends View {
    readonly editorTarget: Element;
}

export type EventCallback = (event: Editor) => void;

export interface MenuCommandExtended {
    active?: (state: EditorState) => boolean;
    visible?: (state: EditorState) => boolean;
    command: MenuCommand;
}

export interface PluginMenuCommandEntry {
    richText: MenuCommandExtended | MenuCommand;
    commonmark: MenuCommandExtended | MenuCommand;
    keybind?: string;

    svg?: string;
    label: string;
    key: string;

    // if this menu entry is a dropdown menu, it will have child items containing the actual commands
    children?: PluginMenuCommandEntry[];
}

export type PluginMenuBlock = {
    name?: string;
    priority?: number;
    entries: PluginMenuCommandEntry[];
};

/** TODO DOCUMENT ALL ITEMS */
export interface EditorPlugin1<TOptions = unknown> {
    //optionDefaults?: DeepRequired<TOptions>; // TODO make Required

    richText?: (options: TOptions) => {
        nodeViews?: EditorProps["nodeViews"];
        plugins?: Plugin[];
        inputRules?: InputRule[];
    };

    commonmark?: (options: TOptions) => {
        plugins?: Plugin[];
    };

    menu?: (options: TOptions) => PluginMenuBlock[];

    markdown?: {
        configureMarkdownIt?: (instance: MarkdownIt) => void;
        parser?: (options: TOptions) => {
            tokens: MarkdownParser["tokens"];
        };
        serializers?: (options: TOptions) => MarkdownSerializerNodes;
    };

    schema?: (schema: PluginSchemaSpec) => PluginSchemaSpec;

    // events?: {
    //     onEnable?: EventCallback;
    //     onDisable?: EventCallback;
    // };

    //postProcess?: <T>(editor: AggregatedEditorPlugin<T>) => void;
}

type AddCodeBlockProcessorCallback = (
    content: string,
    container: Element
) => void | Promise<void>;
type AlterSchemaCallback = (schema: PluginSchemaSpec) => PluginSchemaSpec;
type AlterMarkdownItCallback = (instance: MarkdownIt) => void;
type MarkdownExtensionProps = {
    parser: MarkdownParser["tokens"];
    serializers: {
        nodes: MarkdownSerializerNodes;
        marks: MarkdownSerializerMarks;
    };
};

export type EditorPlugin2<TOptions = unknown> = (
    this: void,
    api: EditorPluginApi,
    options: TOptions
) => void;

export interface EditorPluginApi {
    addMenuItems(items: PluginMenuBlock[]): void;
    addCommonmarkPlugin(plugin: Plugin): void;
    addRichTextPlugin(plugin: Plugin): void;
    extendMarkdown(
        props: MarkdownExtensionProps,
        callback: AlterMarkdownItCallback
    ): void;
    extendSchema(callback: AlterSchemaCallback): void;
    addCodeBlockProcessor(
        lang: "*" | string,
        callback: AddCodeBlockProcessorCallback
    ): void;

    //TODO addHelpEntry(): void;
}

/** TODO DOCUMENT */
export class ExternalPluginProvider {
    readonly codeblockProcessors: {
        [key: string]: (
            content: string,
            container: Element
        ) => void | Promise<void>;
    } = {};

    readonly plugins = {
        richText: [] as Plugin[],
        commonmark: [] as Plugin[],
    };

    readonly markdownProps: MarkdownExtensionProps = {
        parser: {},
        serializers: {
            nodes: {},
            marks: {},
        },
    };

    private menu: PluginMenuBlock[] = [];

    private schemaCallbacks: AlterSchemaCallback[] = [];
    private markdownItCallbacks: AlterMarkdownItCallback[] = [];

    constructor(plugins: EditorPlugin2[], opts: unknown) {
        if (plugins?.length) {
            for (const plugin of plugins) {
                plugin(this.api(), opts);
            }
        }
    }

    // TODO TYPES
    getFinalizedSchema(schema: SchemaSpec): PluginSchemaSpec {
        let alteredSchema: PluginSchemaSpec = {
            nodes: OrderedMap.from(schema.nodes),
            marks: OrderedMap.from(schema.marks),
        };

        for (const callback of this.schemaCallbacks) {
            alteredSchema = callback(alteredSchema);
        }

        return alteredSchema;
    }

    alterMarkdownIt(instance: MarkdownIt): void {
        for (const callback of this.markdownItCallbacks) {
            callback(instance);
        }
    }

    // TODO refactor menu to use MenuBlocks
    getFinalizedMenu(
        menu: MenuCommandEntry[],
        editorType: EditorType
    ): MenuCommandEntry[] {
        const ret = [...menu];

        // TODO merge blocks based on name and sort by priority, lazily going to assume all are unique for the MVP
        for (const block of this.menu) {
            if (ret.length) {
                ret.push(makeMenuSpacerEntry());
            }

            const entries = this.convertMenuCommandEntries(
                block.entries,
                editorType
            );

            ret.push(...entries);
        }

        return ret;
    }

    private convertMenuCommandEntries(
        entries: PluginMenuCommandEntry[],
        editorType: EditorType
    ): MenuCommandEntry[] {
        const ret: MenuCommandEntry[] = [];

        if (!entries?.length) {
            return [];
        }

        for (const entry of entries) {
            let commandEntry: MenuCommandEntry = {
                command: null,
                visible: null,
                active: null,
                dom: null,
                key: entry.key,
                children: this.convertMenuCommandEntries(
                    entry.children,
                    editorType
                ),
            };

            const command =
                editorType === EditorType.RichText
                    ? entry.richText
                    : entry.commonmark;

            // check for an extended vs simple command
            if (command) {
                commandEntry = {
                    ...commandEntry,
                    ...("command" in command ? command : { command }),
                };
            }

            if (entry.children?.length) {
                commandEntry = makeMenuDropdown(
                    entry.svg,
                    entry.label,
                    commandEntry.key,
                    commandEntry.visible,
                    commandEntry.active,
                    ...commandEntry.children
                );
            } else {
                commandEntry.dom = makeMenuIcon(
                    entry.svg,
                    entry.label,
                    commandEntry.key,
                    []
                );
            }

            // TODO add keybind and update the dom label properly
            ret.push(commandEntry);
        }

        return ret;
    }

    private api() {
        return {
            addMenuItems: (items: PluginMenuBlock[]): void => {
                // TODO deep merge after refactoring the menu
                this.menu.push(...items);
            },

            addCommonmarkPlugin: (plugin: Plugin): void => {
                this.plugins.commonmark.push(plugin);
            },

            addRichTextPlugin: (plugin: Plugin): void => {
                this.plugins.richText.push(plugin);
            },

            extendMarkdown: (
                props: MarkdownExtensionProps,
                callback: AlterMarkdownItCallback
            ): void => {
                if (props.parser) {
                    this.markdownProps.parser = {
                        ...this.markdownProps.parser,
                        ...props.parser,
                    };
                }

                if (props.serializers.nodes) {
                    this.markdownProps.serializers.nodes = {
                        ...this.markdownProps.serializers.nodes,
                        ...props.serializers.nodes,
                    };
                }

                if (props.serializers.marks) {
                    this.markdownProps.serializers.marks = {
                        ...this.markdownProps.serializers.marks,
                        ...props.serializers.marks,
                    };
                }

                if (callback) {
                    this.markdownItCallbacks.push(callback);
                }
            },

            extendSchema: (callback: AlterSchemaCallback): void => {
                this.schemaCallbacks.push(callback);
            },

            addCodeBlockProcessor: (
                lang: string,
                callback: AddCodeBlockProcessorCallback
            ): void => {
                if (lang in this.codeblockProcessors) {
                    // TODO too harsh?
                    throw new Error(
                        `Codeblock processor for language ${lang} already exists`
                    );
                }

                this.codeblockProcessors[lang] = callback;
            },
        };
    }
}
