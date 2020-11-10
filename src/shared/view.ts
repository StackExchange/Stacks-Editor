// NOTE: It is important that these are all `type` only imports!
// This keeps code that relies on this file from accidentally introducing cyclical dependencies
// and keeps the actual code out of the bundle if consumers decide to code split/tree-shake
import type { Schema } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { ExternalEditorPlugin } from "./external-editor-plugin";
import type { ImageUploadOptions } from "./prosemirror-plugins/image-upload";

export interface CommonViewOptions {
    /** The classes to add to the editor target */
    classList?: string[];
    /** The url to where the "Help" button should lead to */
    editorHelpLink?: string;
    /** The features to allow/disallow on the markdown parser */
    parserFeatures?: CommonmarkParserFeatures;
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
    /** Image uploader options */
    imageUpload?: ImageUploadOptions;
    /** Externally written plugins to add to the editor */
    externalPlugins?: ExternalEditorPlugin[];
}

/** The features to enable/disable on the commonmark parser */
export interface CommonmarkParserFeatures {
    /** Enable Stack Snippets */
    snippets?: boolean;
    /** Enable HTML parsing (with sanitization) */
    html?: boolean;
    /**
     * Enables support for Markdig's ExtraEmphasis plugin;
     * ~~strikethrough~~, ~subscript, ^superscript,
     * <ins>inserted</ins>, <mark>marked</mark>
     * TODO only strikethrough is currently supported
     */
    extraEmphasis?: boolean;
    /** Enable tables according to GitHub-flavored markdown */
    tables?: boolean;
}

export const defaultParserFeatures: CommonmarkParserFeatures = {
    snippets: true,
    html: true,
    extraEmphasis: true,
    tables: true,
};

export interface View {
    readonly dom: Element;
    readonly content: string;
    readonly editorView: EditorView;
    readonly readonly: boolean;

    focus(): void;
    destroy(): void;
}

export interface PluginView {
    update?(view: EditorView<Schema>, prevState?: EditorState<Schema>): void;
    destroy?(): void;
}
