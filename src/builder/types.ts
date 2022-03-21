import type MarkdownIt from "markdown-it";
import type OrderedMap from "orderedmap";
import type { InputRule } from "prosemirror-inputrules";
import type { TokenConfig } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema, SchemaSpec } from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import type { EditorProps } from "prosemirror-view";
import type { MarkdownSerializerNodes } from "../rich-text/markdown-serializer";
import type { MenuCommand } from "../shared/menu";
import { DeepRequired } from "../shared/utils";
import type { View } from "../shared/view";

export interface PluginSchemaSpec extends SchemaSpec {
    nodes: OrderedMap<NodeSpec>;
    marks: OrderedMap<MarkSpec>;
}

/** Describes each distinct editor type the StacksEditor handles */
export enum EditorType {
    RichText,
    Commonmark,
}

export interface BaseOptions {
    /** The editor to show on instantiation */
    defaultView?: EditorType;
    /** The classes to add to the editor target */
    classList?: string[];
    /** The list of classes to add to the backing editor's target */
    targetClassList?: string[];
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
    name?: string;
    priority?: number;
    entries: MenuCommandEntry[];
};

/** TODO DOCUMENT ALL ITEMS */
export interface EditorPlugin<TOptions = unknown> {
    optionDefaults?: DeepRequired<TOptions>; // TODO make Required

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
        plugins: markdownit.PluginSimple[];
    };
    markdownSerializers?: (options: TOptions) => MarkdownSerializerNodes;

    schema?: (schema: PluginSchemaSpec) => PluginSchemaSpec;

    events?: {
        onEnable?: EventCallback;
        onDisable?: EventCallback;
    };

    postProcess?: <T>(editor: AggregatedEditorPlugin<T>) => void;
}

export interface AggregatedEditorPlugin<TOptions>
    extends DeepRequired<
        Omit<EditorPlugin<TOptions>, "schema" | "postProcess">
    > {
    schema: Schema;
}

export interface EditorConstructor<T> {
    new (target: HTMLElement, content: string, options: T): View;
}
