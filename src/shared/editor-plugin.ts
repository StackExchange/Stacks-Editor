import MarkdownIt from "markdown-it";
import OrderedMap from "orderedmap";
import { InputRule } from "prosemirror-inputrules";
import { MarkdownParser, MarkdownSerializerState } from "prosemirror-markdown";
import type {
    MarkSpec,
    Node,
    NodeSpec,
    Schema,
    SchemaSpec,
} from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import { EditorProps } from "prosemirror-view";
import {
    MarkdownSerializerMarks,
    MarkdownSerializerNodes,
} from "./markdown-serializer";
import { MenuCommand } from "./menu";
import { View } from "./view";

export interface PluginSchemaSpec extends SchemaSpec {
    nodes: OrderedMap<NodeSpec>;
    marks: OrderedMap<MarkSpec>;
}

export interface Editor extends View {
    readonly editorTarget: Element;
}

export type EventCallback = (event: Editor) => void;

export interface MenuCommandEntryVariant {
    active?: (state: EditorState) => boolean;
    visible?: (state: EditorState) => boolean;
    command: MenuCommand;
}

export interface MenuCommandEntry {
    richText: MenuCommandEntryVariant | MenuCommand;
    commonmark: MenuCommandEntryVariant | MenuCommand;
    keybind?: string;

    dom: HTMLElement;
    key: string;

    // if this menu entry is a dropdown menu, it will have child items containing the actual commands
    children?: MenuCommandEntry[];
}

export type MenuBlock = {
    //name?: string;
    //priority?: number;
    entries: MenuCommandEntry[];
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

    menu?: (options: TOptions) => MenuBlock[];

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
    addMenuBlock(block: MenuBlock): void;
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

    private api() {
        return {
            addMenuBlock: (block: MenuBlock): void => {
                throw new Error("Method not implemented.");
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
