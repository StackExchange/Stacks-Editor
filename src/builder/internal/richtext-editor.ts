import { MarkdownSerializer } from "prosemirror-markdown";
import { Node } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { Transform } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import { stackOverflowMarkdownSerializer_new } from "../../rich-text/markdown-serializer";
import { error, log } from "../../shared/logger";
import { buildMarkdownParser_new } from "../../shared/markdown-parser";
import { editableCheck } from "../../shared/prosemirror-plugins/readonly";
import { CodeStringParser } from "../../shared/schema";
import { BaseView } from "../../shared/view";
import { AggregatedEditorPlugin, BaseOptions } from "../types";

/*
 * Implements an WYSIWYG-style editor. Content will be rendered immediately by prosemirror but the in- and output will still be markdown
 */
export class RichTextEditor<TOptions extends BaseOptions> extends BaseView {
    private markdownSerializer: MarkdownSerializer;
    private options: TOptions;
    private plugin: AggregatedEditorPlugin<TOptions>;

    constructor(
        target: Element,
        content: string,
        options: TOptions,
        plugin: AggregatedEditorPlugin<TOptions>,
        menuPlugin: Plugin
    ) {
        super();

        this.plugin = plugin;
        this.options = options;
        this.markdownSerializer = stackOverflowMarkdownSerializer_new(plugin);

        const doc = this.parseContent(content);
        const richTextSettings = plugin.richText(options);

        this.editorView = new EditorView(
            (node: HTMLElement) => {
                node.classList.add(...options.classList);
                target.appendChild(node);
            },
            {
                editable: editableCheck,
                state: EditorState.create({
                    doc: doc,
                    plugins: [menuPlugin, ...richTextSettings.plugins],
                }),
                nodeViews: {
                    ...richTextSettings.nodeViews,
                },
            }
        );

        log(
            "prosemirror rich-text document",
            this.editorView.state.doc.toJSON().content
        );
    }

    parseContent(content: string): Node {
        const markdownParser = buildMarkdownParser_new(
            this.options,
            this.plugin
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
