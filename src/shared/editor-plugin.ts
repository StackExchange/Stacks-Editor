import MarkdownIt from "markdown-it";
import OrderedMap from "orderedmap";
import { MarkdownParser } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema, SchemaSpec } from "prosemirror-model";
import type { EditorState, Plugin } from "prosemirror-state";
import { EditorProps } from "prosemirror-view";
import {
    MarkdownSerializerMarks,
    MarkdownSerializerNodes,
} from "./markdown-serializer";
import {
    makeMenuDropdown,
    makeMenuButton,
    MenuBlock,
    MenuCommand,
    MenuCommandEntry,
} from "./menu";
import { EditorType } from "./view";

/** A more tightly scoped version of {@link SchemaSpec} so plugins can predictably update the schema */
interface PluginSchemaSpec extends SchemaSpec {
    nodes: OrderedMap<NodeSpec>;
    marks: OrderedMap<MarkSpec>;
}

/** A more powerful command variant for {@link PluginMenuItem} */
interface MenuCommandExtended {
    /**
     * Whether the menu item should be highlighted as "active" or not.
     * Most commonly used to indicate that the selection contains a node/mark of the command's type
     */
    active?: (state: EditorState) => boolean;
    /** Whether the menu item should be visible or not */
    visible?: (state: EditorState) => boolean;
    /** The actual command this entry triggers */
    command: MenuCommand;
}

/** Describes the options available for displaying a standard menu item */
type PluginMenuItemDisplay = {
    /**
     * The name of the svg icon to use
     * TODO This is added as a class - this is likely to change in the near future
     */
    svg: string;
    /** The text to show in the entry's tooltip */
    label: string;
};

/** Describes a single entry to add to the menu */
interface PluginMenuItem<TChild = PluginMenuItem<null>[]> {
    /** The command to execute when in rich-text mode */
    richText: MenuCommandExtended | MenuCommand;
    /** The command to execute when in commonmark mode */
    commonmark: MenuCommandExtended | MenuCommand;
    /** The keyboard shortcut to attach this command to TODO */
    //keybind?: string;

    /**
     * The element to display in the menu or options to pass to the default item renderer;
     * if this item has children, this value must be a {@link PluginMenuItemDisplay}
     */
    display: PluginMenuItem["children"] extends null
        ? PluginMenuItemDisplay | HTMLElement
        : PluginMenuItemDisplay;

    /** The unique id used to reference this entry */
    key: string;

    /**
     * The child entries for this entry.
     * Setting this will create a dropdown, ignoring the richText and commonmark command entries
     * */
    children?: TChild;
}

/** Describes a visual "block"/grouping of menu items */
type PluginMenuBlock = MenuBlock<PluginMenuItem>;

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
 */
type AddMenuItemsCallback = (schema: Schema) => PluginMenuBlock[];

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
        lang: "*" | string;
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
    getFinalizedMenu(
        menu: MenuBlock[],
        editorType: EditorType,
        schema: Schema
    ): MenuBlock[];
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
    getFinalizedMenu(
        menu: MenuBlock[],
        editorType: EditorType,
        schema: Schema
    ): MenuBlock[] {
        const ret = [...menu];
        const aggBlocks: PluginMenuBlock[] = [];

        // call each callback and aggregate the results
        for (const callback of this.menuCallbacks) {
            if (!callback) {
                continue;
            }

            const blocks = callback(schema);
            for (const block of blocks) {
                let existing = aggBlocks.find((b) => b.name === block.name);
                if (!existing) {
                    aggBlocks.push(block);
                    existing = block;
                } else {
                    existing.entries.push(...block.entries);
                }

                // set the priority to the most recently declared if there are multiple
                existing.priority = block.priority || Infinity;
            }
        }

        // add the blocks to the menu
        for (const block of aggBlocks) {
            const entries = this.convertMenuCommandEntries(
                block.entries,
                editorType
            );

            // try to find an existing block with the same name
            const match = ret.find((b) => b.name === block.name);

            if (match) {
                // if there is a match, add the entries to it
                match.entries.push(...entries);
                // set the priority to the lowest of the two
                match.priority = Math.min(match.priority || 0, block.priority);
            } else {
                ret.push({
                    name: block.name,
                    priority: block.priority,
                    visible: block.visible,
                    classes: block.classes,
                    entries,
                });
            }
        }

        return ret;
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

    /** Converts a PluginMenuCommandEntry to a regular MenuCommandEntry */
    private convertMenuCommandEntries(
        entries: PluginMenuItem[],
        editorType: EditorType
    ): MenuCommandEntry[] {
        const ret: MenuCommandEntry[] = [];

        if (!entries?.length) {
            return [];
        }

        for (const entry of entries) {
            let commandEntry: MenuCommandEntry = {
                command: null,
                visible: null,
                active: null,
                dom: null,
                key: entry.key,
                children: this.convertMenuCommandEntries(
                    entry.children,
                    editorType
                ),
            };

            const command =
                editorType === EditorType.RichText
                    ? entry.richText
                    : entry.commonmark;

            // check for an extended vs simple command
            if (command) {
                commandEntry = {
                    ...commandEntry,
                    ...("command" in command ? command : { command }),
                };
            }

            if (entry.children?.length) {
                commandEntry = makeMenuDropdown(
                    entry.display.svg,
                    entry.display.label,
                    commandEntry.key,
                    commandEntry.visible,
                    commandEntry.active,
                    ...commandEntry.children
                );
            } else if (this.displayIsButton(entry.display)) {
                commandEntry.dom = makeMenuButton(
                    entry.display.svg,
                    entry.display.label,
                    commandEntry.key,
                    []
                );
            } else {
                commandEntry.dom = entry.display;
            }

            // TODO add keybind and update the dom label properly
            ret.push(commandEntry);
        }

        return ret;
    }

    /** Helper method for checking the type of {@link PluginMenuItem.display} */
    private displayIsButton(
        display: PluginMenuItem["display"]
    ): display is PluginMenuItemDisplay {
        return "svg" in display;
    }
}
