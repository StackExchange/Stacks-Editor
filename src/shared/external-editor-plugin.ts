import type MarkdownIt from "markdown-it";
import type { MarkdownParser } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema } from "prosemirror-model";
import { ContentMatch, NodeType } from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import type { EditorProps } from "prosemirror-view";
import type { MarkdownSerializerNodes } from "../rich-text/markdown-serializer";
import type { MenuCommandEntry } from "./menu";
import { deepMerge } from "./utils";

export interface ExternalEditorPlugin {
    menuEntries: MenuCommandEntry[];
    nodeViews: EditorProps["nodeViews"];
    markdownParser: {
        tokens: MarkdownParser["tokens"];
        plugins: MarkdownIt.PluginSimple[];
    };
    markdownSerializers: MarkdownSerializerNodes;
    plugins: Plugin[];
    schema: {
        nodes?: { [name: string]: NodeSpec };
        marks?: { [name: string]: MarkSpec };
    };
}

/**
 * Sets the `contentMatch` property of a node to match the current schema
 */
function setContentMatch(nodeType: NodeType, schema: Schema) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    nodeType.contentMatch = ContentMatch.parse(
        nodeType.spec.content || "",
        schema.nodes
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    nodeType.inlineContent = nodeType.contentMatch.inlineContent as boolean;
}

/**
 * Collapses a collection of ExternalEditorPlugin down into a single plugin
 * @param plugins The plugins to collapse
 */
export function collapseExternalPlugins(
    plugins: ExternalEditorPlugin[]
): ExternalEditorPlugin {
    plugins = plugins || [];
    const collapsed = plugins.reduce((prev, next) => {
        if (!prev) {
            return next;
        }

        return deepMerge(prev, next) as ExternalEditorPlugin;
    }, null);

    const emptyPlugin: ExternalEditorPlugin = {
        menuEntries: [],
        nodeViews: {},
        markdownParser: {
            tokens: {},
            plugins: [],
        },
        markdownSerializers: {},
        plugins: [],
        schema: null,
    };

    return collapsed || emptyPlugin;
}

/**
 * Alters an existing schema by combining it with a new schema;
 * avoids creating a new schema altogether so other plugins referencing the base schema don't fail
 * @param schema The base schema to alter / add to
 * @param pluginSchema The schema from an ExternalEditorPlugin to add into the base schema
 */
export function combineSchemas(
    schema: Schema,
    pluginSchema: ExternalEditorPlugin["schema"]
): Schema {
    if (!pluginSchema) {
        return schema;
    }

    Object.keys(pluginSchema.nodes).forEach((n) => {
        if (schema.nodes[n]) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const nodeType = new NodeType(n, schema, pluginSchema.nodes[n]);
        setContentMatch(nodeType, schema);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        schema.nodes[n] = nodeType;
    });

    Object.keys(schema.nodes).forEach((n) => {
        setContentMatch(schema.nodes[n], schema);
    });

    return schema;
}
