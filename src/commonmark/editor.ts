import { history } from "prosemirror-history";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { IExternalPluginProvider } from "../shared/editor-plugin";
import { CodeBlockHighlightPlugin } from "../shared/highlighting/highlight-plugin";
import { log } from "../shared/logger";
import { createMenuPlugin } from "../shared/menu";
import { createPreviewPlugin } from "./plugins/preview";
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

export type CommonmarkOptions = CommonViewOptions;

export class CommonmarkEditor extends BaseView {
    private options: CommonmarkOptions;
    private externalPluginProvider: IExternalPluginProvider;

    constructor(
        target: Node,
        content: string,
        pluginProvider: IExternalPluginProvider,
        options: CommonmarkOptions = {}
    ) {
        super();
        this.options = deepMerge(CommonmarkEditor.defaultOptions, options);
        this.externalPluginProvider = pluginProvider;

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
                            this.options.previewParentContainer,
                            this.options.markdownRenderer
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
            previewParentContainer: null,
            markdownRenderer: null,
        };
    }

    parseContent(content: string): ProseMirrorNode {
        return CodeStringParser.fromSchema(commonmarkSchema).parseCode(content);
    }

    serializeContent(): string {
        return CodeStringParser.toString(this.editorView.state.doc);
    }
}
