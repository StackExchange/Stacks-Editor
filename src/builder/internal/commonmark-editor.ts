import { Node } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { log } from "../../shared/logger";
import { editableCheck } from "../../plugins/base/readonly";
import { CodeStringParser, commonmarkSchema } from "../../shared/schema";
import { BaseView } from "../../shared/view";
import { AggregatedEditorPlugin, BaseOptions } from "../types";

export class CommonmarkEditor<TOptions extends BaseOptions> extends BaseView {
    constructor(
        target: Element,
        content: string,
        options: TOptions,
        plugin: AggregatedEditorPlugin<TOptions>,
        menuPlugin: Plugin
    ) {
        super();

        this.editorView = new EditorView(
            (node: HTMLElement) => {
                node.classList.add(...options.classList);
                target.appendChild(node);
            },
            {
                editable: editableCheck,
                state: EditorState.create({
                    doc: this.parseContent(content),
                    plugins: [
                        menuPlugin,
                        ...plugin.commonmark(options).plugins,
                    ],
                }),
            }
        );

        log(
            "prosemirror commonmark document",
            this.editorView.state.doc.toJSON()
        );
    }

    parseContent(content: string): Node {
        return CodeStringParser.fromSchema(commonmarkSchema).parseCode(content);
    }

    serializeContent(): string {
        return CodeStringParser.toString(this.editorView.state.doc);
    }
}
