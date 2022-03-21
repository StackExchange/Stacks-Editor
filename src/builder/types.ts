import type { TokenConfig } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema } from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import type { EditorProps, EditorView } from "prosemirror-view";
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
    defaultView: EditorType;
    /** The list of classes to add to the backing editor's target */
    targetClassList?: string[];
    /**
     * Function to get the container to place the menu bar;
     * defaults to returning this editor's target's parentNode
     */
    menuParentContainer?: (view: EditorView) => Element;
    /**
     * TODO need both this AND menuParentContainer?
     * Function to get the container to place any floating plugins;
     * defaults to returning this editor's target's parentNode
     */
    pluginParentContainer?: (view: EditorView) => Element;
}

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
        onEnable?: (view: View) => void;
        onDisable?: (view: View) => void;
    };
}

export interface AggregatedEditorPlugin<TOptions>
    extends Required<Omit<EditorPlugin<TOptions>, "schema">> {
    schema: Schema;
}

export interface EditorConstructor<T> {
    new (target: HTMLElement, content: string, options: T): View;
}
