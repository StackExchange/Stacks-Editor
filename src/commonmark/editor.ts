import { baseKeymap } from "prosemirror-commands";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { CodeBlockHighlightPlugin } from "../shared/highlighting/highlight-plugin";
import { log } from "../shared/logger";
import {
    buildMarkdownParser,
    SOMarkdownParser,
} from "../shared/markdown-parser";
import {
    commonmarkImageUpload,
    defaultImageUploadHandler,
} from "../shared/prosemirror-plugins/image-upload";
import {
    editableCheck,
    readonlyPlugin,
} from "../shared/prosemirror-plugins/readonly";
import {
    CodeStringParser,
    commonmarkSchema,
    richTextSchema,
} from "../shared/schema";
import { deepMerge } from "../shared/utils";
import {
    BaseView,
    CommonViewOptions,
    defaultParserFeatures,
} from "../shared/view";
import { createMenu } from "./commands";
import { commonmarkKeymap } from "./key-bindings";

export type CommonmarkOptions = CommonViewOptions;

export class CommonmarkEditor extends BaseView {
    private options: CommonmarkOptions;
    private markdownRenderer: SOMarkdownParser;

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
                        commonmarkKeymap,
                        keymap(baseKeymap),
                        createMenu(this.options),
                        CodeBlockHighlightPlugin(null),
                        commonmarkImageUpload(
                            this.options.imageUpload,
                            this.options.pluginParentContainer
                        ),
                        readonlyPlugin(),
                    ],
                }),
            }
        );

        if (options.previewTarget) {
            this.setupPreviewPane(options.previewTarget);
        }

        log(
            "prosemirror commonmark document",
            this.editorView.state.doc.toJSON()
        );
    }

    setupPreviewPane(target: HTMLElement): void {
        const renderDelayMs = 500; // tweak this to make rendering more or less immediate

        this.options.previewTarget.classList.remove("d-none");

        this.markdownRenderer = buildMarkdownParser(
            this.options.parserFeatures,
            richTextSchema,
            null
        );

        const syncPreview = (): void => {
            target.innerHTML = this.markdownRenderer.tokenizer.render(
                this.content
            );
        };

        const debouncedSync = debounce(syncPreview, renderDelayMs);

        this.editorView.props.handleKeyDown = (view: EditorView) => {
            debouncedSync();
            return false;
        };

        syncPreview();
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

    destroy(): void {
        super.destroy();
        this.options.previewTarget?.classList.add("d-none");
    }

    parseContent(content: string): ProseMirrorNode {
        return CodeStringParser.fromSchema(commonmarkSchema).parseCode(content);
    }

    serializeContent(): string {
        return CodeStringParser.toString(this.editorView.state.doc);
    }
}

function debounce(fn: Function, ms = 300) {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
}
