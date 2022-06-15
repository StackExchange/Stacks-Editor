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
    makeMenuIcon,
    makeMenuSpacerEntry,
    MenuCommand,
    MenuCommandEntry,
} from "./menu";
import { EditorType, View } from "./view";

export interface PluginSchemaSpec extends SchemaSpec {
    nodes: OrderedMap<NodeSpec>;
    marks: OrderedMap<MarkSpec>;
}

export interface Editor extends View {
    readonly editorTarget: Element;
}

export type EventCallback = (event: Editor) => void;

export interface MenuCommandExtended {
    active?: (state: EditorState) => boolean;
    visible?: (state: EditorState) => boolean;
    command: MenuCommand;
}

export interface PluginMenuCommandEntry {
    richText: MenuCommandExtended | MenuCommand;
    commonmark: MenuCommandExtended | MenuCommand;
    keybind?: string;

    svg?: string;
    label: string;
    key: string;

    // if this menu entry is a dropdown menu, it will have child items containing the actual commands
    children?: PluginMenuCommandEntry[];
}

export type PluginMenuBlock = {
    name?: string;
    priority?: number;
    entries: PluginMenuCommandEntry[];
};

export type AddCodeBlockProcessorCallback = (
    content: string,
    container: Element
) => void | Promise<void>;
export type AlterSchemaCallback = (
    schema: PluginSchemaSpec
) => PluginSchemaSpec;
export type AlterMarkdownItCallback = (instance: MarkdownIt) => void;
export type AddMenuItemsCallback = (schema: Schema) => PluginMenuBlock[];

export type MarkdownExtensionProps = {
    parser: MarkdownParser["tokens"];
    serializers: {
        nodes: MarkdownSerializerNodes;
        marks: MarkdownSerializerMarks;
    };
};

/** TODO DOCUMENT ALL ITEMS */
export interface EditorPluginSpec {
    richText?: {
        nodeViews?: EditorProps["nodeViews"];
        plugins?: Plugin[];
    };

    commonmark?: {
        plugins?: Plugin[];
    };

    menuItems?: AddMenuItemsCallback;

    markdown?: MarkdownExtensionProps & {
        alterMarkdownIt?: AlterMarkdownItCallback;
    };

    // TODO warn devs that they need to (at minimum) add a serializer as well?
    extendSchema?: AlterSchemaCallback;

    codeBlockProcessors?: {
        lang: "*" | string;
        callback: AddCodeBlockProcessorCallback;
    }[];
}

export type EditorPlugin<TOptions = unknown> = (
    options: TOptions
) => EditorPluginSpec;

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

// TODO once we settle on a type, we can absorb the concrete version here
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

    get codeblockProcessors() {
        return Object.assign({}, this._codeblockProcessors);
    }

    get plugins() {
        return this._plugins;
    }

    get markdownProps() {
        return this._markdownProps;
    }

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

    private applyConfig(config: EditorPluginSpec) {
        config.codeBlockProcessors?.forEach(({ lang, callback }) => {
            this.addCodeBlockProcessor(lang, callback);
        });

        config.commonmark?.plugins?.forEach((plugin) => {
            this._plugins.commonmark.push(plugin);
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

        config.richText?.plugins?.forEach((plugin) => {
            this._plugins.richText.push(plugin);
        });
    }

    // TODO TYPES
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

    alterMarkdownIt(instance: MarkdownIt): void {
        for (const callback of this.markdownItCallbacks) {
            if (callback) {
                callback(instance);
            }
        }
    }

    // TODO refactor menu to use MenuBlocks
    getFinalizedMenu(
        menu: MenuCommandEntry[],
        editorType: EditorType,
        schema: Schema
    ): MenuCommandEntry[] {
        const ret = [...menu];

        // TODO merge blocks based on name and sort by priority, lazily going to assume all are unique for the MVP
        for (const callback of this.menuCallbacks) {
            if (!callback) {
                continue;
            }

            // TODO menu will take care of this instead
            if (ret.length) {
                ret.push(makeMenuSpacerEntry());
            }

            const blocks = callback(schema);
            for (const block of blocks) {
                const entries = this.convertMenuCommandEntries(
                    block.entries,
                    editorType
                );

                // TODO deep merge after migrating menu
                ret.push(...entries);
            }
        }

        return ret;
    }

    protected extendMarkdown(
        props: MarkdownExtensionProps,
        callback: AlterMarkdownItCallback
    ): void {
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

    private addCodeBlockProcessor(
        lang: string,
        callback: AddCodeBlockProcessorCallback
    ): void {
        if (lang in this._codeblockProcessors) {
            // TODO too harsh?
            throw new Error(
                `Codeblock processor for language ${lang} already exists`
            );
        }

        this._codeblockProcessors[lang] = callback;
    }

    private convertMenuCommandEntries(
        entries: PluginMenuCommandEntry[],
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
                    entry.svg,
                    entry.label,
                    commandEntry.key,
                    commandEntry.visible,
                    commandEntry.active,
                    ...commandEntry.children
                );
            } else {
                commandEntry.dom = makeMenuIcon(
                    entry.svg,
                    entry.label,
                    commandEntry.key,
                    []
                );
            }

            // TODO add keybind and update the dom label properly
            ret.push(commandEntry);
        }

        return ret;
    }
}
