import type MarkdownIt from "markdown-it";
import type { TokenConfig } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema } from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import type { EditorProps } from "prosemirror-view";
import type { MarkdownSerializerNodes } from "../rich-text/markdown-serializer";
import type { MenuCommandEntry } from "../shared/menu";
import type { View } from "../shared/view";

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

export interface EditorPlugin<TOptions = unknown> {
    richText?: {
        nodeViews: EditorProps["nodeViews"];
        plugins: Plugin[];
        menuEntries: MenuCommandEntry[];
    };
    commonmark?: {
        plugins: Plugin[];
        menuEntries: MenuCommandEntry[];
    };
    options?: TOptions;

    configureMarkdownIt?: (instance: MarkdownIt) => void;

    markdownParser?: {
        tokens: { [key: string]: TokenConfig };
        plugins: markdownit.PluginSimple[];
    };
    markdownSerializers?: MarkdownSerializerNodes;

    schema?: {
        nodes?: { [name: string]: NodeSpec };
        marks?: { [name: string]: MarkSpec };
    };

    events?: {
        onEnable?: EventCallback;
        onDisable?: EventCallback;
    };
}

export interface AggregatedEditorPlugin<TOptions>
    extends Required<Omit<EditorPlugin<TOptions>, "schema">> {
    schema: Schema;
}

export interface EditorConstructor<T> {
    new (target: HTMLElement, content: string, options: T): View;
}
