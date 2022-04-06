import { history } from "prosemirror-history";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { CodeBlockHighlightPlugin } from "../shared/highlighting/highlight-plugin";
import { log } from "../shared/logger";
import {
    commonmarkImageUpload,
    defaultImageUploadHandler,
} from "../shared/prosemirror-plugins/image-upload";
import {
    editableCheck,
    readonlyPlugin,
} from "../shared/prosemirror-plugins/readonly";
import { CodeStringParser, commonmarkSchema } from "../shared/schema";
import { deepMerge } from "../shared/utils";
import {
    BaseView,
    CommonViewOptions,
    defaultParserFeatures,
} from "../shared/view";
import { createMenu } from "./commands";
import { allKeymaps } from "./key-bindings";

export type CommonmarkOptions = CommonViewOptions;

export class CommonmarkEditor extends BaseView {
    private options: CommonmarkOptions;

    constructor(
        target: Node,
        content: string,
        options: CommonmarkOptions = {}
    ) {
        super();
        this.options = deepMerge(CommonmarkEditor.defaultOptions, options);

        this.editorView = new EditorView(
            (node: HTMLElement) => {
                node.classList.add(...this.options.classList);
                target.appendChild(node);
            },
            {
                editable: editableCheck,
                state: EditorState.create({
                    doc: this.parseContent(content),
                    plugins: [
                        history(),
                        ...allKeymaps(this.options.parserFeatures),
                        createMenu(this.options),
                        CodeBlockHighlightPlugin(null),
                        commonmarkImageUpload(
                            this.options.imageUpload,
                            this.options.pluginParentContainer
                        ),
                        readonlyPlugin(),
                        // address https://github.com/StackExchange/Stacks-Editor/issues/27
                        // prosemirror doesn't handle triple-clicks well in markdown mode
                        new Plugin({
                            props: {
                                handleDOMEvents: {
                                    mousedown(view, event) {
                                        const {
                                            selection: { $from, $to },
                                        } = view.state;
                                        return (
                                            $from.sameParent($to) &&
                                            event.detail === 3
                                        );
                                    },
                                },
                            },
                        }),
                    ],
                }),
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
            imageUpload: {
                handler: defaultImageUploadHandler,
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
