import MarkdownIt from "markdown-it";
import OrderedMap from "orderedmap";
import { MarkdownParser } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema, SchemaSpec } from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import { EditorProps } from "prosemirror-view";
import {
    MarkdownSerializerMarks,
    MarkdownSerializerNodes,
} from "./markdown-serializer";
import { MenuBlock } from "./menu/helpers";

/** A more tightly scoped version of {@link SchemaSpec} so plugins can predictably update the schema */
interface PluginSchemaSpec extends SchemaSpec {
    nodes: OrderedMap<NodeSpec>;
    marks: OrderedMap<MarkSpec>;
}

/**
 * Describes the callback for when a codeblock processor is initialized
 * @param content The plain text content of the codeblock
 * @param container The element that the codeblock is being rendered into
 * @returns True if the processor handled the codeblock, false otherwise
 */
type AddCodeBlockProcessorCallback = (
    content: string,
    container: Element
) => boolean;
/**
 * Describes the callback to extend a schema
 * @param schema The schema to extend
 * @returns The finalized, extended schema
 */
type AlterSchemaCallback = (schema: PluginSchemaSpec) => PluginSchemaSpec;
/**
 * Describes the callback to extend markdown-it.
 * This method *mutates* the passed markdown-it instance, so it should be used with care
 * @param instance The markdown-it instance to alter
 */
type AlterMarkdownItCallback = (instance: MarkdownIt) => void;

/**
 * Callback to add new menu entries to the editor's menu.
 * @param {Schema} schema The fully-initialized editor schema, including nodes from plugins
 * @param {MenuBlock} coreMenus Definition of the Core menus. MenuBlocks that share names are merged together.
 */
type AddMenuItemsCallback = (
    schema: Schema,
    coreMenus: MenuBlock[]
) => MenuBlock[];

/** Describes the properties that can be used for extending commonmark support in the editor */
type MarkdownExtensionProps = {
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
    /** TODO Extension for @lezer/markdown to provide specialized syntax highlighting */
    //highlightingExtension?: MarkdownExtension
};

/**
 * Complete spec for creating an editor plugin
 * @experimental
 */
export interface EditorPluginSpec {
    /** Rich-text editor extensions */
    richText?: {
        /**
         * NodeViews to add to the rich-text editor
         * @see {@type {import("prosemirror-view").EditorProps["nodeViews"]}}
         */
        nodeViews?: EditorProps["nodeViews"];
        /**
         * ProseMirror plugins to add to the rich-text editor
         * @see {@type {import("prosemirror-state").EditorStateConfig["plugins"]}}
         */
        plugins?: Plugin[];
    };

    /** Commonmark editor extensions */
    commonmark?: {
        /**
         * ProseMirror plugins to add to the commonmark editor
         * @see {@type {import("prosemirror-state").EditorStateConfig["plugins"]}}
         */
        plugins?: Plugin[];
    };

    /** {@inheritDoc AddMenuItemsCallback} */
    menuItems?: AddMenuItemsCallback;

    /** Commonmark syntax and editor node parsing/serialization extensions */
    markdown?: MarkdownExtensionProps & {
        alterMarkdownIt?: AlterMarkdownItCallback;
    };

    // TODO warn devs that they need to (at minimum) add a serializer as well?
    /** Callback for extending the rich-text editor's schema */
    extendSchema?: AlterSchemaCallback;

    /** Processors to add for extending the rich-text display of specific codeblock languages */
    codeBlockProcessors?: {
        /**
         * The language this processor applies to.
         * A value of `*` applies to all languages when a more specific processor is not found
         */
        lang: string;
        callback: AddCodeBlockProcessorCallback;
    }[];
}

/**
 * A plugin that extends the editor based on the spec provided
 * @experimental
 */
export type EditorPlugin<TOptions = unknown> = (
    options: TOptions
) => EditorPluginSpec;

/**
 * Aggregates and provides plugins to consuming editors
 * @internal
 */
export interface IExternalPluginProvider {
    // TODO DEEP READONLY
    /** All aggregated codeblockProcessors */
    readonly codeblockProcessors: {
        [key: string]: AddCodeBlockProcessorCallback[];
    };

    // TODO DEEP READONLY
    /** All aggregated plugins */
    readonly plugins: {
        richText: Plugin[];
        commonmark: Plugin[];
    };

    // TODO DEEP READONLY
    /** All aggregated markdownProps */
    readonly markdownProps: MarkdownExtensionProps;

    // TODO DEEP READONLY
    /** All aggregated nodeViews */
    readonly nodeViews: EditorProps["nodeViews"];

    // TODO TYPES
    /**
     * Gets the final, aggregated schema
     * @param schema The schema to extend
     */
    getFinalizedSchema(schema: SchemaSpec): PluginSchemaSpec;

    /**
     * Mutates the markdown-it instance to add any additional plugins
     * @param instance The markdown-it instance to alter
     */
    alterMarkdownIt(instance: MarkdownIt): void;

    /**
     * Gets the final, aggregated menu
     * @param menu The menu to extend
     * @param editorType The current editor type
     * @param schema The finalized schema
     */
    getFinalizedMenu(menu: MenuBlock[], schema: Schema): MenuBlock[];
}

/**
 * {@inheritDoc IExternalPluginProvider}
 * @internal
 */
