import { MarkdownSerializer } from "prosemirror-markdown";
import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Transform } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import { stackOverflowMarkdownSerializer } from "../../rich-text/markdown-serializer";
import { error, log } from "../../shared/logger";
import { buildMarkdownParser } from "../../shared/markdown-parser";
import { editableCheck } from "../../shared/prosemirror-plugins/readonly";
import { CodeStringParser } from "../../shared/schema";
import { BaseView } from "../../shared/view";
import { AggregatedEditorPlugin } from "../types";

/*
 * Implements an WYSIWYG-style editor. Content will be rendered immediately by prosemirror but the in- and output will still be markdown
 */
export class RichTextEditor<TOptions> extends BaseView {
    private markdownSerializer: MarkdownSerializer;
    private plugin: AggregatedEditorPlugin<TOptions>;

    constructor(
        target: Element,
        content: string,
        plugin: AggregatedEditorPlugin<TOptions>
    ) {
        super();

        this.plugin = plugin;
        // TODO this.plugin.markdownParser
        this.markdownSerializer = stackOverflowMarkdownSerializer(null);

        const doc = this.parseContent(content);

        this.editorView = new EditorView(
            (node: HTMLElement) => {
                //node.classList.add(...this.options.classList); //TODO
                target.appendChild(node);
            },
            {
                editable: editableCheck,
                state: EditorState.create({
                    doc: doc,
                    plugins: [
                        // history(),
                        // ...allKeymaps(this.options.parserFeatures),
                        // createMenu(this.options),
                        // richTextInputRules(this.options.parserFeatures),
                        // linkPreviewPlugin(this.options.linkPreviewProviders),
                        // CodeBlockHighlightPlugin(
                        //     this.options.codeblockOverrideLanguage
                        // ),
                        // linkTooltipPlugin(this.options.parserFeatures),
                        // richTextImageUpload(
                        //     this.options.imageUpload,
                        //     this.options.pluginParentContainer
                        // ),
                        // readonlyPlugin(),
                        // spoilerToggle,
                        // tables,
                        // codePasteHandler,
                        // linkPasteHandler(this.options.parserFeatures),
                        // ...this.externalPlugins.plugins,
                        ...this.plugin.richText.plugins,
                    ],
                }),
                nodeViews: {
                    // code_block(node: ProseMirrorNode) {
                    //     return new CodeBlockView(node);
                    // },
                    // image(
                    //     node: ProseMirrorNode,
                    //     view: EditorView,
                    //     getPos: () => number
                    // ) {
                    //     return new ImageView(node, view, getPos);
                    // },
                    // tagLink(node: ProseMirrorNode) {
                    //     return new TagLink(node, tagLinkOptions);
                    // },
                    // html_block: function (node: ProseMirrorNode) {
                    //     return new HtmlBlock(node);
                    // },
                    // html_block_container: function (node: ProseMirrorNode) {
                    //     return new HtmlBlockContainer(node);
                    // },
                    ...plugin.richText.nodeViews,
                },
            }
        );

        log(
            "prosemirror rich-text document",
            this.editorView.state.doc.toJSON().content
        );
    }

    parseContent(content: string): Node {
        const markdownParser = buildMarkdownParser(
            null, // TODO this.plugin.markdownParser
            this.plugin.schema,
            null
        );

        let doc: Node;

        try {
            doc = markdownParser.parse(content);
        } catch (e) {
            // there was a catastrophic error! Try not to lose the user's doc...
            error(
                "RichTextEditorConstructor markdownParser.parse",
                "Catastrophic parse error!",
                e
            );

            doc = CodeStringParser.fromSchema(this.plugin.schema).parseCode(
                content
            );

            // manually add an h1 warning to the newly parsed doc
            const tr = new Transform(doc).insert(
                0,
                this.plugin.schema.node(
                    "heading",
                    { level: 1 },
                    this.plugin.schema.text(
                        "WARNING! There was an error parsing the document"
                    )
                )
            );

            doc = tr.doc;
        }

        return doc;
    }

    serializeContent(): string {
        return this.markdownSerializer.serialize(this.editorView.state.doc);
    }
}
