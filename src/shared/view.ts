// NOTE: It is important that these are all `type` only imports!
// This keeps code that relies on this file from accidentally introducing cyclical dependencies
// and keeps the actual code out of the bundle if consumers decide to code split/tree-shake
import type { Schema, Node } from "prosemirror-model";
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

/** Configuration options for parsing and rendering [tag:*] and [meta-tag:*] syntax */
/** @typedef {Object} TagLinkInfo
 * @property {string} link - Destination URL for the tag link
 * @property {Array.<string>} additionalClasses - CSS classes to specify on the link element in addition to .s-tag
 * @property {string} linkTitle - Text to be placed in the 'title' attribute on the rendered link
 */
export interface TagLinkOptions {
    /** Indicates whether meta tags are allowed in this instance */
    allowMetaTags: boolean;
    /** Indicates characters outside of the ASCII set are allowed in tag names */
    allowNonAscii: boolean;
    /** Provide the necessary information to render the parsed tag as a link
     * @param tagName - the name of the tag
     * @param isMetaTag - whether the tag was specified via [meta-tag:*] or not
     * @return {TagLinkInfo}
     */
    renderer?: (
        tagName: string,
        isMetaTag: boolean
    ) => { link: string; additionalClasses: string[]; linkTitle: string };
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
    tagLinks?: TagLinkOptions;
    /** Enable the default link validator from Markdown-It. Else the Stackoverflow validate link function will be used */
    defaultValidateLink?: boolean;
    undo?: boolean;
    redo?: boolean;
}

export const defaultParserFeatures: CommonmarkParserFeatures = {
    snippets: true,
    html: true,
    extraEmphasis: true,
    tables: true,
    tagLinks: {
        allowMetaTags: true,
        allowNonAscii: false,
    },
    undo: false,
    redo: false,
};

export interface View {
    readonly dom: Element;
    readonly editorView: EditorView;
    readonly readonly: boolean;
    content: string;

    focus(): void;
    destroy(): void;
}

/** Abstract class that contains shared functionality for implementing View */
export abstract class BaseView implements View {
    editorView: EditorView;

    get document(): Node {
        return this.editorView.state.doc;
    }

    get dom(): Element {
        return this.editorView.dom;
    }

    get readonly(): boolean {
        return !this.editorView.editable;
    }

    focus(): void {
        this.editorView?.focus();
    }

    destroy(): void {
        this.editorView?.destroy();
    }

    get content(): string {
        return this.serializeContent();
    }

    set content(value: string) {
        let tr = this.editorView.state.tr;
        const doc = this.editorView.state.doc;

        const newDoc = this.parseContent(value);
        tr = tr.replaceWith(0, doc.content.size, newDoc);

        this.editorView.dispatch(tr);
    }

    /**
     * Parses a string containing markdown into a Node
     * @param content The markdown string to parse
     */
    abstract parseContent(content: string): Node;

    /**
     * Serializes the current document's contents into a markdown string
     */
    abstract serializeContent(): string;
}

export interface PluginView {
    update?(view: EditorView<Schema>, prevState?: EditorState<Schema>): void;
    destroy?(): void;
}