export class ExternalPluginProvider implements IExternalPluginProvider {
    private _codeblockProcessors: IExternalPluginProvider["codeblockProcessors"] =
        {};

    private _plugins: IExternalPluginProvider["plugins"] = {
        richText: [],
        commonmark: [],
    };

    private _markdownProps: IExternalPluginProvider["markdownProps"] = {
        parser: {},
        serializers: {
            nodes: {},
            marks: {},
        },
    };

    private _nodeViews: IExternalPluginProvider["nodeViews"] = {};

    /** {@inheritDoc IExternalPluginProvider.codeblockProcessors} */
    get codeblockProcessors() {
        return Object.assign({}, this._codeblockProcessors);
    }

    /** {@inheritDoc IExternalPluginProvider.plugins} */
    get plugins() {
        return this._plugins;
    }

    /** {@inheritDoc IExternalPluginProvider.markdownProps} */
    get markdownProps() {
        return this._markdownProps;
    }

    /** {@inheritDoc IExternalPluginProvider.nodeViews} */
    get nodeViews() {
        return this._nodeViews;
    }

    protected menuCallbacks: AddMenuItemsCallback[] = [];
    protected schemaCallbacks: AlterSchemaCallback[] = [];
    protected markdownItCallbacks: AlterMarkdownItCallback[] = [];

    constructor(plugins: EditorPlugin[], options: unknown) {
        if (plugins?.length) {
            for (const plugin of plugins) {
                this.applyConfig(plugin(options));
            }
        }
    }

    /** {@inheritDoc IExternalPluginProvider.getFinalizedSchema} */
    getFinalizedSchema(schema: SchemaSpec): PluginSchemaSpec {
        let alteredSchema: PluginSchemaSpec = {
            nodes: OrderedMap.from(schema.nodes),
            marks: OrderedMap.from(schema.marks),
        };

        for (const callback of this.schemaCallbacks) {
            if (callback) {
                alteredSchema = callback(alteredSchema);
            }
        }

        return alteredSchema;
    }

    /** {@inheritDoc IExternalPluginProvider.alterMarkdownIt} */
    alterMarkdownIt(instance: MarkdownIt): void {
        for (const callback of this.markdownItCallbacks) {
            if (callback) {
                callback(instance);
            }
        }
    }

    /** {@inheritDoc IExternalPluginProvider.getFinalizedMenu} */
    getFinalizedMenu(menu: MenuBlock[], schema: Schema): MenuBlock[] {
        //While we're working on the blocks, we need to be able to pull out entries by name easily
        let aggBlocks: { [id: string]: MenuBlock } = {};

        // call each callback and aggregate the results
        for (const callback of [() => menu, ...this.menuCallbacks]) {
            if (!callback) {
                continue;
            }

            const blocks = callback(schema, menu);
            for (const block of blocks) {
                const existing = aggBlocks[block.name];
                if (existing) {
                    existing.entries = [...existing.entries, ...block.entries];

                    // set the priority to the lowest of existing and the newly aggregated block
                    existing.priority = Math.min(
                        existing.priority || 0,
                        block.priority || Infinity
                    );
                } else {
                    aggBlocks = {
                        ...aggBlocks,
                        [block.name]: { ...block },
                    };
                }
            }
        }

        return Object.values(aggBlocks);
    }

    /** Applies the config of a single plugin to this provider */
    private applyConfig(config: EditorPluginSpec) {
        config.codeBlockProcessors?.forEach(({ lang, callback }) => {
            this.addCodeBlockProcessor(lang, callback);
        });

        config.commonmark?.plugins?.forEach((plugin) => {
            this._plugins.commonmark.push(plugin);
        });

        config.richText?.plugins?.forEach((plugin) => {
            this._plugins.richText.push(plugin);
        });

        this.schemaCallbacks.push(config.extendSchema);
        if (config.richText?.nodeViews) {
            this._nodeViews = {
                ...this._nodeViews,
                ...config.richText?.nodeViews,
            };
        }

        this.extendMarkdown(config.markdown, config.markdown?.alterMarkdownIt);

        this.menuCallbacks.push(config.menuItems);
    }

    /** Applies the markdownProps of a config to this provider */
    private extendMarkdown(
        props: MarkdownExtensionProps,
        callback: AlterMarkdownItCallback
    ): void {
        // TODO sanitize input to ensure nodes/marks for added parsers and vice versa?
        if (props?.parser) {
            this._markdownProps.parser = {
                ...this._markdownProps.parser,
                ...props.parser,
            };
        }

        if (props?.serializers?.nodes) {
            this._markdownProps.serializers.nodes = {
                ...this._markdownProps.serializers.nodes,
                ...props.serializers.nodes,
            };
        }

        if (props?.serializers?.marks) {
            this._markdownProps.serializers.marks = {
                ...this._markdownProps.serializers.marks,
                ...props.serializers.marks,
            };
        }

        if (callback) {
            this.markdownItCallbacks.push(callback);
        }
    }

    /** Applies the codeblockProcessors of a config to this provider */
    private addCodeBlockProcessor(
        lang: string,
        callback: AddCodeBlockProcessorCallback
    ): void {
        if (!(lang in this._codeblockProcessors)) {
            this._codeblockProcessors[lang] = [];
        }

        this._codeblockProcessors[lang].push(callback);
    }
}
