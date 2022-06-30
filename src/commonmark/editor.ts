import { history } from "prosemirror-history";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { IExternalPluginProvider } from "../shared/editor-plugin";
import { CodeBlockHighlightPlugin } from "../shared/highlighting/highlight-plugin";
import { log } from "../shared/logger";
import { createMenuPlugin } from "../shared/menu";
import { createPreviewPlugin } from "./plugins/preview";
import { commonmarkCodePasteHandler } from "../shared/prosemirror-plugins/code-paste-handler";
import {
    commonmarkImageUpload,
    defaultImageUploadHandler,
} from "../shared/prosemirror-plugins/image-upload";
import { interfaceManagerPlugin } from "../shared/prosemirror-plugins/interface-manager";
import { placeholderPlugin } from "../shared/prosemirror-plugins/placeholder";
import {
    editableCheck,
    readonlyPlugin,
} from "../shared/prosemirror-plugins/readonly";
import { CodeStringParser } from "../shared/schema";
import { deepMerge } from "../shared/utils";
import {
    BaseView,
    CommonViewOptions,
    defaultParserFeatures,
    EditorType,
} from "../shared/view";
import { createMenuEntries } from "./commands";
import { allKeymaps } from "./key-bindings";
import { commonmarkSchema } from "./schema";
import type MarkdownIt from "markdown-it";

export interface CommonmarkOptions extends CommonViewOptions {
    /** Settings for showing a static rendered preview of the editor's contents */
    preview?: {
        /** Whether the preview is enabled */
        enabled: boolean;
        /**
         * Function to get the container to place the markdown preview;
         * defaults to returning this editor's target's parentNode
         */
        parentContainer?: (view: EditorView) => Element;
        /**
         * Custom renderer instance to use to render the markdown;
         * defaults to the markdown-it instance used by this editor;
         * WARNING: The passed renderer will need to properly sanitize html,
         * WE DO NOT PROVIDE ANY SANITIZATION FOR CUSTOM RENDERERS
         */
        renderer?: MarkdownIt;
    };
}

export class CommonmarkEditor extends BaseView {
    private options: CommonmarkOptions;

    constructor(
        target: Node,
        content: string,
        pluginProvider: IExternalPluginProvider,
        options: CommonmarkOptions = {}
    ) {
        super();
        this.options = deepMerge(CommonmarkEditor.defaultOptions, options);

        const menuEntries = pluginProvider.getFinalizedMenu(
            createMenuEntries(this.options),
            EditorType.Commonmark,
            commonmarkSchema
        );

        const menu = createMenuPlugin(
            menuEntries,
            this.options.menuParentContainer
        );

        this.editorView = new EditorView(
            (node: HTMLElement) => {
                node.classList.add(...(this.options.classList || []));
                target.appendChild(node);
            },
            {
                editable: editableCheck,
                state: EditorState.create({
                    doc: this.parseContent(content),
                    plugins: [
                        history(),
                        ...allKeymaps(this.options.parserFeatures),
                        menu,
                        createPreviewPlugin(
                            this.options.preview,
                            this.options.parserFeatures
                        ),
                        CodeBlockHighlightPlugin(null),
                        interfaceManagerPlugin(
                            this.options.pluginParentContainer
                        ),
                        commonmarkImageUpload(
                            this.options.imageUpload,
                            this.options.parserFeatures.validateLink
                        ),
                        placeholderPlugin(this.options.placeholderText),
                        readonlyPlugin(),
                        commonmarkCodePasteHandler,
                        ...pluginProvider.plugins.commonmark,
                    ],
                }),
                plugins: [],
            }
        );

        log(
            "prosemirror commonmark document",
            this.editorView.state.doc.toJSON()
        );
    }

    static get defaultOptions(): CommonmarkOptions {
        return {
            // set to null to disable by default
            editorHelpLink: null,
            menuParentContainer: null,
            parserFeatures: defaultParserFeatures,
            placeholderText: null,
            imageUpload: {
                handler: defaultImageUploadHandler,
            },
            preview: {
                enabled: false,
                parentContainer: null,
                renderer: null,
            },
        };
    }

    parseContent(content: string): ProseMirrorNode {
        return CodeStringParser.fromSchema(commonmarkSchema).parseCode(content);
    }

    serializeContent(): string {
        return CodeStringParser.toString(this.editorView.state.doc);
    }
}
