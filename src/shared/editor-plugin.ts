import MarkdownIt from "markdown-it";
import type OrderedMap from "orderedmap";
import { InputRule } from "prosemirror-inputrules";
import { MarkdownParser, MarkdownSerializerState } from "prosemirror-markdown";
import type { MarkSpec, Node, NodeSpec, SchemaSpec } from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import { EditorProps } from "prosemirror-view";
import { MarkdownSerializerNodes } from "./markdown-serializer";
import { MenuCommand } from "./menu";
import { View } from "./view";

type TokenConfig = MarkdownParser["tokens"];

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
            tokens: { [key: string]: TokenConfig };
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
        callback: (instance: MarkdownIt) => {
            parser: { tokens: { [key: string]: TokenConfig } };
            serializers: MarkdownSerializerNodes;
        }
    ): void;
    extendSchema(
        callback: (schema: PluginSchemaSpec) => PluginSchemaSpec
    ): void;
    addCodeBlockProcessor(
        lang: "*" | string,
        callback: (content: string, container: Element) => void | Promise<void>
    ): void;

    //TODO addHelpEntry(): void;
}

export class ApiProvider implements EditorPluginApi {
    codeblockProcessors: {
        [key: string]: (
            content: string,
            container: Element
        ) => void | Promise<void>;
    } = {};

    constructor(plugins: EditorPlugin2[], opts: unknown) {
        if (plugins?.length) {
            for (const plugin of plugins) {
                plugin(this, opts);
            }
        }
    }

    addMenuBlock(block: MenuBlock): void {
        throw new Error("Method not implemented.");
    }
    addCommonmarkPlugin(plugin: Plugin<any>): void {
        throw new Error("Method not implemented.");
    }
    addRichTextPlugin(plugin: Plugin<any>): void {
        throw new Error("Method not implemented.");
    }
    extendMarkdown(
        callback: (instance: MarkdownIt) => {
            parser: {
                tokens: { tokens: { [key: string]: TokenConfig } };
            };
            serializers: MarkdownSerializerNodes;
        }
    ): void {
        throw new Error("Method not implemented.");
    }
    extendSchema(
        callback: (schema: PluginSchemaSpec) => PluginSchemaSpec
    ): void {
        throw new Error("Method not implemented.");
    }
    addCodeBlockProcessor(
        lang: string,
        callback: (content: string, container: Element) => void | Promise<void>
    ): void {
        if (lang in this.codeblockProcessors) {
            // TODO too harsh?
            throw new Error(
                `Codeblock processor for language ${lang} already exists`
            );
        }

        this.codeblockProcessors[lang] = callback;
    }
}
