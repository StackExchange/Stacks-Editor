// NOTE: It is important that these are all `type` only imports!
// This keeps code that relies on this file from accidentally introducing cyclical dependencies
// and keeps the actual code out of the bundle if consumers decide to code split/tree-shake
import type { Node } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { EditorPlugin } from "./editor-plugin";
import type { ImageUploadOptions } from "./prosemirror-plugins/image-upload";
import { stackOverflowValidateLink } from "./utils";

/** Describes each distinct editor type the StacksEditor handles */
export enum EditorType {
    RichText,
    Commonmark,
}

/** Describes the options that are common to all view types */
export interface CommonViewOptions {
    /** The classes to add to the editor target */
    classList?: string[];
    /** The url to where the "Help" button should lead to */
    editorHelpLink?: string;
    /** The features to allow/disallow on the markdown parser */
    parserFeatures?: CommonmarkParserFeatures;
    /** The placeholder text for an empty editor */
    placeholderText?: string;
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
    editorPlugins?: EditorPlugin[];
}

/** Configuration options for parsing and rendering [tag:*] and [meta-tag:*] syntax */
/** @typedef {Object} TagLinkInfo
 * @property {string} link - Destination URL for the tag link
 * @property {Array.<string>} additionalClasses - CSS classes to specify on the link element in addition to .s-tag
 * @property {string} linkTitle - Text to be placed in the 'title' attribute on the rendered link
 */
export interface TagLinkOptions {
    /**
     * Callback to check if a tagname is valid; a return value of false fails the token parsing
     * @param tagName The name of the tag being validated
     * @param isMetaTag Whether the tag is a meta tag; may not be passed depending on the calling context
     * @param totalMarkup The full parsed markup of the tag link; may not be passed depending on the calling context
     */
    validate?: (
        tagName: string,
        isMetaTag?: boolean,
        totalMarkup?: string
    ) => boolean;
    /** Provide the necessary information to render the parsed tag as a link
     * @param tagName - the name of the tag
     * @param isMetaTag - whether the tag was specified via [meta-tag:*] or not
     * @return {TagLinkInfo}
     */
    render?: (
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
    /** The method used to validate links; defaults to Stack Overflow's link validation */
    validateLink?: (url: string) => boolean | false;
}

export const defaultParserFeatures: Required<CommonmarkParserFeatures> = {
    snippets: true,
    html: true,
    extraEmphasis: true,
    tables: true,
    tagLinks: {
        validate: () => true,
    },
    validateLink: stackOverflowValidateLink,
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
