import MarkdownIt from "markdown-it";
import OrderedMap from "orderedmap";
import { MarkdownParser } from "prosemirror-markdown";
import { MarkSpec, NodeSpec, Schema, SchemaSpec } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { EditorProps } from "prosemirror-view";
import {
    MarkdownSerializerMarks,
    MarkdownSerializerNodes,
} from "../rich-text/markdown-serializer";
import { MenuCommandEntry } from "./menu";
import { EditorType } from "./view";

interface PluginSchemaSpec extends SchemaSpec {
    nodes: OrderedMap<NodeSpec>;
    marks: OrderedMap<MarkSpec>;
}

interface MarkdownExtensionProps {
    /**
     * Parsers for prosemirror-markdown
     * @see {@type import("prosemirror-markdown").MarkdownParser["tokens"]}
     */
    parser: MarkdownParser["tokens"];
    /**
     * Serializers for prosemirror-markdown
     * @see {@type import("prosemirror-markdown").MarkdownSerializer}
     */
    serializers: {
        nodes: MarkdownSerializerNodes;
        marks: MarkdownSerializerMarks;
    };
}

/**
 * Aggregates and provides plugins to comsuming editors
 * @internal
 */
export interface IExternalPluginProvider {
    // TODO DEEP READONLY
    readonly codeblockProcessors: {
        [key: string]: (
            content: string,
            container: Element
        ) => void | Promise<void>;
    };

    // TODO DEEP READONLY
    readonly plugins: {
        richText: Plugin[];
        commonmark: Plugin[];
    };

    // TODO DEEP READONLY
    readonly markdownProps: MarkdownExtensionProps;

    // TODO DEEP READONLY
    readonly nodeViews: EditorProps["nodeViews"];

    // TODO TYPES
    getFinalizedSchema(schema: SchemaSpec): PluginSchemaSpec;

    alterMarkdownIt(instance: MarkdownIt): void;

    // TODO refactor menu to use MenuBlocks
    getFinalizedMenu(
        menu: MenuCommandEntry[],
        editorType: EditorType,
        schema: Schema
    ): MenuCommandEntry[];
}

/** Shim implementation of IExternalPluginProvider to prepare for future functionality */
export class ShimExternalPluginProvider implements IExternalPluginProvider {
    codeblockProcessors = {};
    plugins = { richText: [] as Plugin[], commonmark: [] as Plugin[] };
    markdownProps = {
        parser: {},
        serializers: {
            nodes: {},
            marks: {},
        },
    };
    nodeViews = {};

    getFinalizedSchema(schema: SchemaSpec): PluginSchemaSpec {
        // TODO this is not right, but it's temporary so... ¯\_(ツ)_/¯
        return schema as PluginSchemaSpec;
    }

    alterMarkdownIt(): void {
        /* noop */
    }

    getFinalizedMenu(menu: MenuCommandEntry[]): MenuCommandEntry[] {
        return menu;
    }
}
