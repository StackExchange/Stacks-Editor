import { history } from "prosemirror-history";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { IExternalPluginProvider } from "../shared/editor-plugin";
import { log } from "../shared/logger";
import { createMenuPlugin } from "../shared/menu/plugin";
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
import { tripleClickHandler } from "./plugins/triple-click-handler";
import { CodeStringParser } from "../shared/schema";
import { deepMerge } from "../shared/utils";
import {
    BaseView,
    CommonViewOptions,
    defaultParserFeatures,
    EditorType,
} from "../shared/view";
import { allKeymaps } from "./key-bindings";
import { commonmarkSchema } from "./schema";
import { textCopyHandlerPlugin } from "./plugins/text-copy-handler";
import { markdownHighlightPlugin } from "./plugins/markdown-highlight";
import { createMenuEntries } from "../shared/menu";
import { baseViewStatePlugin } from "../shared/prosemirror-plugins/base-view-state";

/**
 * Describes the callback for when an html preview should be rendered
 * @param content The plain text content of the codeblock
 * @param container The element that the content should be rendered into
 */
export type PreviewRenderer = (
    content: string,
    container: HTMLElement
) => Promise<void>;

export interface CommonmarkOptions extends CommonViewOptions {
    /** Settings for showing a static rendered preview of the editor's contents */
    preview?: {
        /** Whether the preview is enabled */
        enabled: boolean;
        /**
         * Custom renderer method to use to render the markdown;
         * This method must handle rendering into the passed container itself
         */
        renderer: (content: string, container: HTMLElement) => Promise<void>;
        /** Whether the preview is shown on editor startup */
        shownByDefault?: boolean;
        /**
         * Function to get the container to place the markdown preview;
         * defaults to returning this editor's target's parentNode
         */
        parentContainer?: (view: EditorView) => Element;
        /** The number of milliseconds to delay rendering between updates */
        renderDelayMs?: number;
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
            createMenuEntries(
                commonmarkSchema,
                this.options,
                EditorType.Commonmark
            ),
            commonmarkSchema
        );

        const menu = createMenuPlugin(
            menuEntries,
            this.options.menuParentContainer,
            EditorType.Commonmark
        );

        this.editorView = new EditorView(
            (node: HTMLElement) => {
                this.setTargetNodeAttributes(node, this.options);
                target.appendChild(node);
            },
            {
                editable: editableCheck,
                state: EditorState.create({
                    doc: this.parseContent(content),
                    plugins: [
                        baseViewStatePlugin(this),
                        history(),
                        ...allKeymaps(this.options.parserFeatures),
                        menu,
                        createPreviewPlugin(this.options.preview),
                        markdownHighlightPlugin(this.options.parserFeatures),
                        interfaceManagerPlugin(
                            this.options.pluginParentContainer
                        ),
                        commonmarkImageUpload(
                            this.options.imageUpload,
                            this.options.parserFeatures.validateLink
                        ),
                        placeholderPlugin(this.options.placeholderText),
                        readonlyPlugin(),
                        tripleClickHandler,
                        textCopyHandlerPlugin,
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
