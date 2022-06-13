import MarkdownIt from "markdown-it";
import type OrderedMap from "orderedmap";
import { InputRule } from "prosemirror-inputrules";
import { MarkdownParser } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema, SchemaSpec } from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import { EditorProps } from "prosemirror-view";
import { MarkdownSerializerNodes } from "../rich-text/markdown-serializer"; // TODO don't rely on rich-text
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
export interface EditorPlugin<TOptions = unknown> {
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

    configureMarkdownIt?: (instance: MarkdownIt) => void;

    markdownParser?: (options: TOptions) => {
        tokens: { [key: string]: TokenConfig };
        plugins: markdownit.PluginSimple[]; // TODO UNUSED due to configureMarkdownIt?
    };

    markdownSerializers?: (options: TOptions) => MarkdownSerializerNodes;

    schema?: (schema: PluginSchemaSpec) => PluginSchemaSpec;

    // events?: {
    //     onEnable?: EventCallback;
    //     onDisable?: EventCallback;
    // };

    //postProcess?: <T>(editor: AggregatedEditorPlugin<T>) => void;
}
